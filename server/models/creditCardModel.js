// Cấu trúc bảng credit_cards — khớp với bảng quản lý thẻ (xlsx)
const creditCardFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',

  // Phân loại thẻ (theo sheet trong xlsx)
  card_type: "ENUM('QR', 'Máy POS', 'Tôi') NOT NULL DEFAULT 'QR'",

  // Thông tin chủ thẻ
  customer_name: 'VARCHAR(255) NOT NULL',
  bank_name: 'VARCHAR(100) NOT NULL',
  card_last_4: 'VARCHAR(4) NULL',           // 4 số cuối thẻ (có thể để trống)

  // Tài chính
  credit_limit: 'DECIMAL(15,2) NOT NULL DEFAULT 0',    // Hạn mức
  roll_amount: 'DECIMAL(15,2) NOT NULL DEFAULT 0',     // Số tiền đáo
  fee_percent: 'DECIMAL(6,4) NOT NULL DEFAULT 0',      // Phí % thu khách (VD: 0.02 = 2%)
  bank_fee_percent: 'DECIMAL(6,4) NOT NULL DEFAULT 0', // Phí % ngân hàng (VD: 0.007)
  // fee_vnd = roll_amount * fee_percent  (tính động)
  // profit  = (fee_percent - bank_fee_percent) * roll_amount (tính động)

  // Ngày (lưu ngày đầy đủ để tính chính xác)
  statement_day: 'DATE NULL',   // Ngày sao kê (ngày cụ thể, tự động tính tháng tiếp theo khi hiển thị)
  due_day: 'DATE NULL',         // Ngày đến hạn thanh toán (ngày cụ thể)
  roll_date: 'DATE NULL',          // Ngày đáo thực tế (ngày cụ thể)

  // Ghi chú & trạng thái
  note: 'TEXT NULL',
  is_done: "TINYINT(1) NOT NULL DEFAULT 0", // 1 = đã xong (cột Nạp trong xlsx)

  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

module.exports = creditCardFields;
