const crypto = require("crypto");
const pool = require("../config/db").pool;
const { createNotification } = require("../utils/notificationHelper");

const generateCode = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

const statusLabel = (status) => {
  if (status === "created") return "Tạo đơn";
  if (status === "customer_paid") return "Đang xử lý";
  if (status === "staff_confirmed") return "Hoàn thành";
  if (status === "completed") return "Hoàn thành";
  if (status === "rejected") return "Từ chối";
  if (status === "cancelled") return "Đã hủy";
  return status;
};

const cache = require("../utils/cache");

const enrichBooking = (booking) => {
  const createdAt = new Date(booking.created_at);
  const expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
  
  return {
    ...booking,
    status_label: statusLabel(booking.status),
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    server_time: new Date().toISOString(),
  };
};

const createBooking = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const user_level = req.user.level || 0;
    const {
      qr_id,
      customer_bank_name,
      customer_account_number,
      customer_account_holder,
      customer_bank_qr_image,
      transfer_amount,
    } = req.body;

    if (!qr_id) return res.status(400).json({ message: "Thiếu qr_id" });
    if (!customer_bank_name || !String(customer_bank_name).trim())
      return res.status(400).json({ message: "Vui lòng nhập tên ngân hàng" });
    if (!customer_account_number || !String(customer_account_number).trim())
      return res.status(400).json({ message: "Vui lòng nhập số tài khoản" });
    if (!customer_account_holder || !String(customer_account_holder).trim())
      return res.status(400).json({ message: "Vui lòng nhập tên chính chủ" });

    const transferAmountNumber = toNumber(transfer_amount);
    if (!Number.isFinite(transferAmountNumber) || transferAmountNumber <= 0) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập số tiền khách chuyển hợp lệ" });
    }

    if (transferAmountNumber < 500000) {
      return res.status(400).json({ message: "Số tiền tối thiểu cho mỗi đơn hàng là 500.000 VNĐ" });
    }

    const [qrRows] = await pool.query(
      "SELECT id, status, max_amount_per_trans, fee_rate, fee_rate_l1, fee_rate_l2, fee_rate_l3, base_fee_rate, qr_image, name, creator_id FROM qrs WHERE id = ? LIMIT 1",
      [qr_id]
    );
    if (qrRows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy QR" });
    const qr = qrRows[0];
    if (qr.status !== "ready")
      return res.status(400).json({ message: "QR đang bảo trì" });

    // Lấy thông tin ngân hàng Admin mặc định (tài khoản đầu tiên của admin_system)
    const [adminBanks] = await pool.query(
      "SELECT account_holder, bank_name, account_number, qr_image FROM bank_accounts ba JOIN users u ON u.id = ba.user_id WHERE u.role = 'admin_system' AND ba.is_default = 1 LIMIT 1"
    );    
    let adminBankInfo = {
      name: adminBanks[0]?.bank_name || "Hệ thống",
      number: adminBanks[0]?.account_number || "0000000000",
      holder: adminBanks[0]?.account_holder || "ADMIN",
      qr_image: adminBanks[0]?.qr_image || null
    };

    const maxAmount = toNumber(qr.max_amount_per_trans);
    if (Number.isFinite(maxAmount) && transferAmountNumber > maxAmount) {
      return res
        .status(400)
        .json({ message: "Số tiền vượt quá hạn mức của thẻ QR" });
    }

    // Xác định phí theo level của user
    let feeRate = toNumber(qr.fee_rate); // Mặc định là fee_rate (cho level 0)
    if (user_level === 1) feeRate = toNumber(qr.fee_rate_l1);
    else if (user_level === 2) feeRate = toNumber(qr.fee_rate_l2);
    else if (user_level === 3) feeRate = toNumber(qr.fee_rate_l3);

    const fee_amount = Number.isFinite(feeRate)
      ? roundMoney((transferAmountNumber * feeRate) / 100)
      : 0;
    const net_amount = roundMoney(transferAmountNumber - fee_amount);

    // Phí gốc (snapshot từ QR)
    const baseFeeRateVal = toNumber(qr.base_fee_rate) || 0;
    const base_fee_amount = roundMoney((transferAmountNumber * baseFeeRateVal) / 100);

    const code = generateCode();

    const [result] = await pool.query(
      `
        INSERT INTO bookings (
          code, qr_id, customer_id, staff_id, 
          customer_bank_name, customer_account_number, customer_account_holder, customer_bank_qr_image,
          admin_bank_name, admin_account_number, admin_account_holder, admin_bank_qr_image,
          transfer_amount, base_fee_rate, base_fee_amount, fee_rate, fee_amount, net_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created')
      `,
      [
        code,
        qr_id,
        customer_id,
        null,
        String(customer_bank_name).trim(),
        String(customer_account_number).trim(),
        String(customer_account_holder).trim(),
        customer_bank_qr_image || null,
        adminBankInfo.name,
        adminBankInfo.number,
        adminBankInfo.holder,
        adminBankInfo.qr_image,
        transferAmountNumber,
        baseFeeRateVal,
        base_fee_amount,
        feeRate,
        fee_amount,
        net_amount,
      ]
    );

    const bookingId = result.insertId;

    // Thông báo cho khách hàng (Gửi không chặn)
    createNotification(
      customer_id,
      "Tạo đơn thành công",
      `Đơn hàng ${code.slice(-6)} đã được tạo thành công. Vui lòng thanh toán để tiếp tục.`,
      "booking_created",
      bookingId
    ).catch(err => console.error("Lỗi gửi thông báo cho khách khi tạo đơn:", err));

    // Thông báo cho TẤT CẢ staff và admin (Gửi không chặn)
    pool.query(
      "SELECT id FROM users WHERE role IN ('staff', 'admin_system', 'accountant')"
    ).then(([allStaff]) => {
      for (const staff of allStaff) {
        createNotification(
          staff.id,
          "Đơn hàng mới",
          `Khách hàng vừa tạo đơn hàng mới ${code.slice(-6)} với số tiền ${Math.round(transferAmountNumber).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} VNĐ.`,
          "booking_created",
          bookingId
        ).catch(err => console.error(`Lỗi gửi thông báo cho staff ${staff.id} khi có đơn mới:`, err));
      }
    }).catch(err => console.error("Lỗi lấy danh sách staff khi tạo đơn:", err));

    const [rows] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [bookingId]
    );
    res.status(201).json({
      message: "Tạo đơn thành công",
      booking: enrichBooking(rows[0]),
      qr: { id: qr.id, qr_image: qr.qr_image },
    });
    cache.del("staff_stats");
  } catch (err) {
    console.error("Lỗi khi tạo booking:", err);
    res.status(500).json({ message: "Lỗi server khi tạo đơn" });
  }
};

const submitCustomerPaid = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const customer_id = req.user.id;
    const note = req.body?.note ?? null;

    const files = req.files?.proof || [];
    if (files.length === 0)
      return res
        .status(400)
        .json({ message: "Vui lòng tải ít nhất một ảnh bill/chứng từ" });

    const proofUrls = files.map(file => file.path);
    const mainProofUrl = proofUrls[0];
    const proofUrlsJson = JSON.stringify(proofUrls);

    // Xử lý ảnh CCCD (tuỳ chọn)
    const idCardFiles = req.files?.id_card || [];
    const idCardUrlsJson = idCardFiles.length > 0 ? JSON.stringify(idCardFiles.map(f => f.path)) : null;

    const [existingRows] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [bookingId]
    );
    if (existingRows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy đơn" });
    const booking = existingRows[0];

    if (Number(booking.customer_id) !== Number(customer_id)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền cập nhật đơn này" });
    }
    if (booking.status !== "created") {
      return res
        .status(400)
        .json({ message: "Đơn không ở trạng thái cho phép cập nhật" });
    }

    await pool.query(
      `
        UPDATE bookings
        SET customer_paid_proof_url = ?, customer_paid_proof_urls = ?, customer_id_card_urls = ?, customer_paid_note = ?, status = 'customer_paid', accountant_status = 'pending', paid_at = NOW()
        WHERE id = ?
      `,
      [mainProofUrl, proofUrlsJson, idCardUrlsJson, note ? String(note).trim() : null, bookingId]
    );

    // Thông báo cho staff khi khách tải bill (Gửi không chặn để tránh timeout 502)
    if (booking.staff_id) {
      createNotification(
        booking.staff_id,
        "Khách đã chuyển tiền",
        `Đơn hàng ${booking.code.slice(-6)} đã được khách xác nhận chuyển tiền. Vui lòng kiểm tra bill.`,
        "customer_paid",
        bookingId
      ).catch(err => console.error("Lỗi gửi thông báo cho staff:", err));
    } else {
      // Nếu đơn chưa có ai nhận, thông báo cho TẤT CẢ staff và admin
      pool.query(
        "SELECT id FROM users WHERE role IN ('staff', 'admin_system', 'accountant')"
      ).then(([allStaff]) => {
        for (const staff of allStaff) {
          createNotification(
            staff.id,
            "Khách đã chuyển tiền",
            `Đơn hàng ${booking.code.slice(-6)} đã được khách xác nhận chuyển tiền. Vui lòng kiểm tra và nhận đơn.`,
            "customer_paid",
            bookingId
          ).catch(err => console.error(`Lỗi gửi thông báo cho staff ${staff.id}:`, err));
        }
      }).catch(err => console.error("Lỗi lấy danh sách staff để gửi thông báo:", err));
    }

    const [rows] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [bookingId]
    );
    res.json({
      message: "Đã ghi nhận khách đã chuyển tiền",
      booking: enrichBooking(rows[0]),
    });
  } catch (err) {
    console.error("Lỗi khi submit bill:", err);
    res.status(500).json({ message: "Lỗi server khi cập nhật thanh toán" });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status, dateRange = "all", qrName = "" } = req.query;
    const offset = (page - 1) * limit;
    const requestedCustomerId = Number(req.query.customer_id);
    let customer_id = req.user.id;

    if (Number.isFinite(requestedCustomerId) && requestedCustomerId > 0) {
      const canViewOtherCustomer =
        req.user.role === "staff" ||
        req.user.role === "admin_system" ||
        req.user.role === "accountant";

      if (!canViewOtherCustomer && Number(req.user.id) !== requestedCustomerId) {
        return res.status(403).json({ message: "Bạn không có quyền xem đơn của khách hàng này" });
      }

      customer_id = requestedCustomerId;
    }

    let baseWhereSql = "WHERE b.customer_id = ?";
    const baseParams = [customer_id];

    if (search) {
      baseWhereSql += " AND (b.code LIKE ?)";
      baseParams.push(`%${search}%`);
    }

    if (qrName) {
      baseWhereSql += " AND q.name LIKE ?";
      baseParams.push(`%${qrName}%`);
    }

    if (dateRange !== "all") {
      if (dateRange === "today") {
        baseWhereSql += " AND DATE(CONVERT_TZ(b.created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
      } else if (dateRange === "7days") {
        baseWhereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
      } else if (dateRange === "30days") {
        baseWhereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      }
    }

    let listWhereSql = baseWhereSql;
    const listParams = [...baseParams];

    if (status && status !== "all") {
      listWhereSql += " AND b.status = ?";
      listParams.push(status);
    }

    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN b.status = 'created' THEN 1 END) as created_count,
        COUNT(CASE WHEN b.status = 'customer_paid' THEN 1 END) as customer_paid_count,
        COUNT(CASE WHEN b.status IN ('staff_confirmed', 'completed', 'accountant_paid') THEN 1 END) as completed_count,
        COUNT(CASE WHEN b.status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_count,
        SUM(CASE WHEN b.status IN ('staff_confirmed', 'completed', 'accountant_paid') THEN b.transfer_amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN b.status IN ('staff_confirmed', 'completed', 'accountant_paid') THEN b.fee_amount ELSE 0 END) as total_fee
      FROM bookings b
      JOIN qrs q ON q.id = b.qr_id
      ${baseWhereSql}
      `,
      baseParams
    );

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) as total FROM bookings b JOIN qrs q ON q.id = b.qr_id ${listWhereSql}`,
      listParams
    );
    const total = totalRows[0].total;

    const queryParams = [...listParams, parseInt(limit), parseInt(offset)];
    const [rows] = await pool.query(
      `
        SELECT b.*, q.name as qr_name, q.main_image as qr_main_image, q.qr_image
        FROM bookings b
        JOIN qrs q ON q.id = b.qr_id
        ${listWhereSql}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `,
      queryParams
    );

    const enrichedRows = rows.map(b => {
      const enriched = enrichBooking(b);
      // Parse JSON customer proof urls
      if (b.customer_paid_proof_urls) {
        if (typeof b.customer_paid_proof_urls === 'string') {
          try {
            enriched.proof_urls = JSON.parse(b.customer_paid_proof_urls);
          } catch (e) {
            enriched.proof_urls = b.customer_paid_proof_url ? [b.customer_paid_proof_url] : [];
          }
        } else if (Array.isArray(b.customer_paid_proof_urls)) {
          enriched.proof_urls = b.customer_paid_proof_urls;
        } else {
          enriched.proof_urls = b.customer_paid_proof_url ? [b.customer_paid_proof_url] : [];
        }
      } else {
        enriched.proof_urls = b.customer_paid_proof_url ? [b.customer_paid_proof_url] : [];
      }

      // Parse JSON staff proof urls
      if (b.staff_paid_proof_urls) {
        if (typeof b.staff_paid_proof_urls === 'string') {
          try {
            enriched.staff_proof_urls = JSON.parse(b.staff_paid_proof_urls);
          } catch (e) {
            enriched.staff_proof_urls = [];
          }
        } else if (Array.isArray(b.staff_paid_proof_urls)) {
          enriched.staff_proof_urls = b.staff_paid_proof_urls;
        } else {
          enriched.staff_proof_urls = [];
        }
      } else {
        enriched.staff_proof_urls = [];
      }
      return enriched;
    });

    res.json({
      stats: stats[0],
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      bookings: enrichedRows
    });
  } catch (err) {
    console.error("Lỗi khi lấy my bookings:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const getMyBookingDetail = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const bookingId = req.params.id;

    const [rows] = await pool.query(
      `
        SELECT b.*, q.name as qr_name, q.main_image as qr_main_image, q.qr_image,
               s.full_name as staff_name
        FROM bookings b
        JOIN qrs q ON q.id = b.qr_id
        LEFT JOIN users s ON s.id = b.staff_id
        WHERE b.id = ? AND b.customer_id = ?
        LIMIT 1
      `,
      [bookingId, customer_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn của bạn" });
    }

    const booking = rows[0];

    // Parse JSON customer proof urls
    if (booking.customer_paid_proof_urls) {
      if (typeof booking.customer_paid_proof_urls === 'string') {
        try {
          booking.proof_urls = JSON.parse(booking.customer_paid_proof_urls);
        } catch (e) {
          booking.proof_urls = booking.customer_paid_proof_url ? [booking.customer_paid_proof_url] : [];
        }
      } else if (Array.isArray(booking.customer_paid_proof_urls)) {
        booking.proof_urls = booking.customer_paid_proof_urls;
      } else {
        booking.proof_urls = booking.customer_paid_proof_url ? [booking.customer_paid_proof_url] : [];
      }
    } else {
      booking.proof_urls = booking.customer_paid_proof_url ? [booking.customer_paid_proof_url] : [];
    }

    // Parse JSON staff proof urls
    if (booking.staff_paid_proof_urls) {
      if (typeof booking.staff_paid_proof_urls === 'string') {
        try {
          booking.staff_proof_urls = JSON.parse(booking.staff_paid_proof_urls);
        } catch (e) {
          booking.staff_proof_urls = [];
        }
      } else if (Array.isArray(booking.staff_paid_proof_urls)) {
        booking.staff_proof_urls = booking.staff_paid_proof_urls;
      } else {
        booking.staff_proof_urls = [];
      }
    } else {
      booking.staff_proof_urls = [];
    }

    // Parse JSON id card urls
    if (booking.customer_id_card_urls) {
      try {
        booking.id_card_urls = typeof booking.customer_id_card_urls === 'string'
          ? JSON.parse(booking.customer_id_card_urls)
          : booking.customer_id_card_urls;
      } catch (e) {
        booking.id_card_urls = [];
      }
    } else {
      booking.id_card_urls = [];
    }

    // Parse JSON accountant proof urls
    if (booking.accountant_paid_proof_urls) {
      try {
        booking.accountant_proof_urls = typeof booking.accountant_paid_proof_urls === 'string'
          ? JSON.parse(booking.accountant_paid_proof_urls)
          : booking.accountant_paid_proof_urls;
      } catch (e) {
        booking.accountant_proof_urls = booking.accountant_paid_proof_url ? [booking.accountant_paid_proof_url] : [];
      }
    } else {
      booking.accountant_proof_urls = booking.accountant_paid_proof_url ? [booking.accountant_paid_proof_url] : [];
    }

    res.json(enrichBooking(booking));
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết đơn của user:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const getStaffStats = async (req, res) => {
  try {
    const { dateRange = "all", search = "", status, processing_status, is_valid, qrName = "" } = req.query;
    
    // Tạo cache key dựa trên tất cả bộ lọc
    const cacheKey = `staff_stats_${dateRange}_${search}_${status}_${processing_status}_${is_valid}_${qrName}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    let whereSql = "WHERE 1=1";
    const params = [];

    if (search) {
      whereSql += " AND (b.code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (qrName) {
      whereSql += " AND q.name LIKE ?";
      params.push(`%${qrName}%`);
    }

    if (status && status !== "all") {
      if (status === "staff_confirmed") {
        whereSql += " AND b.status IN (?, ?, ?)";
        params.push("staff_confirmed", "completed", "accountant_paid");
      } else {
        whereSql += " AND b.status = ?";
        params.push(status);
      }
    }

    if (is_valid && is_valid !== "all") {
      if (is_valid === "yes") whereSql += " AND b.is_valid = 'yes'";
      else if (is_valid === "no") whereSql += " AND b.is_valid = 'no'";
      else if (is_valid === "null") whereSql += " AND b.is_valid IS NULL";
    }

    const accountant_status = req.query.accountant_status;
    if (accountant_status && accountant_status !== "all") {
      if (accountant_status === "null") {
        whereSql += " AND b.accountant_status IS NULL";
      } else {
        whereSql += " AND b.accountant_status = ?";
        params.push(accountant_status);
      }
    }

    if (processing_status && processing_status !== "all") {
      if (processing_status === "unclaimed") {
        whereSql += " AND b.staff_id IS NULL";
      } else if (processing_status === "processing") {
        whereSql += " AND b.staff_id IS NOT NULL AND b.status = 'customer_paid'";
      } else if (processing_status === "processed") {
        whereSql += " AND b.staff_id IS NOT NULL AND b.status IN ('staff_confirmed', 'completed', 'rejected')";
      }
    }

    if (dateRange !== "all") {
      if (dateRange === "today") {
        whereSql += " AND DATE(CONVERT_TZ(b.created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
      } else if (dateRange === "7days") {
        whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
      } else if (dateRange === "30days") {
        whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      }
    }

    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN b.status = 'created' THEN 1 END) as pending_claim,
        COUNT(CASE WHEN b.status = 'customer_paid' THEN 1 END) as processing,
        COUNT(CASE WHEN b.status IN ('staff_confirmed', 'completed', 'accountant_paid') THEN 1 END) as completed,
        COUNT(CASE WHEN b.status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled,
        SUM(CASE WHEN b.status IN ('staff_confirmed', 'completed', 'accountant_paid') THEN b.transfer_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN b.status IN ('staff_confirmed', 'completed', 'accountant_paid') THEN b.fee_amount ELSE 0 END) as total_fee,
        SUM(CASE WHEN b.status IN ('staff_confirmed', 'completed', 'accountant_paid') THEN COALESCE(b.base_fee_amount, 0) ELSE 0 END) as total_base_fee,
        SUM(CASE WHEN b.status IN ('staff_confirmed', 'completed', 'accountant_paid') THEN (b.fee_amount - COALESCE(b.base_fee_amount, 0)) ELSE 0 END) as total_profit
      FROM bookings b
      LEFT JOIN users u ON u.id = b.customer_id
      JOIN qrs q ON q.id = b.qr_id
      ${whereSql}
    `, params);

    const stats = rows[0];
    cache.set(cacheKey, stats, 5000);

    res.json(stats);
  } catch (err) {
    console.error("Lỗi lấy thống kê staff:", err);
    res.status(500).json({ message: "Lỗi lấy thống kê" });
  }
};

const claimBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const staff_id = req.user.id;
    const isAdmin = req.user.role === 'admin_system';

    const [existing] = await pool.query(
      "SELECT status, staff_id FROM bookings WHERE id = ? LIMIT 1",
      [bookingId]
    );

    if (existing.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn" });

    if (!['customer_paid'].includes(existing[0].status)) {
      return res.status(400).json({ message: "Đơn này không ở trạng thái cho phép nhận xử lý" });
    }

    // Admin có thể nhận bất kỳ đơn nào; staff chỉ nhận đơn chưa có người xử lý
    if (!isAdmin && existing[0].staff_id) {
      return res.status(400).json({ message: "Đơn này đã có nhân viên khác nhận xử lý" });
    }

    await pool.query(
      "UPDATE bookings SET staff_id = ? WHERE id = ?",
      [staff_id, bookingId]
    );

    res.json({ message: "Đã nhận xử lý đơn hàng thành công" });
    cache.del("staff_stats");
  } catch (err) {
    console.error("Lỗi nhận xử lý đơn:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const updateBookingValidity = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_valid } = req.body;

    if (!['yes', 'no'].includes(is_valid)) {
      return res.status(400).json({ message: "Giá trị không hợp lệ. Phải là 'yes' hoặc 'no'" });
    }

    const [existingRows] = await pool.query(
      "SELECT id FROM bookings WHERE id = ? LIMIT 1",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    await pool.query(
      "UPDATE bookings SET is_valid = ? WHERE id = ?",
      [is_valid, id]
    );

    // Bấm CÓ → accountant_status = 'pending'
    if (is_valid === 'yes') {
      await pool.query(
        "UPDATE bookings SET accountant_status = 'pending' WHERE id = ? AND accountant_status IS NULL",
        [id]
      );
    }

    // Bấm KHÔNG → accountant_status = 'rejected'
    if (is_valid === 'no') {
      await pool.query(
        "UPDATE bookings SET accountant_status = 'rejected' WHERE id = ? AND accountant_status = 'pending'",
        [id]
      );
    }

    res.json({
      status: 'success',
      message: `Đã xác nhận trạng thái: ${is_valid === 'yes' ? 'CÓ' : 'KHÔNG'}`,
      is_valid
    });
  } catch (err) {
    console.error("Lỗi cập nhật is_valid:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const staffGetBookings = async (req, res) => {
  try {
    const { status, processing_status, is_valid, page = 1, limit = 10, search = "", dateRange = "all", qrName = "" } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let whereSql = "WHERE 1=1";

    if (status && status !== "all") {
      if (status === "staff_confirmed") {
        whereSql += " AND b.status IN (?, ?, ?)";
        params.push("staff_confirmed", "completed", "accountant_paid");
      } else {
        whereSql += " AND b.status = ?";
        params.push(status);
      }
    }

    // Filter theo trạng thái xác nhận (CÓ/KHÔNG)
    if (is_valid && is_valid !== "all") {
      if (is_valid === "yes") {
        whereSql += " AND b.is_valid = 'yes'";
      } else if (is_valid === "no") {
        whereSql += " AND b.is_valid = 'no'";
      } else if (is_valid === "null") {
        whereSql += " AND b.is_valid IS NULL";
      }
    }

    // Filter theo accountant_status
    const accountant_status = req.query.accountant_status;
    if (accountant_status && accountant_status !== "all") {
      if (accountant_status === "null") {
        whereSql += " AND b.accountant_status IS NULL";
      } else {
        whereSql += " AND b.accountant_status = ?";
        params.push(accountant_status);
      }
    }

    // Filter theo trạng thái xử lý của nhân viên
    if (processing_status && processing_status !== "all") {
      if (processing_status === "unclaimed") {
        // Chưa có ai nhận đơn
        whereSql += " AND b.staff_id IS NULL";
      } else if (processing_status === "processing") {
        // Đang xử lý (đã nhận đơn nhưng chưa hoàn thành/từ chối/hủy)
        whereSql += " AND b.staff_id IS NOT NULL AND b.status = 'customer_paid'";
      } else if (processing_status === "processed") {
        // Đã xử lý (đã hoàn thành hoặc đã từ chối)
        whereSql += " AND b.staff_id IS NOT NULL AND b.status IN ('staff_confirmed', 'completed', 'rejected')";
      }
    }

    if (search) {
      whereSql += " AND (b.code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (qrName) {
      whereSql += " AND q.name LIKE ?";
      params.push(`%${qrName}%`);
    }

    if (dateRange !== "all") {
      if (dateRange === "today") {
        whereSql += " AND DATE(CONVERT_TZ(b.created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
      } else if (dateRange === "7days") {
        whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
      } else if (dateRange === "30days") {
        whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      }
    }

    // Lấy tổng số đơn để phân trang
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) as total FROM bookings b JOIN users u ON u.id = b.customer_id JOIN qrs q ON q.id = b.qr_id ${whereSql}`,
      params
    );
    const total = totalRows[0].total;

    // Lấy dữ liệu trang hiện tại
    const queryParams = [...params, parseInt(limit), parseInt(offset)];
    const [rows] = await pool.query(
      `
        SELECT
          b.*,
          q.name as qr_name,
          q.main_image as qr_main_image,
          q.qr_image,
          u.full_name as customer_name,
          u.email as customer_email,
          u.phone as customer_phone,
          s.full_name as staff_name
        FROM bookings b
        JOIN qrs q ON q.id = b.qr_id
        JOIN users u ON u.id = b.customer_id
        LEFT JOIN users s ON s.id = b.staff_id
        ${whereSql}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `,
      queryParams
    );

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      data: rows.map(enrichBooking)
    });
  } catch (err) {
    console.error("Lỗi khi staff lấy bookings:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const staffGetBookingDetail = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const [rows] = await pool.query(
      `
        SELECT
          b.*,
          q.name as qr_name,
          q.main_image as qr_main_image,
          q.qr_image,
          u.full_name as customer_name,
          u.email as customer_email,
          u.phone as customer_phone,
          s.full_name as staff_name
        FROM bookings b
        JOIN qrs q ON q.id = b.qr_id
        JOIN users u ON u.id = b.customer_id
        LEFT JOIN users s ON s.id = b.staff_id
        WHERE b.id = ?
        LIMIT 1
      `,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn" });
    }

    const booking = rows[0];

    // Parse JSON customer proof urls
    if (booking.customer_paid_proof_urls) {
      if (typeof booking.customer_paid_proof_urls === 'string') {
        try {
          booking.proof_urls = JSON.parse(booking.customer_paid_proof_urls);
        } catch (e) {
          booking.proof_urls = booking.customer_paid_proof_url ? [booking.customer_paid_proof_url] : [];
        }
      } else if (Array.isArray(booking.customer_paid_proof_urls)) {
        booking.proof_urls = booking.customer_paid_proof_urls;
      } else {
        booking.proof_urls = booking.customer_paid_proof_url ? [booking.customer_paid_proof_url] : [];
      }
    } else {
      booking.proof_urls = booking.customer_paid_proof_url ? [booking.customer_paid_proof_url] : [];
    }

    // Parse JSON staff proof urls
    if (booking.staff_paid_proof_urls) {
      if (typeof booking.staff_paid_proof_urls === 'string') {
        try {
          booking.staff_proof_urls = JSON.parse(booking.staff_paid_proof_urls);
        } catch (e) {
          booking.staff_proof_urls = [];
        }
      } else if (Array.isArray(booking.staff_paid_proof_urls)) {
        booking.staff_proof_urls = booking.staff_paid_proof_urls;
      } else {
        booking.staff_proof_urls = [];
      }
    } else {
      booking.staff_proof_urls = [];
    }

    // Parse JSON id card urls
    if (booking.customer_id_card_urls) {
      try {
        booking.id_card_urls = typeof booking.customer_id_card_urls === 'string'
          ? JSON.parse(booking.customer_id_card_urls)
          : booking.customer_id_card_urls;
      } catch (e) {
        booking.id_card_urls = [];
      }
    } else {
      booking.id_card_urls = [];
    }

    // Parse JSON accountant proof urls
    if (booking.accountant_paid_proof_urls) {
      try {
        booking.accountant_proof_urls = typeof booking.accountant_paid_proof_urls === 'string'
          ? JSON.parse(booking.accountant_paid_proof_urls)
          : booking.accountant_paid_proof_urls;
      } catch (e) {
        booking.accountant_proof_urls = booking.accountant_paid_proof_url ? [booking.accountant_paid_proof_url] : [];
      }
    } else {
      booking.accountant_proof_urls = booking.accountant_paid_proof_url ? [booking.accountant_paid_proof_url] : [];
    }

    res.json(enrichBooking(booking));
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết booking staff:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const staffConfirmBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const staff_id = req.user.id;
    const isAdmin = req.user.role === 'admin_system';

    const [existingRows] = await pool.query(
      "SELECT status, staff_id, staff_paid_proof_urls FROM bookings WHERE id = ? LIMIT 1",
      [bookingId]
    );
    if (existingRows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy đơn" });

    const booking = existingRows[0];

    // Admin có thể xác nhận bất kỳ đơn nào; staff chỉ xác nhận đơn của mình
    if (!isAdmin) {
      if (!booking.staff_id) {
        return res.status(400).json({ message: "Đơn hàng này chưa có nhân viên nhận xử lý" });
      }
      if (Number(booking.staff_id) !== Number(staff_id)) {
        return res.status(403).json({ message: "Bạn không phải là người đang xử lý đơn hàng này" });
      }
    }

    if (booking.status !== "customer_paid") {
      return res.status(400).json({ message: "Đơn chưa ở trạng thái khách đã chuyển tiền" });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: "Vui lòng tải ít nhất một ảnh bill chuyển tiền" });
    }
    const staffProofUrls = JSON.stringify(files.map(f => f.path));

    await pool.query(
      `UPDATE bookings
       SET status = 'staff_confirmed', staff_id = ?, staff_paid_proof_urls = ?, confirmed_at = NOW()
       WHERE id = ?`,
      [staff_id, staffProofUrls, bookingId]
    );

    const [bookingRow] = await pool.query("SELECT customer_id, code FROM bookings WHERE id = ?", [bookingId]);
    if (bookingRow.length > 0) {
      createNotification(
        bookingRow[0].customer_id,
        "Đơn hàng được xác nhận",
        `Đơn hàng ${bookingRow[0].code.slice(-6)} đã được xác nhận thành công.`,
        "staff_confirmed",
        bookingId
      ).catch(err => console.error("Lỗi gửi thông báo xác nhận đơn cho khách:", err));
    }

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ? LIMIT 1", [bookingId]);
    res.json({ message: "Đã chuyển tiền cho khách", booking: enrichBooking(rows[0]) });
    cache.del("staff_stats");
  } catch (err) {
    console.error("Lỗi staff confirm:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const staffRejectBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const staff_id = req.user.id;
    const isAdmin = req.user.role === 'admin_system';
    const rejectNote = String(req.body?.note || "").trim();

    if (!rejectNote) {
      return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });
    }

    const [existingRows] = await pool.query(
      "SELECT status, staff_id FROM bookings WHERE id = ? LIMIT 1",
      [bookingId]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn" });
    }

    const booking = existingRows[0];

    // Admin có thể từ chối bất kỳ đơn nào; staff chỉ từ chối đơn của mình
    if (!isAdmin) {
      if (!booking.staff_id) {
        return res.status(400).json({ message: "Đơn hàng này chưa có nhân viên nhận xử lý" });
      }
      if (Number(booking.staff_id) !== Number(staff_id)) {
        return res.status(403).json({ message: "Bạn không phải là người đang xử lý đơn hàng này" });
      }
    }

    if (booking.status !== "customer_paid") {
      return res.status(400).json({ message: "Chỉ được từ chối đơn ở trạng thái khách đã chuyển tiền" });
    }

    await pool.query(
      `UPDATE bookings
       SET status = 'rejected', staff_id = ?, reject_note = ?, confirmed_at = NOW()
       WHERE id = ?`,
      [staff_id, rejectNote, bookingId]
    );

    const [bookingRow] = await pool.query("SELECT customer_id, code FROM bookings WHERE id = ?", [bookingId]);
    if (bookingRow.length > 0) {
      createNotification(
        bookingRow[0].customer_id,
        "Đơn hàng bị từ chối",
        `Đơn hàng ${bookingRow[0].code.slice(-6)} đã bị từ chối. Lý do: ${rejectNote}`,
        "rejected",
        bookingId
      ).catch(err => console.error("Lỗi gửi thông báo từ chối đơn cho khách:", err));
    }

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ? LIMIT 1", [bookingId]);
    res.json({ message: "Đã từ chối đơn", booking: enrichBooking(rows[0]) });
    cache.del("staff_stats");
  } catch (err) {
    console.error("Lỗi staff reject:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Kế toán lấy tất cả đơn hàng mà khách đã upload bill (không lọc theo is_valid)
const accountantGetBookings = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10, dateRange = 'all', is_valid } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Lấy tất cả đơn mà khách đã chuyển tiền (đã up bill)
    let whereSql = "WHERE b.status IN ('customer_paid', 'staff_confirmed')";
    const params = [];

    if (status === 'pending') {
      whereSql += " AND b.accountant_status = 'pending'";
    } else if (status === 'paid') {
      whereSql += " AND b.accountant_status = 'paid'";
    } else if (status) {
      // filter theo status cụ thể nếu truyền vào
      whereSql += " AND b.status = ?";
      params.push(status);
    }

    if (search) {
      whereSql += " AND (b.code LIKE ? OR b.admin_account_holder LIKE ? OR u.full_name LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (dateRange !== 'all') {
      if (dateRange === 'today') {
        whereSql += " AND DATE(CONVERT_TZ(b.created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
      } else if (dateRange === '7days') {
        whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
      } else if (dateRange === '30days') {
        whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      }
    }

    if (is_valid && is_valid !== '') {
      if (is_valid === 'yes') whereSql += " AND b.is_valid = 'yes'";
      else if (is_valid === 'no') whereSql += " AND b.is_valid = 'no'";
      else if (is_valid === 'null') whereSql += " AND b.is_valid IS NULL";
    }

    // Đếm tổng số đơn để phân trang và lấy thống kê
    const [statsRows] = await pool.query(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN b.accountant_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN b.accountant_status = 'paid' THEN 1 END) as completed_count,
        SUM(CASE WHEN b.accountant_status = 'paid' THEN (b.transfer_amount - COALESCE(b.base_fee_amount, 0)) ELSE 0 END) as total_amount,
        SUM(CASE WHEN b.accountant_status = 'paid' THEN COALESCE(b.base_fee_amount, 0) ELSE 0 END) as total_base_fee,
        SUM(b.transfer_amount) as total_transfer
      FROM bookings b 
      JOIN users u ON u.id = b.customer_id 
      ${whereSql}
      `,
      params
    );
    const stats = statsRows[0];
    const total = stats.total;

    const [rows] = await pool.query(
      `
        SELECT
          b.*,
          q.name as qr_name,
          u.full_name as customer_name,
          u.email as customer_email,
          s.full_name as staff_name
        FROM bookings b
        JOIN qrs q ON q.id = b.qr_id
        JOIN users u ON u.id = b.customer_id
        LEFT JOIN users s ON s.id = b.staff_id
        ${whereSql}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [...params, parseInt(limit), offset]
    );
    
    res.json({
      total,
      stats,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      data: rows.map(enrichBooking)
    });
  } catch (err) {
    console.error("Lỗi khi accountant lấy bookings:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Kế toán lấy chi tiết đơn hàng
const accountantGetBookingDetail = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const [rows] = await pool.query(
      `
        SELECT
          b.*,
          u.full_name as customer_name,
          u.email as customer_email,
          s.full_name as staff_name,
          q.name as qr_name,
          q.main_image as qr_main_image,
          q.qr_image as qr_image
        FROM bookings b
        JOIN users u ON u.id = b.customer_id
        LEFT JOIN users s ON s.id = b.staff_id
        JOIN qrs q ON q.id = b.qr_id
        WHERE b.id = ?
        LIMIT 1
      `,
      [bookingId]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn hoặc đơn không hợp lệ" });

    const booking = rows[0];

    // Parse JSON id card urls
    if (booking.customer_id_card_urls) {
      try {
        booking.id_card_urls = typeof booking.customer_id_card_urls === 'string'
          ? JSON.parse(booking.customer_id_card_urls)
          : booking.customer_id_card_urls;
      } catch (e) {
        booking.id_card_urls = [];
      }
    } else {
      booking.id_card_urls = [];
    }

    // Parse JSON customer proof urls
    if (booking.customer_paid_proof_urls) {
      try {
        booking.customer_proof_urls = typeof booking.customer_paid_proof_urls === 'string'
          ? JSON.parse(booking.customer_paid_proof_urls)
          : booking.customer_paid_proof_urls;
      } catch (e) {
        booking.customer_proof_urls = booking.customer_paid_proof_url ? [booking.customer_paid_proof_url] : [];
      }
    } else {
      booking.customer_proof_urls = booking.customer_paid_proof_url ? [booking.customer_paid_proof_url] : [];
    }

    // Parse JSON staff proof urls
    if (booking.staff_paid_proof_urls) {
      try {
        booking.staff_proof_urls = typeof booking.staff_paid_proof_urls === 'string'
          ? JSON.parse(booking.staff_paid_proof_urls)
          : booking.staff_paid_proof_urls;
      } catch (e) {
        booking.staff_proof_urls = [];
      }
    } else {
      booking.staff_proof_urls = [];
    }

    // Parse JSON accountant proof urls
    if (booking.accountant_paid_proof_urls) {
      try {
        booking.proof_urls = typeof booking.accountant_paid_proof_urls === 'string'
          ? JSON.parse(booking.accountant_paid_proof_urls)
          : booking.accountant_paid_proof_urls;
      } catch (e) {
        booking.proof_urls = booking.accountant_paid_proof_url ? [booking.accountant_paid_proof_url] : [];
      }
    } else {
      booking.proof_urls = booking.accountant_paid_proof_url ? [booking.accountant_paid_proof_url] : [];
    }

    res.json(enrichBooking(booking));
  } catch (err) {
    console.error("Lỗi khi accountant lấy detail:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Kế toán xác nhận đã chuyển tiền và up bill
const accountantConfirmPaid = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const files = req.files || [];
    
    if (files.length === 0) {
      return res.status(400).json({ message: "Vui lòng tải ít nhất một ảnh bill chuyển tiền" });
    }

    const proofUrls = files.map(file => file.path);
    const mainProofUrl = proofUrls[0];
    const proofUrlsJson = JSON.stringify(proofUrls);

    const [existing] = await pool.query("SELECT * FROM bookings WHERE id = ?", [bookingId]);
    if (existing.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn" });
    
    if (existing[0].accountant_status !== 'pending' && existing[0].is_valid !== 'yes') {
      return res.status(400).json({ message: "Đơn này chưa ở trạng thái chờ kế toán thanh toán" });
    }

    await pool.query(
      `UPDATE bookings 
       SET accountant_status = 'paid', 
           accountant_paid_proof_url = ?, 
           accountant_paid_proof_urls = ?,
           accountant_paid_at = NOW() 
       WHERE id = ?`,
      [mainProofUrl, proofUrlsJson, bookingId]
    );

    // Thông báo cho khách hàng (Gửi không chặn)
    createNotification(
      existing[0].customer_id,
      "Tiền đã được chuyển",
      `Đơn hàng ${existing[0].code.slice(-6)} đã được kế toán chuyển tiền thành công. Vui lòng kiểm tra tài khoản.`,
      "accountant_paid",
      bookingId
    ).catch(err => console.error("Lỗi gửi thông báo accountant paid cho khách:", err));

    res.json({ success: true, message: "Xác nhận chuyển tiền thành công" });
  } catch (err) {
    console.error("Lỗi accountant confirm:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  createBooking,
  submitCustomerPaid,
  getMyBookings,
  getMyBookingDetail,
  staffGetBookings,
  getStaffStats,
  claimBooking,
  updateBookingValidity,
  staffGetBookingDetail,
  staffConfirmBooking,
  staffRejectBooking,
  accountantGetBookings,
  accountantGetBookingDetail,
  accountantConfirmPaid,
};
