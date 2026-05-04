const pool = require('../config/db').pool;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cấu hình cookie options
const cookieOptions = {
  httpOnly: true, // Chỉ server mới đọc được, chống XSS
  secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS khi production
  sameSite: 'lax', // Chống CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
};

// Cấu hình Mail Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Kiểm tra cấu hình email ngay khi khởi động
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('CẢNH BÁO: EMAIL_USER hoặc EMAIL_PASS chưa được cấu hình trong .env. Tính năng gửi mail sẽ không hoạt động.');
}

// Helper tạo token và gửi cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  );

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      message: 'Thành công',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
};

const register = async (req, res) => {
  const { email, password, full_name } = req.body;
  try {
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) return res.status(400).json({ message: 'Email đã tồn tại' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo mã xác nhận
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'INSERT INTO users (email, password, full_name, role, level, is_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, full_name, 'user', 3, 0, verificationToken]
    );

    // Gửi email xác nhận
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;

    const mailOptions = {
      from: `"Hệ thống Thẻ Tín Dụng" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Xác nhận đăng ký tài khoản',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5; text-align: center;">Chào mừng bạn đến với hệ thống!</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng nhấn vào nút bên dưới để xác nhận email của bạn:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Xác nhận Email</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">© 2024 Hệ thống Thẻ Tín Dụng. All rights reserved.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const verifyEmail = async (req, res) => {
  const token = req.params.token ? req.params.token.trim() : '';
  console.log('--- Bắt đầu xác thực email ---');
  console.log('Token nhận được từ URL:', token);
  console.log('Độ dài token:', token.length);

  try {
    // Tìm user có token này và chưa được xác thực
    const [users] = await pool.query(
      'SELECT id, email, is_verified FROM users WHERE verification_token = ?', 
      [token]
    );
    
    if (users.length === 0) {
      console.log('KẾT QUẢ: Không tìm thấy user với token này trong Database.');
      
      // Kiểm tra xem có phải user đã xác thực rồi không
      const [verifiedUsers] = await pool.query(
        'SELECT id, email FROM users WHERE is_verified = 1 AND verification_token IS NULL LIMIT 1'
      );
      
      if (verifiedUsers.length > 0) {
        console.log('GỢI Ý: Có thể tài khoản đã được xác thực trước đó.');
      }

      return res.status(400).json({ 
        message: 'Mã xác nhận không hợp lệ, đã hết hạn hoặc tài khoản đã được xác thực.' 
      });
    }

    const user = users[0];
    console.log('KẾT QUẢ: Tìm thấy user:', user.email);

    if (user.is_verified) {
      console.log('KẾT QUẢ: User đã xác thực từ trước.');
      return res.json({ message: 'Tài khoản của bạn đã được xác nhận từ trước. Bạn có thể đăng nhập.' });
    }

    // Cập nhật trạng thái
    const [updateResult] = await pool.query(
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
      [user.id]
    );

    console.log('KẾT QUẢ: Cập nhật thành công. Số dòng ảnh hưởng:', updateResult.affectedRows);
    console.log('--- Kết thúc xác thực thành công ---');
    
    res.json({ message: 'Xác nhận email thành công! Bạn có thể đăng nhập ngay bây giờ.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    const user = users[0];
    if (!user.password) return res.status(400).json({ message: 'Tài khoản này dùng Google Login' });

    if (user.status === 'locked') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
    }

    if (!user.is_verified) {
      return res.status(401).json({ message: 'Tài khoản chưa được xác nhận. Vui lòng kiểm tra email của bạn.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const googleLogin = async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name } = ticket.getPayload();

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    let user;

    if (users.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO users (email, full_name, password, role, level, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [email, name, null, 'user', 3, 1] // Mặc định role là 'user' và level 3 khi đăng ký qua Google
      );
      user = { id: result.insertId, email, full_name: name, role: 'user' };
    } else {
      user = users[0];
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Xác thực Google thất bại' });
  }
};

const logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ message: 'Đã đăng xuất' });
};

const getMe = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, email, full_name, phone, role, level, status, is_verified, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json({ user: users[0] });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ message: 'Email không tồn tại' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 giờ

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [token, expires, email]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    
    // Gửi email khôi phục mật khẩu
    const mailOptions = {
      from: `"Credify.vn" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Khôi phục mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5; text-align: center;">Khôi phục mật khẩu</h2>
          <p>Chào bạn,</p>
          <p>Bạn nhận được email này vì chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn tại Credify.vn. Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">Link này sẽ hết hạn sau 1 giờ. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">© 2024 Credify.vn. All rights reserved.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Link khôi phục mật khẩu đã được gửi vào email của bạn.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi gửi mail khôi phục mật khẩu' });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) return res.status(400).json({ message: 'Token không hợp lệ' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = ?',
      [hashedPassword, token]
    );

    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const updateProfile = async (req, res) => {
  const { full_name, phone } = req.body;
  const userId = req.user.id;

  try {
    await pool.query(
      'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
      [full_name, phone, userId]
    );

    const [users] = await pool.query(
      'SELECT id, email, full_name, phone, role, level, status, is_verified, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'Cập nhật thông tin thành công',
      user: users[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật profile' });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    // 1. Lấy thông tin user để kiểm tra mật khẩu cũ
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const user = users[0];

    // 2. So sánh mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });

    // 3. Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. Cập nhật mật khẩu mới
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('Lỗi khi đổi mật khẩu:', err);
    res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu' });
  }
};

module.exports = { register, verifyEmail, login, googleLogin, logout, getMe, forgotPassword, resetPassword, updateProfile, changePassword };
