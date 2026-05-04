const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bankAccountController');
const { protect } = require('../middleware/authMiddleware');

// Tất cả các routes đều yêu cầu đăng nhập
router.use(protect);

router.get('/', bankAccountController.getMyBankAccounts);
router.post('/', bankAccountController.addBankAccount);
router.put('/:id', bankAccountController.updateBankAccount);
router.delete('/:id', bankAccountController.deleteBankAccount);

module.exports = router;
