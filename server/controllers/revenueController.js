const pool = require("../config/db").pool;

const getRevenueStats = async (req, res) => {
  try {
    const staff_id = req.user.id;
    const { type } = req.query;
    
    let dateFormat = '%Y-%m-%d';
    let currentFilter = "DATE(CONVERT_TZ(b.created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
    let periodFilter  = "DATE_FORMAT(CONVERT_TZ(b.created_at, '+00:00', '+07:00'), '%Y-%m') = DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+07:00'), '%Y-%m')";
    
    if (type === 'month') {
      dateFormat    = '%Y-%m';
      currentFilter = "DATE_FORMAT(CONVERT_TZ(b.created_at, '+00:00', '+07:00'), '%Y-%m') = DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+07:00'), '%Y-%m')";
      periodFilter  = "YEAR(CONVERT_TZ(b.created_at, '+00:00', '+07:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
    } else if (type === 'year') {
      dateFormat    = '%Y';
      currentFilter = "YEAR(CONVERT_TZ(b.created_at, '+00:00', '+07:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";
      periodFilter  = "1=1";
    }

    // Helper tính các field tài chính
    const financeFields = (status = `b.status IN ('staff_confirmed', 'completed', 'accountant_paid')`) => `
      SUM(CASE WHEN ${status} THEN b.transfer_amount ELSE 0 END) as total_amount,
      SUM(CASE WHEN ${status} THEN b.fee_amount ELSE 0 END) as total_fee,
      SUM(CASE WHEN ${status} THEN COALESCE(b.base_fee_amount, 0) ELSE 0 END) as total_base_fee,
      SUM(CASE WHEN ${status} THEN (b.fee_amount - COALESCE(b.base_fee_amount, 0)) ELSE 0 END) as total_profit,
      COUNT(*) as total_count,
      SUM(CASE WHEN ${status} THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
      SUM(CASE WHEN b.status IN ('created', 'customer_paid') THEN 1 ELSE 0 END) as processing_count
    `;

    // 0. Summary — kỳ hiện tại
    const getSummary = async (extraWhere = '', params = []) => {
      const [rows] = await pool.query(`
        SELECT 
          SUM(CASE WHEN b.status IN ('staff_confirmed', 'accountant_paid', 'completed') THEN b.transfer_amount ELSE 0 END) as total_amount,
          SUM(CASE WHEN b.status IN ('staff_confirmed', 'accountant_paid', 'completed') THEN b.fee_amount ELSE 0 END) as total_fee,
          SUM(CASE WHEN b.status IN ('staff_confirmed', 'accountant_paid', 'completed') THEN COALESCE(b.base_fee_amount, 0) ELSE 0 END) as total_base_fee,
          SUM(CASE WHEN b.status IN ('staff_confirmed', 'accountant_paid', 'completed') THEN (b.fee_amount - COALESCE(b.base_fee_amount, 0)) ELSE 0 END) as total_profit,
          SUM(CASE WHEN b.status IN ('staff_confirmed', 'accountant_paid', 'completed') THEN 1 ELSE 0 END) as completed_count
        FROM bookings b
        WHERE ${currentFilter}${extraWhere}
      `, params);
      return rows[0] || { total_amount: 0, total_fee: 0, total_base_fee: 0, total_profit: 0, completed_count: 0 };
    };

    const globalSummary   = await getSummary();
    const personalSummary = await getSummary(' AND b.staff_id = ?', [staff_id]);

    // 1. Global — theo thời gian
    const [globalTotal] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(b.created_at, '+00:00', '+07:00'), ?) as label,
        ${financeFields()}
      FROM bookings b
      WHERE ${periodFilter}
      GROUP BY label
      ORDER BY label DESC
    `, [dateFormat]);

    // 2. Global — theo QR
    const [globalByQr] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(b.created_at, '+00:00', '+07:00'), ?) as label,
        b.qr_id,
        q.name as qr_name,
        ${financeFields()}
      FROM bookings b
      JOIN qrs q ON q.id = b.qr_id
      WHERE ${periodFilter}
      GROUP BY label, b.qr_id, q.name
      ORDER BY label DESC, total_amount DESC
    `, [dateFormat]);

    // 3. Global — theo nhân viên
    const [globalByStaff] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(b.created_at, '+00:00', '+07:00'), ?) as label,
        u.id as staff_id,
        u.full_name as staff_name,
        ${financeFields()}
      FROM bookings b
      JOIN users u ON u.id = b.staff_id
      WHERE ${periodFilter}
      GROUP BY label, u.id
      ORDER BY label DESC, total_amount DESC
    `, [dateFormat]);

    // 4. Personal — theo thời gian
    const [personalTotal] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(b.created_at, '+00:00', '+07:00'), ?) as label,
        ${financeFields()}
      FROM bookings b
      WHERE b.staff_id = ? AND ${periodFilter}
      GROUP BY label
      ORDER BY label DESC
    `, [dateFormat, staff_id]);

    // 5. Personal — theo QR
    const [personalByQr] = await pool.query(`
      SELECT 
        DATE_FORMAT(CONVERT_TZ(b.created_at, '+00:00', '+07:00'), ?) as label,
        b.qr_id,
        q.name as qr_name,
        ${financeFields()}
      FROM bookings b
      JOIN qrs q ON q.id = b.qr_id
      WHERE b.staff_id = ? AND ${periodFilter}
      GROUP BY label, b.qr_id, q.name
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
