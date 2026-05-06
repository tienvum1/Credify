const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'railway',
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  // Thêm các cấu hình để tránh ECONNRESET
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 giây
  connectTimeout: 10000,
});

// Lắng nghe lỗi trên pool để tránh crash app khi có lỗi fatal
pool.on('error', (err) => {
  console.error('Lỗi Database Pool:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
    console.log('Đang thử kết nối lại với Database...');
  } else {
    throw err;
  }
});

const initDB = async () => {
  try {
    const connection = await pool.getConnection();
    // Tạo bảng users tối ưu
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(191) NOT NULL UNIQUE,
        password VARCHAR(255),
        full_name VARCHAR(191),
        phone VARCHAR(20) NULL,
        role ENUM('admin_system', 'staff', 'accountant', 'user') DEFAULT 'user',
        level TINYINT DEFAULT 1,
        status ENUM('active', 'locked') DEFAULT 'active',
        is_verified TINYINT(1) DEFAULT 0,
        verification_token CHAR(64) NULL,
        reset_token CHAR(64) NULL,
        reset_token_expires TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_verification (verification_token),
        INDEX idx_reset (reset_token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Kiểm tra và thêm cột status nếu chưa tồn tại (Migration)
    const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'status'");
    if (columns.length === 0) {
      console.log('Đang thêm cột status vào bảng users...');
      await connection.query("ALTER TABLE users ADD COLUMN status ENUM('active', 'locked') DEFAULT 'active' AFTER role");
    }

    // Kiểm tra và thêm cột level nếu chưa tồn tại
    const [levelColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'level'");
    if (levelColumns.length === 0) {
      console.log('Đang thêm cột level vào bảng users...');
      await connection.query("ALTER TABLE users ADD COLUMN level TINYINT DEFAULT 1 AFTER role");
    }

    // Kiểm tra và thêm cột phone nếu chưa tồn tại
    const [phoneColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'phone'");
    if (phoneColumns.length === 0) {
      console.log('Đang thêm cột phone vào bảng users...');
      await connection.query("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER full_name");
    }

    // Kiểm tra và thêm cột main_image, qr_image vào bảng qrs nếu chưa tồn tại
    const [qrMainCols] = await connection.query("SHOW COLUMNS FROM qrs LIKE 'main_image'");
    if (qrMainCols.length === 0) {
      console.log('Đang thêm cột main_image vào bảng qrs...');
      await connection.query("ALTER TABLE qrs ADD COLUMN main_image VARCHAR(255) AFTER id");
    }
    const [qrImageCols] = await connection.query("SHOW COLUMNS FROM qrs LIKE 'qr_image'");
    if (qrImageCols.length === 0) {
      console.log('Đang thêm cột qr_image vào bảng qrs...');
      await connection.query("ALTER TABLE qrs ADD COLUMN qr_image VARCHAR(255) AFTER main_image");
    }

    // Xử lý cột image_url cũ (Xóa hoặc cho phép NULL để tránh lỗi)
    const [oldQrCol] = await connection.query("SHOW COLUMNS FROM qrs LIKE 'image_url'");
    if (oldQrCol.length > 0) {
      console.log('Đang xóa cột image_url cũ trong bảng qrs...');
      await connection.query("ALTER TABLE qrs DROP COLUMN image_url");
    }

    // Tạo bảng credit_cards (Phiên bản quản lý độc lập)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS credit_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        card_last_4 VARCHAR(10) NOT NULL,
        credit_limit DECIMAL(15, 2) DEFAULT 0,
        roll_amount DECIMAL(15, 2) DEFAULT 0,
        fee_percent DECIMAL(5, 2) DEFAULT 0,
        bank_fee_percent DECIMAL(5, 2) DEFAULT 0,
        statement_date DATE NULL,
        due_date DATE NULL,
        roll_date DATE NULL,
        status VARCHAR(50) DEFAULT 'An toàn',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cc_status (status),
        INDEX idx_cc_created (created_at)
      )
    `);

    // Tạo bảng bookings (Tối ưu hóa Index)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        qr_id INT NOT NULL,
        staff_id INT DEFAULT NULL,
        code VARCHAR(50) NOT NULL,
        transfer_amount DECIMAL(15, 2) NOT NULL,
        fee_rate DECIMAL(5, 2) NOT NULL,
        fee_amount DECIMAL(15, 2) NOT NULL,
        net_amount DECIMAL(15, 2) NOT NULL,
        status ENUM('created', 'customer_paid', 'staff_confirmed', 'completed', 'rejected', 'cancelled') DEFAULT 'created',
        customer_paid_proof_urls TEXT,
        customer_paid_note TEXT,
        staff_paid_proof_urls TEXT,
        reject_note TEXT,
        paid_at TIMESTAMP NULL,
        confirmed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (qr_id) REFERENCES qrs(id),
        FOREIGN KEY (staff_id) REFERENCES users(id),
        INDEX idx_booking_status (status),
        INDEX idx_booking_customer (customer_id),
        INDEX idx_booking_created (created_at)
      )
    `);

    // Tạo bảng notifications (thông báo)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        type VARCHAR(50) DEFAULT 'general',
        booking_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        INDEX idx_notifications_user (user_id, created_at)
      )
    `);

    // Tạo bảng payment_history (Bonus)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_id INT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        note TEXT,
        FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE CASCADE,
        INDEX idx_payment_card (card_id)
      )
    `);

    // Tạo bảng bank_accounts
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        account_holder VARCHAR(255) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        is_default TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_bank_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Kiểm tra và thêm cột staff_paid_proof_urls vào bảng bookings
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM bookings');
      const colNames = columns.map(c => c.Field);
      
      if (!colNames.includes('staff_paid_proof_urls')) {
        await connection.query("ALTER TABLE bookings ADD COLUMN staff_paid_proof_urls JSON NULL AFTER customer_paid_note");
        console.log('Đã thêm cột staff_paid_proof_urls vào bảng bookings');
      }
    } catch (err) {
      console.error('Lỗi khi thêm cột staff_paid_proof_urls vào bảng bookings:', err.message);
    }

    // Kiểm tra và thêm cột customer_paid_proof_urls vào bảng bookings
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM bookings');
      const colNames = columns.map(c => c.Field);
      
      if (!colNames.includes('customer_paid_proof_urls')) {
        await connection.query("ALTER TABLE bookings ADD COLUMN customer_paid_proof_urls JSON AFTER customer_paid_proof_url");
      }
    } catch (err) {
      console.error('Lỗi khi thêm cột customer_paid_proof_urls vào bảng bookings:', err.message);
    }

    // Cập nhật bảng qrs: Xóa card_line, fee_rate_l4, và đảm bảo có fee_rate (mặc định), fee_rate_l1, l2, l3
    try {
      const [qrCols] = await connection.query("SHOW COLUMNS FROM qrs");
      const qrColNames = qrCols.map(c => c.Field);
      
      if (qrColNames.includes('card_line')) {
        await connection.query("ALTER TABLE qrs DROP COLUMN card_line");
        console.log("Bảng qrs: Đã xóa cột card_line");
      }
      if (qrColNames.includes('fee_rate_l4')) {
        await connection.query("ALTER TABLE qrs DROP COLUMN fee_rate_l4");
        console.log("Bảng qrs: Đã xóa cột fee_rate_l4");
      }
      if (!qrColNames.includes('fee_rate')) {
        await connection.query("ALTER TABLE qrs ADD COLUMN fee_rate DECIMAL(5,2) DEFAULT 0 AFTER id");
        console.log("Bảng qrs: Đã thêm cột fee_rate");
      }
      if (!qrColNames.includes('fee_rate_l1')) {
        await connection.query("ALTER TABLE qrs ADD COLUMN fee_rate_l1 DECIMAL(5,2) DEFAULT 0 AFTER fee_rate");
      }
      if (!qrColNames.includes('fee_rate_l2')) {
        await connection.query("ALTER TABLE qrs ADD COLUMN fee_rate_l2 DECIMAL(5,2) DEFAULT 0 AFTER fee_rate_l1");
      }
      if (!qrColNames.includes('fee_rate_l3')) {
        await connection.query("ALTER TABLE qrs ADD COLUMN fee_rate_l3 DECIMAL(5,2) DEFAULT 0 AFTER fee_rate_l2");
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật bảng qrs:', err.message);
    }
    
    // Kiểm tra và thêm cột status vào bảng qrs nếu chưa có
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM qrs LIKE "status"');
      if (columns.length === 0) {
        await connection.query("ALTER TABLE qrs ADD COLUMN status ENUM('ready', 'maintenance') DEFAULT 'ready' AFTER card_lines");
        console.log('Đã thêm cột status vào bảng qrs');
      }
    } catch (err) {
      console.error('Lỗi khi thêm cột status vào bảng qrs:', err.message);
    }
    
    // Kiểm tra và thêm cột role nếu chưa có
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE "role"');
      if (columns.length === 0) {
        await connection.query("ALTER TABLE users ADD COLUMN role ENUM('admin_system', 'staff', 'accountant', 'user') DEFAULT 'user' AFTER full_name");
        console.log('Đã thêm cột role vào bảng users');
      }
    } catch (err) {
      console.error('Lỗi khi thêm cột role:', err.message);
    }

    // Kiểm tra và thêm cột reset_token nếu chưa có
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE "reset_token"');
      if (columns.length === 0) {
        await connection.query("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)");
      }
    } catch (err) {}

    // Kiểm tra và thêm cột reset_token_expires nếu chưa có
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE "reset_token_expires"');
      if (columns.length === 0) {
        await connection.query("ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP NULL");
      }
    } catch (err) {}

    // Kiểm tra và thêm cột reject_note nếu chưa có trong bookings
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM bookings LIKE "reject_note"');
      if (columns.length === 0) {
        await connection.query("ALTER TABLE bookings ADD COLUMN reject_note TEXT NULL AFTER customer_paid_note");
      }
    } catch (err) {}

    // Đồng bộ enum status của bookings (bỏ completed)
    try {
      await connection.query("ALTER TABLE bookings MODIFY status ENUM('created', 'customer_paid', 'staff_confirmed', 'rejected', 'cancelled') NOT NULL DEFAULT 'created'");
    } catch (err) {}

    // Bỏ cột completed_at nếu còn tồn tại
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM bookings LIKE "completed_at"');
      if (columns.length > 0) {
        await connection.query('ALTER TABLE bookings DROP COLUMN completed_at');
      }
    } catch (err) {}
    
    // Cập nhật bảng hiện tại nếu password đang là NOT NULL
    try {
      await connection.query('ALTER TABLE users MODIFY password VARCHAR(255) NULL');
    } catch (alterErr) {
      // Bỏ qua nếu cột đã là NULL hoặc có lỗi khác không nghiêm trọng
    }

    // Thêm các cột xác thực nếu chưa có
    try {
      await connection.query('ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0');
    } catch (err) {}
    try {
      await connection.query('ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)');
    } catch (err) {}

    console.log('Bảng users đã sẵn sàng');
    connection.release();
  } catch (err) {
    console.error('Lỗi khởi tạo DB:', err);
  }
};

module.exports = { pool, initDB };
