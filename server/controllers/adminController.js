const pool = require('../config/db').pool;
const bcrypt = require('bcryptjs');

// Lấy danh sách tất cả người dùng và thống kê
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    
    // Thống kê số lượng theo vai trò
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as users,
        SUM(CASE WHEN role = 'staff' THEN 1 ELSE 0 END) as staff,
        SUM(CASE WHEN role = 'accountant' THEN 1 ELSE 0 END) as accountants,
        SUM(CASE WHEN role = 'admin_system' THEN 1 ELSE 0 END) as admins
      FROM users
    `);

    let query = 'SELECT id, email, phone, full_name, role, level, status, is_verified, created_at FROM users WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (email LIKE ? OR full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json({ 
      success: true, 
      data: rows,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// Tạo người dùng mới (bởi Admin)
exports.createUser = async (req, res) => {
  try {
    const { email, password, full_name, phone, role, level } = req.body;

    // Kiểm tra email tồn tại
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      'INSERT INTO users (email, password, full_name, phone, role, level, is_verified, status) VALUES (?, ?, ?, ?, ?, ?, 1, "active")',
      [email, hashedPassword, full_name, phone, role || 'user', level !== undefined ? level : 0]
    );

    res.json({ success: true, message: 'Tạo người dùng thành công' });
  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo người dùng' });
  }
};

// Cập nhật người dùng
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, role, level, status, password } = req.body;

    let query = 'UPDATE users SET full_name = ?, phone = ?, role = ?, level = ?, status = ?';
    const params = [full_name, phone, role, level !== undefined ? level : 0, status];

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ success: true, message: 'Cập nhật người dùng thành công' });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật người dùng' });
  }
};

// Khóa/Mở khóa người dùng
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: status === 'locked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản' });
  } catch (error) {
    console.error('Toggle User Status Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thay đổi trạng thái' });
  }
};

// Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Không cho phép xóa chính mình (nếu cần check)
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Bạn không thể xóa chính tài khoản của mình' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa người dùng' });
  }
};
