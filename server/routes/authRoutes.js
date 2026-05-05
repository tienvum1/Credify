const express = require('express');
const router = express.Router();
const { register, verifyEmail, login, googleLogin, logout, getMe, forgotPassword, resetPassword, updateProfile, changePassword, testEmail } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.get('/verify-email/:token', verifyEmail);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/test-email', testEmail);

module.exports = router;
