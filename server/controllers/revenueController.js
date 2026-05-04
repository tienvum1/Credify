const pool = require("../config/db").pool;

const getRevenueStats = async (req, res) => {
  try {
    const staff_id = req.user.id;
    const { type } = req.query; // 'day', 'month', 'year'
    
    let dateFormat = '%Y-%m-%d';
    let currentFilter = "DATE(CONVERT_TZ(created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
    let periodFilter = "DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+07:00'), '%Y-%m') = DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+07:00'), '%Y-%m')";
    
    if (type === 'month') {
      dateFormat = '%Y-%m';
      currentFilter = "DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+07:00'), '%Y-%m') = DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+07:00'), '%Y-%m')";
      periodFilter = "YEAR(CONVERT_TZ(created_at, '+00:00', '+07:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
    } else if (type === 'year') {
      dateFormat = '%Y';
      currentFilter = "YEAR(CONVERT_TZ(created_at, '+00:00', '+07:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
      periodFilter = "1=1";
    }

    // 0. Lấy thống kê cho thẻ Tóm tắt (Chỉ kỳ hiện tại: Hôm nay/Tháng này/Năm nay)
    const getSummary = async (whereClause, params = []) => {
      const [rows] = await pool.query(`
        SELECT 
          SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN transfer_amount ELSE 0 END) as total_amount,
          SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN fee_amount ELSE 0 END) as total_fee,
          SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN 1 ELSE 0 END) as completed_count
        FROM bookings 
        WHERE ${whereClause}
      `, params);
      return rows[0] || { total_amount: 0, total_fee: 0, completed_count: 0 };
    };

    const globalSummary = await getSummary(currentFilter);
    const personalSummary = await getSummary(`${currentFilter} AND staff_id = ?`, [staff_id]);

    // 1. Thống kê chi tiết theo thời gian (Toàn bộ các ngày trong tháng / các tháng trong năm)
    const [globalTotal] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+07:00'), ?) as label,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN transfer_amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN fee_amount ELSE 0 END) as total_fee,
        COUNT(*) as total_count,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status IN ('created', 'customer_paid') THEN 1 ELSE 0 END) as processing_count
      FROM bookings 
      WHERE ${periodFilter}
      GROUP BY label
      ORDER BY label DESC
    `, [dateFormat]);

    const [globalByQr] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+07:00'), ?) as label,
        qr_id,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN transfer_amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN fee_amount ELSE 0 END) as total_fee,
        COUNT(*) as total_count,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status IN ('created', 'customer_paid') THEN 1 ELSE 0 END) as processing_count
      FROM bookings 
      WHERE ${periodFilter}
      GROUP BY label, qr_id
      ORDER BY label DESC, total_amount DESC
    `, [dateFormat]);

    // 1b. Thống kê theo nhân viên (Chỉ cho Admin/Global)
    const [globalByStaff] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(b.created_at, '+00:00', '+07:00'), ?) as label,
        u.id as staff_id,
        u.full_name as staff_name,
        SUM(CASE WHEN b.status IN ('staff_confirmed', 'completed') THEN b.transfer_amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN b.status IN ('staff_confirmed', 'completed') THEN b.fee_amount ELSE 0 END) as total_fee,
        COUNT(*) as total_count,
        SUM(CASE WHEN b.status IN ('staff_confirmed', 'completed') THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN b.status IN ('created', 'customer_paid') THEN 1 ELSE 0 END) as processing_count
      FROM bookings b
      JOIN users u ON u.id = b.staff_id
      WHERE ${periodFilter.replace(/created_at/g, 'b.created_at')}
      GROUP BY label, u.id
      ORDER BY label DESC, total_amount DESC
    `, [dateFormat]);

    // 2. Thống kê cá nhân nhân viên
    const [personalTotal] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+07:00'), ?) as label,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN transfer_amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN fee_amount ELSE 0 END) as total_fee,
        COUNT(*) as total_count,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status IN ('created', 'customer_paid') THEN 1 ELSE 0 END) as processing_count
      FROM bookings 
      WHERE staff_id = ? AND ${periodFilter}
      GROUP BY label
      ORDER BY label DESC
    `, [dateFormat, staff_id]);

    const [personalByQr] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+07:00'), ?) as label,
        qr_id,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN transfer_amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN fee_amount ELSE 0 END) as total_fee,
        COUNT(*) as total_count,
        SUM(CASE WHEN status IN ('staff_confirmed', 'completed') THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status IN ('created', 'customer_paid') THEN 1 ELSE 0 END) as processing_count
      FROM bookings 
      WHERE staff_id = ? AND ${periodFilter}
      GROUP BY label, qr_id
      ORDER BY label DESC, total_amount DESC
    `, [dateFormat, staff_id]);

    res.json({
      global: {
        summary: globalSummary,
        total: globalTotal,
        byQr: globalByQr,
        byStaff: globalByStaff
      },
      personal: {
        summary: personalSummary,
        total: personalTotal,
        byQr: personalByQr
      }
    });
  } catch (err) {
    console.error("Lỗi khi lấy thống kê doanh thu:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getRevenueStats
};
