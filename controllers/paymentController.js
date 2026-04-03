const midtransClient = require('midtrans-client');
const Transaction = require('../models/Transaction');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');

// Initialize Midtrans
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// @desc    Create payment
// @route   POST /api/payments/create
// @access  Private (Client only)
exports.createPayment = async (req, res) => {
  try {
    const { jobId } = req.body;
    
    const job = await Job.findById(jobId)
      .populate('client', 'name email')
      .populate('selectedWorker', 'name email');
    
    if (!job) {
      return res.status(404).json({ message: 'Pekerjaan tidak ditemukan' });
    }
    
    // Check if user is the client
    if (job.client._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    // Check if job has selected worker
    if (!job.selectedWorker) {
      return res.status(400).json({ message: 'Belum ada worker yang dipilih' });
    }
    
    // Check if job is in progress
    if (job.status !== 'in_progress') {
      return res.status(400).json({ message: 'Pekerjaan belum dalam proses' });
    }
    
    // Calculate service fee (10%)
    const serviceFee = Math.floor(job.budget * 0.1);
    const totalAmount = job.budget + serviceFee;
    
    // Check existing transaction
    const existingTransaction = await Transaction.findOne({ 
      job: jobId, 
      status: { $in: ['pending', 'paid'] } 
    });
    
    if (existingTransaction) {
      return res.json({
        message: 'Pembayaran sudah dibuat',
        paymentUrl: existingTransaction.paymentUrl,
        transactionId: existingTransaction._id
      });
    }
    
    // Create transaction record
    const transaction = new Transaction({
      job: jobId,
      client: req.user.userId,
      worker: job.selectedWorker._id,
      amount: job.budget,
      serviceFee: serviceFee,
      totalAmount: totalAmount,
      status: 'pending'
    });
    
    await transaction.save();
    
    // Create Midtrans transaction
    const parameter = {
      transaction_details: {
        order_id: `ORDER-${transaction._id}`,
        gross_amount: totalAmount
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: job.client.name,
        email: job.client.email
      },
      item_details: [
        {
          id: job._id.toString(),
          price: job.budget,
          quantity: 1,
          name: job.title.substring(0, 50)
        },
        {
          id: 'service-fee',
          price: serviceFee,
          quantity: 1,
          name: 'Biaya Layanan (10%)'
        }
      ]
    };
    
    const midtransTransaction = await snap.createTransaction(parameter);
    transaction.midtransOrderId = midtransTransaction.order_id;
    transaction.paymentUrl = midtransTransaction.redirect_url;
    await transaction.save();
    
    res.json({
      message: 'Pembayaran berhasil dibuat',
      paymentUrl: midtransTransaction.redirect_url,
      transactionId: transaction._id
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ message: 'Gagal membuat pembayaran: ' + error.message });
  }
};

// @desc    Payment notification (webhook)
// @route   POST /api/payments/notification
// @access  Public
exports.paymentNotification = async (req, res) => {
  try {
    const notification = req.body;
    const orderId = notification.order_id;
    const transactionId = orderId.replace('ORDER-', '');
    
    const transaction = await Transaction.findById(transactionId)
      .populate('job')
      .populate('client', 'name email')
      .populate('worker', 'name email');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Get status from Midtrans
    const statusResponse = await snap.transaction.notification(notification);
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        transaction.status = 'paid';
        
        // Send notification to worker
        const notificationDoc = new Notification({
          user: transaction.worker._id,
          title: 'Pembayaran Diterima',
          message: `Pembayaran untuk pekerjaan "${transaction.job.title}" telah diterima. Silakan mulai mengerjakan.`,
          type: 'payment',
          data: { jobId: transaction.job._id, transactionId: transaction._id }
        });
        await notificationDoc.save();
        
        // Send email to worker
        await sendEmail(
          transaction.worker.email,
          `Pembayaran Diterima - ${transaction.job.title}`,
          `
            <h2>Pembayaran Telah Diterima</h2>
            <p>Halo ${transaction.worker.name},</p>
            <p>Pembayaran untuk pekerjaan "${transaction.job.title}" telah diterima oleh sistem.</p>
            <p>Silakan mulai mengerjakan pekerjaan sesuai dengan kesepakatan.</p>
            <p>Pastikan untuk mengupdate progress pekerjaan secara berkala.</p>
          `
        );
      }
    } else if (transactionStatus === 'settlement') {
      transaction.status = 'paid';
    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
      transaction.status = 'failed';
    }
    
    await transaction.save();
    
    res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('Payment notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Release payment after job completion
// @route   PUT /api/payments/release/:transactionId
// @access  Private (Client only)
exports.releasePayment = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate('job')
      .populate('worker', 'name email');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Check if user is the client
    if (transaction.client.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    if (transaction.job.status !== 'completed') {
      return res.status(400).json({ message: 'Pekerjaan belum selesai' });
    }
    
    if (transaction.status !== 'paid') {
      return res.status(400).json({ message: 'Pembayaran belum dalam status siap dirilis' });
    }
    
    transaction.status = 'released';
    transaction.releasedAt = new Date();
    await transaction.save();
    
    // Update worker stats
    const worker = await User.findById(transaction.worker._id);
    worker.profile.completedJobs += 1;
    await worker.save();
    
    // Create notification for worker
    const notification = new Notification({
      user: transaction.worker._id,
      title: 'Pembayaran Dirilis',
      message: `Pembayaran untuk pekerjaan "${transaction.job.title}" telah dirilis ke akun Anda. Dana akan segera ditransfer.`,
      type: 'payment',
      data: { jobId: transaction.job._id, transactionId: transaction._id }
    });
    await notification.save();
    
    // Send email notification
    await sendEmail(
      transaction.worker.email,
      `Pembayaran Dirilis - ${transaction.job.title}`,
      `
        <h2>Pembayaran Telah Dirilis</h2>
        <p>Halo ${transaction.worker.name},</p>
        <p>Pembayaran untuk pekerjaan "${transaction.job.title}" telah dirilis oleh client.</p>
        <p>Jumlah: Rp ${transaction.amount.toLocaleString()}</p>
        <p>Dana akan segera ditransfer ke rekening Anda dalam 1-3 hari kerja.</p>
        <p>Terima kasih telah bekerja sama dengan kami!</p>
      `
    );
    
    res.json({
      message: 'Pembayaran berhasil dirilis',
      transaction
    });
  } catch (error) {
    console.error('Release payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get transaction history
// @route   GET /api/payments/history
// @access  Private
exports.getTransactionHistory = async (req, res) => {
  try {
    const filter = {};
    
    if (req.user.role === 'client') {
      filter.client = req.user.userId;
    } else if (req.user.role === 'worker') {
      filter.worker = req.user.userId;
    }
    
    const transactions = await Transaction.find(filter)
      .populate('job', 'title')
      .populate('client', 'name')
      .populate('worker', 'name')
      .sort('-createdAt');
    
    res.json(transactions);
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get transaction details
// @route   GET /api/payments/:transactionId
// @access  Private
exports.getTransactionDetails = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate('job', 'title description')
      .populate('client', 'name email')
      .populate('worker', 'name email');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Check if user is involved
    if (transaction.client.toString() !== req.user.userId && 
        transaction.worker.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};