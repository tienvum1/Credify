const pool = require('../config/db').pool;

// Parse DATE từ MySQL (Date object hoặc string) thành local Date
const parseLocalDate = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
  }
  const [y, m, d] = String(dateVal).substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Tính ngày tiếp theo từ một ngày cụ thể (cộng tháng cho đến khi chưa qua)
const nextOccurrence = (dateVal) => {
  if (!dateVal) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = parseLocalDate(dateVal);
  date.setHours(0, 0, 0, 0);
  // Cộng tháng cho đến khi ngày >= hôm nay
  while (date < today) {
    date.setMonth(date.getMonth() + 1);
  }
  return date;
};

// Ngày sao kê: chuyển tháng cùng số lần với ngày đến hạn
const stmtWithDue = (stmtVal, dueVal) => {
  if (!stmtVal) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dueVal);
  const stmt = parseLocalDate(stmtVal);
  if (!due || !stmt) return stmt;
  due.setHours(0, 0, 0, 0);
  stmt.setHours(0, 0, 0, 0);
  // Đếm số tháng cần cộng cho due để >= today
  let months = 0;
  const dueCopy = new Date(due);
  while (dueCopy < today) {
    dueCopy.setMonth(dueCopy.getMonth() + 1);
    months++;
  }
  // Cộng cùng số tháng cho stmt
  stmt.setMonth(stmt.getMonth() + months);
  return stmt;
};

// Tính số ngày còn lại đến ngày đến hạn
const calcDaysLeft = (dueDateStr) => {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = nextOccurrence(dueDateStr);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const calcStatus = (daysLeft) => {
  if (daysLeft === null) return '—';
  if (daysLeft <= 3) return '🔴 Sắp đến hạn';
  if (daysLeft <= 7) return '🟡 Cần theo dõi';
  return '🟢 An toàn';
};

const enrichCard = (row) => {
  const daysLeft = calcDaysLeft(row.due_day);
  const feeVnd = Math.round((row.roll_amount || 0) * (row.fee_percent || 0));
  const profit = Math.round((row.roll_amount || 0) * ((row.fee_percent || 0) - (row.bank_fee_percent || 0)));

  const fmtDate = (d) => d ? d.toLocaleDateString('vi-VN') : null;

  // Parse DATE từ MySQL (Date object hoặc string) thành local date string
  const parseLocalDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
      return dateVal.toLocaleDateString('vi-VN');
    }
    const [y, m, d] = String(dateVal).substring(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('vi-VN');
  };

  return {
    ...row,
    fee_vnd: feeVnd,
    profit,
    days_left: daysLeft,
    status_label: calcStatus(daysLeft),
    // Ngày sao kê: chuyển tháng cùng với ngày đến hạn
    statement_date_full: fmtDate(stmtWithDue(row.statement_day, row.due_day)),
    // Ngày đến hạn: tự chuyển tháng sau nếu đã qua
    due_date_full: fmtDate(nextOccurrence(row.due_day)),
    roll_date_fmt: parseLocalDate(row.roll_date),
  };
};

// GET /credit-cards/dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const { search = '', filter = '', card_type = '' } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (customer_name LIKE ? OR bank_name LIKE ? OR card_last_4 LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (card_type) {
      where += ' AND card_type = ?';
      params.push(card_type);
    }

    const [rows] = await pool.query(
      `SELECT * FROM credit_cards ${where} ORDER BY due_day ASC, id DESC`,
      params
    );

    let cards = rows.map(enrichCard);

    // Filter theo trạng thái
    if (filter === 'due_today')  cards = cards.filter(c => c.days_left === 0);
    if (filter === 'due_3_days') cards = cards.filter(c => c.days_left !== null && c.days_left >= 0 && c.days_left <= 3);
    if (filter === 'overdue')    cards = cards.filter(c => c.days_left !== null && c.days_left < 0);
    if (filter === 'done')       cards = cards.filter(c => c.is_done === 1);
    if (filter === 'pending')    cards = cards.filter(c => c.is_done === 0);

    // Tổng hợp
    const summary = {
      total: cards.length,
      total_roll: cards.reduce((s, c) => s + Number(c.roll_amount || 0), 0),
      total_fee_vnd: cards.reduce((s, c) => s + Number(c.fee_vnd || 0), 0),
      total_profit: cards.reduce((s, c) => s + Number(c.profit || 0), 0),
      danger_count: cards.filter(c => c.days_left !== null && c.days_left <= 3).length,
    };

    res.json({ success: true, data: cards, summary });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// POST /credit-cards/add
exports.addCard = async (req, res) => {
  try {
    const {
      card_type, customer_name, bank_name, card_last_4,
      credit_limit, roll_amount, fee_percent, bank_fee_percent,
      statement_day, due_day, roll_date, note, is_done
    } = req.body;

    if (!customer_name || !bank_name) {
      return res.status(400).json({ success: false, message: 'Thiếu tên khách hoặc ngân hàng' });
    }

    await pool.query(
      `INSERT INTO credit_cards
        (card_type, customer_name, bank_name, card_last_4,
         credit_limit, roll_amount, fee_percent, bank_fee_percent,
         statement_day, due_day, roll_date, note, is_done)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card_type || 'QR',
        customer_name.trim(),
        bank_name.trim(),
        card_last_4 || null,
        credit_limit || 0,
        roll_amount || 0,
        fee_percent || 0,
        bank_fee_percent || 0,
        statement_day || null,
        due_day || null,
        roll_date || null,
        note || null,
        is_done ? 1 : 0,
      ]
    );

    res.json({ success: true, message: 'Thêm thẻ thành công' });
  } catch (err) {
    console.error('addCard error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm thẻ' });
  }
};

// PUT /credit-cards/:id
exports.updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      card_type, customer_name, bank_name, card_last_4,
      credit_limit, roll_amount, fee_percent, bank_fee_percent,
      statement_day, due_day, roll_date, note, is_done
    } = req.body;

    await pool.query(
      `UPDATE credit_cards SET
        card_type = ?, customer_name = ?, bank_name = ?, card_last_4 = ?,
        credit_limit = ?, roll_amount = ?, fee_percent = ?, bank_fee_percent = ?,
        statement_day = ?, due_day = ?, roll_date = ?, note = ?, is_done = ?
       WHERE id = ?`,
      [
        card_type || 'QR',
        customer_name.trim(),
        bank_name.trim(),
        card_last_4 || null,
        credit_limit || 0,
        roll_amount || 0,
        fee_percent || 0,
        bank_fee_percent || 0,
        statement_day || null,
        due_day || null,
        roll_date || null,
        note || null,
        is_done ? 1 : 0,
        id,
      ]
    );

    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('updateCard error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thẻ' });
  }
};

// PATCH /credit-cards/:id/toggle-done
exports.toggleDone = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE credit_cards SET is_done = NOT is_done WHERE id = ?',
      [id]
    );
    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// DELETE /credit-cards/:id
exports.deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM credit_cards WHERE id = ?', [id]);
    res.json({ success: true, message: 'Xóa thẻ thành công' });
  } catch (err) {
    console.error('deleteCard error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa thẻ' });
  }
};
