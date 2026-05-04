const pool = require('./config/db').pool;

async function seedCreditCards() {
  try {
    // Lấy id của một số khách hàng mẫu (role = 'user')
    const [users] = await pool.query("SELECT id FROM users WHERE role = 'user' LIMIT 3");
    
    if (users.length === 0) {
      console.log('Không tìm thấy khách hàng nào để thêm thẻ mẫu.');
      return;
    }

    const sampleCards = [
      {
        user_id: users[0].id,
        bank_name: 'Techcombank',
        card_number: '1234567890123456',
        credit_limit: 50000000,
        current_balance: 12500000,
        statement_date: 15,
        due_date: 25,
        minimum_payment: 500000
      },
      {
        user_id: users[0].id,
        bank_name: 'VIB',
        card_number: '9876543210987654',
        credit_limit: 30000000,
        current_balance: 28000000,
        statement_date: 20,
        due_date: 5, // Sẽ rơi vào tháng sau
        minimum_payment: 1000000
      },
      {
        user_id: users[1]?.id || users[0].id,
        bank_name: 'Vietcombank',
        card_number: '5555444433332222',
        credit_limit: 100000000,
        current_balance: 5000000,
        statement_date: 10,
        due_date: 20,
        minimum_payment: 250000
      }
    ];

    for (const card of sampleCards) {
      await pool.query(
        `INSERT INTO credit_cards (user_id, bank_name, card_number, credit_limit, current_balance, statement_date, due_date, minimum_payment) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [card.user_id, card.bank_name, card.card_number, card.credit_limit, card.current_balance, card.statement_date, card.due_date, card.minimum_payment]
      );
    }

    console.log('Đã thêm dữ liệu thẻ tín dụng mẫu thành công!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi seed data:', error);
    process.exit(1);
  }
}

seedCreditCards();
