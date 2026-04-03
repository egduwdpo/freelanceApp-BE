const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth, authorize } = require('../middleware/auth');
const { createPaymentValidator } = require('../utils/validators');

router.post('/create', auth, authorize('client'), createPaymentValidator, paymentController.createPayment);
router.post('/notification', paymentController.paymentNotification);
router.put('/release/:transactionId', auth, authorize('client'), paymentController.releasePayment);
router.get('/history', auth, paymentController.getTransactionHistory);
router.get('/:transactionId', auth, paymentController.getTransactionDetails);

module.exports = router;