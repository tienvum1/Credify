require('dotenv').config();
const { sendEmail } = require('./utils/sendEmail');

async function test() {
  console.log('--- Bắt đầu test gửi email qua SendGrid API ---');
  console.log('Sử dụng SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || 'tienvukk8@gmail.com');
  
  try {
    const response = await sendEmail({
      to: 'tienvukk8@gmail.com',
      subject: 'Test Email từ script test-email.js (SendGrid API)',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4f46e5;">Kết nối SendGrid thành công!</h2>
          <p>Nếu bạn nhận được email này, có nghĩa là cấu hình <strong>SENDGRID_API_KEY</strong> của bạn đã hoạt động chính xác trên môi trường Production.</p>
          <p>Thời gian gửi: ${new Date().toLocaleString('vi-VN')}</p>
        </div>
      `
    });
    
    console.log('✅ Gửi email qua SendGrid thành công!');
    console.log('Status Code:', response.statusCode);
  } catch (error) {
    console.error('❌ Gửi email thất bại:');
    if (error.response) {
      console.error(JSON.stringify(error.response.body, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

test();
