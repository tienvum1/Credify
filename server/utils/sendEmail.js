const nodemailer = require("nodemailer");

// 1. Create reusable transporter (only once)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS,
  },
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
