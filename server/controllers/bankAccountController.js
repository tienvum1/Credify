const pool = require('../config/db').pool;

// Lấy danh sách tài khoản ngân hàng của tôi
exports.getMyBankAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get My Bank Accounts Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách tài khoản' });
  }
};

// Thêm tài khoản ngân hàng mới
exports.addBankAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { account_holder, bank_name, account_number, is_default } = req.body;

    if (!account_holder || !bank_name || !account_number) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Nếu đặt làm mặc định, bỏ mặc định của các tài khoản khác
      if (is_default) {
        await connection.query(
          'UPDATE bank_accounts SET is_default = 0 WHERE user_id = ?',
          [userId]
        );
      }

      // Kiểm tra xem đây có phải tài khoản đầu tiên không, nếu có thì tự động làm mặc định
      const [existing] = await connection.query(
        'SELECT id FROM bank_accounts WHERE user_id = ? LIMIT 1',
        [userId]
      );
      
      const finalIsDefault = (existing.length === 0) ? 1 : (is_default ? 1 : 0);

      await connection.query(
        'INSERT INTO bank_accounts (user_id, account_holder, bank_name, account_number, is_default) VALUES (?, ?, ?, ?, ?)',
        [userId, account_holder, bank_name, account_number, finalIsDefault]
      );

      await connection.commit();
      res.status(201).json({ success: true, message: 'Thêm tài khoản ngân hàng thành công' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Add Bank Account Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thêm tài khoản' });
  }
};

// Cập nhật tài khoản ngân hàng
exports.updateBankAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { account_holder, bank_name, account_number, is_default } = req.body;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Kiểm tra quyền sở hữu
      const [check] = await connection.query(
        'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      if (check.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản hoặc bạn không có quyền' });
      }

      // Nếu đặt làm mặc định, bỏ mặc định của các tài khoản khác
      if (is_default) {
        await connection.query(
          'UPDATE bank_accounts SET is_default = 0 WHERE user_id = ?',
          [userId]
        );
      }

      await connection.query(
        'UPDATE bank_accounts SET account_holder = ?, bank_name = ?, account_number = ?, is_default = ? WHERE id = ?',
        [account_holder, bank_name, account_number, is_default ? 1 : 0, id]
      );

      await connection.commit();
      res.json({ success: true, message: 'Cập nhật tài khoản thành công' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update Bank Account Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật tài khoản' });
  }
};

// Xóa tài khoản ngân hàng
exports.deleteBankAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [check] = await pool.query(
      'SELECT id, is_default FROM bank_accounts WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản hoặc bạn không có quyền' });
    }

    await pool.query('DELETE FROM bank_accounts WHERE id = ?', [id]);

    // Nếu xóa tài khoản mặc định, chọn tài khoản mới nhất làm mặc định (nếu còn)
    if (check[0].is_default) {
      const [remaining] = await pool.query(
        'SELECT id FROM bank_accounts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      if (remaining.length > 0) {
        await pool.query('UPDATE bank_accounts SET is_default = 1 WHERE id = ?', [remaining[0].id]);
      }
    }

    res.json({ success: true, message: 'Xóa tài khoản thành công' });
  } catch (error) {
    console.error('Delete Bank Account Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa tài khoản' });
  }
};
