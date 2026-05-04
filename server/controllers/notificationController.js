const pool = require("../config/db").pool;

const getNotifications = async (req, res) => {
  try {
    const user_id = req.user.id;
    const [rows] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi khi lấy thông báo:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const user_id = req.user.id;
    const notificationId = req.params.id;

    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
      [notificationId, user_id]
    );

    res.json({ message: "Đã đánh dấu đã đọc" });
  } catch (err) {
    console.error("Lỗi khi cập nhật thông báo:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const user_id = req.user.id;
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`,
      [user_id]
    );
    res.json({ message: "Đã đánh dấu tất cả đã đọc" });
  } catch (err) {
    console.error("Lỗi khi cập nhật tất cả thông báo:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const user_id = req.user.id;
    const [rows] = await pool.query(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [user_id]
    );
    res.json({ unread_count: rows[0].unread_count });
  } catch (err) {
    console.error("Lỗi khi lấy số thông báo chưa đọc:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
