const pool = require('../config/db').pool;

// Lấy danh sách tất cả các thẻ (Dành cho Dashboard Staff - Quản lý độc lập)
exports.getDashboardStats = async (req, res) => {
  try {
    const { search, filter } = req.query;
    
    let query = `
      SELECT * FROM credit_cards
      WHERE 1=1
    `;
    
    const params = [];
    if (search) {
      query += ` AND (customer_name LIKE ? OR bank_name LIKE ? OR card_last_4 LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(query, params);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cards = rows.map(row => {
      const rollDate = row.roll_date ? new Date(row.roll_date) : null;
      const dueDate = row.due_date ? new Date(row.due_date) : null;
      
      let daysLeft = '—';
      if (dueDate) {
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate - today;
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const feeVnd = (row.roll_amount * row.fee_percent) / 100;
      const profit = (row.roll_amount * (row.fee_percent - row.bank_fee_percent)) / 100;

      return {
        ...row,
        days_left: daysLeft,
        fee_vnd: feeVnd,
        profit: profit
      };
    });

    // Áp dụng filter
    const filteredCards = cards.filter(card => {
      if (filter === 'due_today') return card.days_left === 0;
      if (filter === 'due_3_days') return card.days_left >= 0 && card.days_left <= 3;
      if (filter === 'overdue') return card.days_left < 0;
      return true;
    });

    res.json({ success: true, data: filteredCards });
  } catch (error) {
    console.error('Get Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// Lấy danh sách khách hàng (Bỏ qua vì không dùng user hệ thống nữa)
exports.getAllUsers = async (req, res) => {
  res.json({ success: true, data: [] });
};

// Thêm thẻ mới
exports.addCard = async (req, res) => {
  try {
    const { 
      customer_name, bank_name, card_last_4, credit_limit, 
      roll_amount, fee_percent, bank_fee_percent, 
      statement_date, due_date, roll_date, status 
    } = req.body;
    
    await pool.query(
      `INSERT INTO credit_cards (
        customer_name, bank_name, card_last_4, credit_limit, 
        roll_amount, fee_percent, bank_fee_percent, 
        statement_date, due_date, roll_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_name, bank_name, card_last_4, credit_limit || 0, 
        roll_amount || 0, fee_percent || 0, bank_fee_percent || 0, 
        statement_date, due_date, roll_date, status || 'An toàn'
      ]
    );

    res.json({ success: true, message: 'Thêm thẻ thành công' });
  } catch (error) {
    console.error('Add Card Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm thẻ' });
  }
};

// Cập nhật thông tin thẻ
exports.updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_name, bank_name, card_last_4, credit_limit, 
      roll_amount, fee_percent, bank_fee_percent, 
      statement_date, due_date, roll_date, status 
    } = req.body;

    await pool.query(
      `UPDATE credit_cards 
       SET customer_name = ?, bank_name = ?, card_last_4 = ?, credit_limit = ?, 
           roll_amount = ?, fee_percent = ?, bank_fee_percent = ?, 
           statement_date = ?, due_date = ?, roll_date = ?, status = ?
       WHERE id = ?`,
      [
        customer_name, bank_name, card_last_4, credit_limit, 
        roll_amount, fee_percent, bank_fee_percent, 
        statement_date, due_date, roll_date, status, id
      ]
    );

    res.json({ success: true, message: 'Cập nhật thẻ thành công' });
  } catch (error) {
    console.error('Update Card Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thẻ' });
  }
};

// Xóa thẻ
exports.deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM credit_cards WHERE id = ?', [id]);
    res.json({ success: true, message: 'Xóa thẻ thành công' });
  } catch (error) {
    console.error('Delete Card Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa thẻ' });
  }
};

// Lấy lịch sử thanh toán của thẻ
exports.getPaymentHistory = async (req, res) => {
  try {
    const { cardId } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM payment_history WHERE card_id = ? ORDER BY payment_date DESC',
      [cardId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử thanh toán' });
  }
};

// Thêm thanh toán mới
exports.addPayment = async (req, res) => {
  try {
    const { card_id, amount, note } = req.body;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Lưu lịch sử
      await connection.query(
        'INSERT INTO payment_history (card_id, amount, note) VALUES (?, ?, ?)',
        [card_id, amount, note]
      );

      // Cập nhật số dư thẻ (giảm nợ)
      await connection.query(
        'UPDATE credit_cards SET current_balance = current_balance - ? WHERE id = ?',
        [amount, card_id]
      );

      await connection.commit();
      res.json({ success: true, message: 'Thanh toán thành công' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi thực hiện thanh toán' });
  }
};
