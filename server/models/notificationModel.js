const notificationFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  user_id: 'INT NOT NULL',
  title: 'VARCHAR(255) NOT NULL',
  message: 'TEXT NOT NULL',
  is_read: 'BOOLEAN DEFAULT FALSE',
  type: 'VARCHAR(50) DEFAULT "general"',
  booking_id: 'INT NULL',
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
};

module.exports = notificationFields;
