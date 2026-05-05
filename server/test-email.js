require('dotenv').config();
const { sendEmail } = require('./utils/sendEmail');

async function test() {
  console.log('--- Bắt đầu test gửi email ---');
  console.log('Sử dụng GMAIL_USER:', process.env.GMAIL_USER || process.env.EMAIL_USER);
  
  try {
    const info = await sendEmail({
      to: process.env.GMAIL_USER || process.env.EMAIL_USER,
      subject: 'Test Email từ script test-email.js',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4f46e5;">Kết nối Gmail thành công!</h2>
          <p>Nếu bạn nhận được email này, có nghĩa là cấu hình <strong>GMAIL_APP_PASSWORD</strong> của bạn đã hoạt động chính xác.</p>
          <p>Thời gian gửi: ${new Date().toLocaleString('vi-VN')}</p>
        </div>
      `
    });
    
    console.log('✅ Gửi email thành công!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Gửi email thất bại:');
    console.error(error);
  }
}

test();
