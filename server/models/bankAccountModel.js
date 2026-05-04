// Định nghĩa cấu trúc các trường cho bảng bank_accounts
const bankAccountFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  user_id: 'INT NOT NULL', // FK tới users
  account_holder: 'VARCHAR(255) NOT NULL', // Họ và tên chủ tài khoản
  bank_name: 'VARCHAR(255) NOT NULL', // Tên ngân hàng
  account_number: 'VARCHAR(50) NOT NULL', // Số tài khoản
  is_default: 'TINYINT(1) DEFAULT 0', // Tài khoản mặc định
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

module.exports = bankAccountFields;
