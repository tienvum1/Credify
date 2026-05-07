const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createQR, updateQR, deleteQR, getAllQRs, getQRById, getReadyQRs, getReadyQRById, updateQRStatus, toggleAccountantEditable, accountantUpdateQR } = require('../controllers/qrController');
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
router.get('/ready', getReadyQRs);
router.get('/ready/:id', getReadyQRById);
router.patch('/:id/status', protect, authorize('staff', 'admin_system'), updateQRStatus);
router.patch('/:id/accountant-editable', protect, authorize('staff', 'admin_system'), toggleAccountantEditable);
router.put('/:id/accountant', protect, authorize('accountant'), qrUpload, accountantUpdateQR);
router.post('/', protect, authorize('staff', 'admin_system'), qrUpload, createQR);
router.put('/:id', protect, authorize('staff', 'admin_system'), qrUpload, updateQR);
router.delete('/:id', protect, authorize('staff', 'admin_system'), deleteQR);
router.get('/', protect, getAllQRs);
router.get('/:id', protect, getQRById);

module.exports = router;
