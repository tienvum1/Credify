const express = require('express');
const router = express.Router();
const creditCardController = require('../controllers/creditCardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Tất cả các route này yêu cầu đăng nhập và là staff/admin
router.use(protect);
router.use(authorize('admin_system', 'staff'));

router.get('/dashboard', creditCardController.getDashboardStats);
router.get('/users', creditCardController.getAllUsers);
router.post('/add', creditCardController.addCard);
router.put('/:id', creditCardController.updateCard);
router.delete('/:id', creditCardController.deleteCard);

router.get('/history/:cardId', creditCardController.getPaymentHistory);
router.post('/payment', creditCardController.addPayment);

module.exports = router;
