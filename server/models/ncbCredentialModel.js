// Cấu trúc bảng ncb_credentials — lưu tài khoản đăng nhập NCB devwork
const ncbCredentialFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  username: 'VARCHAR(100) NOT NULL UNIQUE',   // username đăng nhập NCB
  password: 'VARCHAR(255) NOT NULL',           // password (plain text, chỉ admin thấy)
  label: 'VARCHAR(100) NULL',                  // tên gợi nhớ (VD: "Tài khoản chính")
  is_active: 'TINYINT(1) NOT NULL DEFAULT 1',  // 1 = đang dùng, 0 = tắt
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
};

module.exports = ncbCredentialFields;
