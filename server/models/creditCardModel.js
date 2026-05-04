// Định nghĩa cấu trúc các trường cho bảng credit_cards
const creditCardFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  user_id: 'INT NOT NULL', // FK tới users
  bank_name: 'VARCHAR(255) NOT NULL',
  card_number: 'VARCHAR(20) NOT NULL',
  credit_limit: 'DECIMAL(15, 2) NOT NULL',
  current_balance: 'DECIMAL(15, 2) DEFAULT 0',
  statement_date: 'INT NOT NULL', // Ngày sao kê (1-31)
  due_date: 'INT NOT NULL', // Hạn thanh toán (1-31)
  minimum_payment: 'DECIMAL(15, 2) DEFAULT 0',
  status: "ENUM('active', 'locked', 'expired') DEFAULT 'active'",
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

module.exports = creditCardFields;
