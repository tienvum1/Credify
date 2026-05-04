const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createQR, updateQR, deleteQR, getAllQRs, getQRById, getReadyQRs, getReadyQRById, updateQRStatus } = require('../controllers/qrController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const { storage } = require('../config/cloudinary');

const upload = multer({ storage: storage });

// Cấu hình multer để nhận nhiều file (main_image và qr_image)
const qrUpload = upload.fields([
  { name: 'main_image', maxCount: 1 },
  { name: 'qr_image', maxCount: 1 }
]);

// Routes
router.get('/ready', getReadyQRs); // Route công khai để lấy QR sẵn sàng cho trang Home
router.get('/ready/:id', getReadyQRById);
router.patch('/:id/status', protect, authorize('staff', 'admin_system'), updateQRStatus);
router.post('/', protect, authorize('staff', 'admin_system'), qrUpload, createQR);
router.put('/:id', protect, authorize('staff', 'admin_system'), qrUpload, updateQR);
router.delete('/:id', protect, authorize('staff', 'admin_system'), deleteQR);
router.get('/', protect, getAllQRs);
router.get('/:id', protect, getQRById);

module.exports = router;
