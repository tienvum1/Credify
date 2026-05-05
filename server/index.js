const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const db = require('./config/db');
const pool = db.pool;
const initDB = db.initDB;
const authRoutes = require('./routes/authRoutes');
const qrRoutes = require('./routes/qrRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const creditCardRoutes = require('./routes/creditCardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bankAccountRoutes = require('./routes/bankAccountRoutes');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Bảo mật Header với Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Giới hạn số lượng request (Rate Limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 1000, // Tăng giới hạn lên 1000 cho dashboard vì có nhiều polling
  message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Tin tưởng proxy (Render/Vercel) để có thể set cookie secure: true
app.set('trust proxy', 1);

// Khởi tạo Database
initDB();

// Tạo thư mục uploads nếu chưa có
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://credify-awqh.vercel.app',
  'https://credify-awqh-tienvum1s-projects.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Cho phép các request không có origin (như mobile apps hoặc curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // Sử dụng cookie-parser
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/qrs', qrRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/credit-cards', creditCardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);

// Tự động hủy đơn hàng sau 30 phút nếu chưa thanh toán
const autoCancelBookings = async () => {
  try {
    const [result] = await pool.query(`
      UPDATE bookings 
      SET status = 'cancelled', reject_note = 'Quá hạn thanh toán' 
      WHERE status = 'created' 
      AND created_at < UTC_TIMESTAMP() - INTERVAL 30 MINUTE
    `);
    if (result.affectedRows > 0) {
      console.log(`[${new Date().toISOString()}] Đã tự động hủy ${result.affectedRows} đơn hàng quá hạn 30 phút.`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Lỗi khi tự động hủy đơn hàng:`, {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
  }
};

// Chạy mỗi 5 phút
setInterval(autoCancelBookings, 5 * 60 * 1000);
// Chạy ngay khi khởi động
autoCancelBookings();

// Kiểm tra kết nối Database Endpoint (Dùng cho UI check - Đã bỏ thông tin nhạy cảm)
app.get('/api/db-check', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    res.json({ 
      status: 'success', 
      message: 'Kết nối Database thành công!'
    });
  } catch (err) {
    console.error('Lỗi kết nối DB:', err);
    res.status(500).json({ 
      status: 'error', 
      message: 'Không thể kết nối Database'
    });
  }
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Chào mừng bạn đến với Express Backend!' });
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
