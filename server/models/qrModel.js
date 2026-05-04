// Định nghĩa cấu trúc các trường cho bảng qrs
const qrFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  main_image: 'VARCHAR(255)', // Ảnh đại diện hiển thị ở danh sách ngoài (Card)
  qr_image: 'VARCHAR(255)', // Ảnh mã QR thực tế để khách quét
  max_amount_per_trans: 'DECIMAL(15, 2) NOT NULL', // Mức tiền tối đa một lần chuyển
  fee_rate: 'DECIMAL(5, 2) DEFAULT 0', // Giá phí mặc định
  fee_rate_l1: 'DECIMAL(5, 2) DEFAULT 0', // Phí cho thành viên cấp 1
  fee_rate_l2: 'DECIMAL(5, 2) DEFAULT 0', // Phí cho thành viên cấp 2
  fee_rate_l3: 'DECIMAL(5, 2) DEFAULT 0', // Phí cho thành viên cấp 3
  note: 'TEXT', // Ghi chú
  status: "ENUM('ready', 'maintenance') DEFAULT 'ready'", // Trạng thái QR
  creator_id: 'INT NOT NULL', // Người tạo (FK tới users)
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

module.exports = qrFields;
