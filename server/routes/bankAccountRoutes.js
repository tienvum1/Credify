const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const bankAccountController = require('../controllers/bankAccountController');
const { protect } = require('../middleware/authMiddleware');

// Upload tối đa 1 ảnh QR cho tài khoản ngân hàng
const upload = multer({ storage });

// Tất cả các routes đều yêu cầu đăng nhập
router.use(protect);

router.get('/', bankAccountController.getMyBankAccounts);
router.post('/', upload.single('qr_image'), bankAccountController.addBankAccount);
router.put('/:id', upload.single('qr_image'), bankAccountController.updateBankAccount);
router.delete('/:id', bankAccountController.deleteBankAccount);

module.exports = router;
