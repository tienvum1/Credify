const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/creditCardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('admin_system', 'staff'));

router.get('/dashboard', ctrl.getDashboardStats);
router.post('/add', ctrl.addCard);
router.put('/:id', ctrl.updateCard);
router.patch('/:id/toggle-done', ctrl.toggleDone);
router.delete('/:id', ctrl.deleteCard);

module.exports = router;
