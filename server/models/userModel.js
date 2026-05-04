// Định nghĩa cấu trúc các trường cho bảng users
const userFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  email: 'VARCHAR(255) NOT NULL UNIQUE',
  password: 'VARCHAR(255)', // Password có thể NULL nếu dùng Google Login
  full_name: 'VARCHAR(255)',
  phone: 'VARCHAR(20) NULL', // Số điện thoại (mặc định NULL)
  role: "ENUM('admin_system', 'staff', 'accountant', 'user') DEFAULT 'user'",
  level: 'TINYINT DEFAULT 1', // Cấp độ người dùng (1, 2, 3, 4)
  status: "ENUM('active', 'locked') DEFAULT 'active'",
  is_verified: 'TINYINT(1) DEFAULT 0',
  verification_token: 'VARCHAR(255)',
  reset_token: 'VARCHAR(255)',
  reset_token_expires: 'TIMESTAMP',
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
};

module.exports = userFields;
