const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Tất cả các route này yêu cầu đăng nhập và là admin_system
router.use(protect);
router.use(authorize('admin_system'));

router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Quản lý đơn hàng nâng cao cho Admin
router.delete('/bookings/:id', adminController.deleteBooking);

module.exports = router;
