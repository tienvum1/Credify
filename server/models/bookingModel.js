// Định nghĩa cấu trúc các trường cho bảng bookings
const bookingFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  code: 'VARCHAR(40) NOT NULL UNIQUE', // Mã đơn duy nhất
  qr_id: 'INT NOT NULL', // FK tới qrs
  customer_id: 'INT NOT NULL', // FK tới users (khách tạo đơn)
  staff_id: 'INT NULL', // FK tới users (staff xử lý đơn)

  customer_bank_name: 'VARCHAR(120) NOT NULL', // Tên ngân hàng khách chuyển
  customer_account_number: 'VARCHAR(60) NOT NULL', // Số tài khoản khách chuyển
  customer_account_holder: 'VARCHAR(255) NOT NULL', // Tên chính chủ

  transfer_amount: 'DECIMAL(15, 2) NOT NULL', // Tiền khách chuyển
  fee_rate: 'DECIMAL(5, 2) NOT NULL', // Tỷ lệ phí
  fee_amount: 'DECIMAL(15, 2) NOT NULL', // Tiền phí
  net_amount: 'DECIMAL(15, 2) NOT NULL', // Thực nhận

  customer_paid_proof_url: 'VARCHAR(255) NULL', // Ảnh bill/chứng từ
  customer_paid_note: 'TEXT NULL', // Ghi chú khi upload bill
  reject_note: 'TEXT NULL', // Lý do staff từ chối đơn
  is_valid: "ENUM('yes', 'no') NULL", // Trạng thái Có/Không do staff xác nhận

  admin_bank_name: 'VARCHAR(120) NULL', // Ngân hàng admin lúc tạo đơn
  admin_account_number: 'VARCHAR(60) NULL', // STK admin lúc tạo đơn
  admin_account_holder: 'VARCHAR(255) NULL', // Tên admin lúc tạo đơn
  accountant_paid_proof_url: 'VARCHAR(255) NULL', // Ảnh bill của kế toán
  accountant_paid_at: 'TIMESTAMP NULL', // Thời gian kế toán chuyển tiền
  status: "ENUM('created', 'customer_paid', 'staff_confirmed', 'accountant_paid', 'rejected', 'cancelled') NOT NULL DEFAULT 'created'",

  paid_at: 'TIMESTAMP NULL',
  confirmed_at: 'TIMESTAMP NULL',

  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

module.exports = {
  ...bookingFields
};
