const sgMail = require('@sendgrid/mail');

// Cấu hình API Key cho SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Utility gửi email sử dụng SendGrid API (Vượt qua tường lửa của Render/Vercel)
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'tienvukk8@gmail.com';
  
  const msg = {
    to,
    from: {
      email: fromEmail,
      name: process.env.FROM_NAME || 'Credify'
    },
    subject,
    html,
  };

  try {
    const response = await sgMail.send(msg);
    console.log('✅ SendGrid API: Email sent successfully to', to);
    return response[0];
  } catch (error) {
    console.error('❌ SendGrid API Error:', error.message);
    if (error.response) {
      console.error('Chi tiết lỗi:', JSON.stringify(error.response.body, null, 2));
    }
    throw error;
  }
};

module.exports = { sendEmail };
