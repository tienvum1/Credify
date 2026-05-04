const jwt = require('jsonwebtoken');
const pool = require('../config/db').pool;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const protect = async (req, res, next) => {
  // Lấy token từ cookie thay vì Header
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Không có quyền truy cập, vui lòng đăng nhập' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Lấy thông tin mới nhất từ DB để đảm bảo role luôn đúng
    const [users] = await pool.query('SELECT id, email, role FROM users WHERE id = ?', [decoded.id]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Người dùng không tồn tại' });
    }

    req.user = users[0]; // Lưu thông tin user (bao gồm role mới nhất) vào request
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

module.exports = { protect };
