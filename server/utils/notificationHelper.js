const pool = require("../config/db").pool;
const nodemailer = require('nodemailer');

/**
 * Cấu hình transporter cho việc gửi email tối ưu cho Cloud
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
  family: 4
});

/**
 * Gửi email thông báo đơn hàng
 */
const sendBookingEmail = async (email, subject, booking, type, extraInfo = '') => {
  if (!email || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const shortCode = booking.code.slice(-6);
  const amountStr = Math.round(booking.transfer_amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  let title = '';
  let content = '';
  let color = '#4f46e5';
  let detailUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-bookings/${booking.id}`;

  switch(type) {
    case 'created':
      title = 'Đơn hàng mới đã được tạo';
      content = `Đơn hàng <strong>#${shortCode}</strong> với số tiền <strong>${amountStr} VNĐ</strong> đã được khởi tạo thành công trên hệ thống.`;
      break;
    case 'paid':
      title = 'Khách đã xác nhận thanh toán';
      content = `Khách hàng đã tải bill xác nhận chuyển tiền cho đơn hàng <strong>#${shortCode}</strong>. Số tiền: <strong>${amountStr} VNĐ</strong>.`;
      color = '#f59e0b';
      // Link dành cho Staff/Admin
      detailUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/staff/bookings/${booking.id}`;
      break;
    case 'confirmed':
      title = 'Đơn hàng đã được xác nhận';
      content = `Chúc mừng! Đơn hàng <strong>#${shortCode}</strong> của bạn đã được nhân viên xác nhận và chuyển khoản thành công.`;
      color = '#10b981';
      break;
    case 'rejected':
      title = 'Đơn hàng bị từ chối';
      content = `Đơn hàng <strong>#${shortCode}</strong> của bạn đã bị từ chối. <br/><strong>Lý do:</strong> ${extraInfo}`;
      color = '#ef4444';
      break;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: ${color}; text-align: center;">${title}</h2>
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Mã đơn:</strong> #${shortCode}</p>
        <p style="margin: 5px 0;"><strong>Số tiền:</strong> ${amountStr} VNĐ</p>
        <p style="margin: 5px 0;"><strong>Trạng thái:</strong> ${type === 'created' ? 'Chờ thanh toán' : (type === 'paid' ? 'Khách đã chuyển tiền' : (type === 'confirmed' ? 'Hoàn thành' : 'Từ chối'))}</p>
      </div>
      <p>${content}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${detailUrl}" style="background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Xem chi tiết đơn hàng</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">© 2024 Credify.vn. All rights reserved.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Credify.vn" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `[Credify] ${subject} - #${shortCode}`,
      html: html
    });
    console.log(`Email thông báo (${type}) đã gửi tới ${email}:`, info.messageId);
  } catch (err) {
    console.error(`LỖI GỬI EMAIL THÔNG BÁO (${type}):`, err.message);
  }
};

/**
 * Tạo thông báo mới và gửi email
 */
const createNotification = async (user_id, title, message, type = 'general', booking_id = null) => {
  try {
    // Lưu vào database
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, booking_id) VALUES (?, ?, ?, ?, ?)`,
      [user_id, title, message, type, booking_id]
    );

    // Gửi email dựa trên loại thông báo
    if (booking_id) {
      const [userRows] = await pool.query("SELECT email FROM users WHERE id = ?", [user_id]);
      const [bookingRows] = await pool.query("SELECT * FROM bookings WHERE id = ?", [booking_id]);
      
      if (userRows.length > 0 && bookingRows.length > 0) {
        const user = userRows[0];
        const booking = bookingRows[0];
        
        if (type === 'customer_paid') {
          await sendBookingEmail(user.email, 'Khách đã xác nhận thanh toán', booking, 'paid');
        } else if (type === 'staff_confirmed') {
          await sendBookingEmail(user.email, 'Đơn hàng đã được hoàn thành', booking, 'confirmed');
        } else if (type === 'rejected') {
          // Lấy reject_note từ booking
          await sendBookingEmail(user.email, 'Đơn hàng bị từ chối', booking, 'rejected', booking.reject_note || 'Thông tin không hợp lệ');
        }
      }
    }
  } catch (err) {
    console.error("Lỗi khi tạo thông báo và gửi mail:", err);
  }
};

module.exports = {
  createNotification,
  sendBookingEmail
};
