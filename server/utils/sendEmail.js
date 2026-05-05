const nodemailer = require("nodemailer");

// 1. Create reusable transporter (only once)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER,
    pass: (process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || "").replace(/\s+/g, ""), // Loại bỏ khoảng trắng nếu có
  },
  tls: {
    rejectUnauthorized: false // Giúp tránh lỗi chứng chỉ trên một số môi trường hosting
  }
});

const sendEmail = async ({ from, to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: from || `"${process.env.FROM_NAME || 'Credify'}" <${process.env.GMAIL_USER || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = { sendEmail };
