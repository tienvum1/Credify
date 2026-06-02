const axios = require('axios');

/**
 * Gửi tin nhắn đến Telegram group
 * @param {string} message - Nội dung tin nhắn
 */
const sendTelegramMessage = async (message) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram Bot Token hoặc Chat ID chưa được cấu hình trong .env');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Lỗi khi gửi tin nhắn Telegram:', error.response?.data || error.message);
  }
};

module.exports = { sendTelegramMessage };
