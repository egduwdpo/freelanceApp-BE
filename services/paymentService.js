const midtransClient = require('midtrans-client');
const Transaction = require('../models/Transaction');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const { sendEmail } = require('./emailService');

// Initialize Midtrans
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Create payment transaction
exports.createPayment = async (job, client, worker) => {
  try {
    // Calculate service fee (10%)
    const serviceFee = Math.floor(job.budget * 0.1);
    const totalAmount = job.budget + serviceFee;
    
    // Check existing transaction
    const existingTransaction = await Transaction.findOne({ 
      job: job._id, 
      status: { $in: ['pending', 'paid'] } 
    });
    
    if (existingTransaction) {
      return existingTransaction;
    }
    
    // Create transaction record
    const transaction = new Transaction({
      job: job._id,
      client: client._id,
      worker: worker._id,
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
        first_name: client.name,
        email: client.email
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
    
    return transaction;
  } catch (error) {
    console.error('Payment creation error:', error);
    throw error;
  }
};

// Process payment notification
exports.processPaymentNotification = async (notification) => {
  try {
    const orderId = notification.order_id;
    const transactionId = orderId.replace('ORDER-', '');
    
    const transaction = await Transaction.findById(transactionId)
      .populate('job')
      .populate('client', 'name email')
      .populate('worker', 'name email');
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Get status from Midtrans
    const statusResponse = await snap.transaction.notification(notification);
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    
    let statusChanged = false;
    
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        transaction.status = 'paid';
        statusChanged = true;
      }
    } else if (transactionStatus === 'settlement') {
      transaction.status = 'paid';
      statusChanged = true;
    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
      transaction.status = 'failed';
      statusChanged = true;
    }
    
    if (statusChanged) {
      await transaction.save();
      
      // Send notifications based on status
      if (transaction.status === 'paid') {
        await exports.sendPaymentSuccessNotifications(transaction);
      } else if (transaction.status === 'failed') {
        await exports.sendPaymentFailedNotifications(transaction);
      }
    }
    
    return transaction;
  } catch (error) {
    console.error('Process payment notification error:', error);
    throw error;
  }
};

// Send payment success notifications
exports.sendPaymentSuccessNotifications = async (transaction) => {
  try {
    // Create notification for worker
    const workerNotification = new Notification({
      user: transaction.worker._id,
      title: 'Pembayaran Diterima',
      message: `Pembayaran untuk pekerjaan "${transaction.job.title}" telah diterima. Silakan mulai mengerjakan.`,
      type: 'payment',
      data: { jobId: transaction.job._id, transactionId: transaction._id }
    });
    await workerNotification.save();
    
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
    
    // Create notification for client
    const clientNotification = new Notification({
      user: transaction.client._id,
      title: 'Pembayaran Berhasil',
      message: `Pembayaran untuk pekerjaan "${transaction.job.title}" telah berhasil diproses.`,
      type: 'payment',
      data: { jobId: transaction.job._id, transactionId: transaction._id }
    });
    await clientNotification.save();
    
    return true;
  } catch (error) {
    console.error('Send payment success notifications error:', error);
    return false;
  }
};

// Send payment failed notifications
exports.sendPaymentFailedNotifications = async (transaction) => {
  try {
    // Create notification for client
    const notification = new Notification({
      user: transaction.client._id,
      title: 'Pembayaran Gagal',
      message: `Pembayaran untuk pekerjaan "${transaction.job.title}" gagal diproses. Silakan coba lagi.`,
      type: 'payment',
      data: { jobId: transaction.job._id, transactionId: transaction._id }
    });
    await notification.save();
    
    // Send email to client
    await sendEmail(
      transaction.client.email,
      `Pembayaran Gagal - ${transaction.job.title}`,
      `
        <h2>Pembayaran Gagal Diproses</h2>
        <p>Halo ${transaction.client.name},</p>
        <p>Pembayaran untuk pekerjaan "${transaction.job.title}" gagal diproses.</p>
        <p>Silakan coba lagi atau gunakan metode pembayaran lain.</p>
        <a href="${transaction.paymentUrl}">Coba Lagi</a>
      `
    );
    
    return true;
  } catch (error) {
    console.error('Send payment failed notifications error:', error);
    return false;
  }
};

// Release payment to worker
exports.releasePayment = async (transactionId, clientId) => {
  try {
    const transaction = await Transaction.findById(transactionId)
      .populate('job')
      .populate('worker', 'name email');
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Check if user is the client
    if (transaction.client.toString() !== clientId) {
      throw new Error('Unauthorized');
    }
    
    if (transaction.job.status !== 'completed') {
      throw new Error('Job not completed');
    }
    
    if (transaction.status !== 'paid') {
      throw new Error('Payment not ready to release');
    }
    
    transaction.status = 'released';
    transaction.releasedAt = new Date();
    await transaction.save();
    
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
    
    return transaction;
  } catch (error) {
    console.error('Release payment error:', error);
    throw error;
  }
};

// Get transaction status from Midtrans
exports.getTransactionStatus = async (orderId) => {
  try {
    const status = await snap.transaction.status(orderId);
    return status;
  } catch (error) {
    console.error('Get transaction status error:', error);
    throw error;
  }
};

// Cancel transaction
exports.cancelTransaction = async (transactionId, clientId) => {
  try {
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.client.toString() !== clientId) {
      throw new Error('Unauthorized');
    }
    
    if (transaction.status !== 'pending') {
      throw new Error('Cannot cancel transaction in current status');
    }
    
    transaction.status = 'cancelled';
    await transaction.save();
    
    // Try to cancel in Midtrans
    try {
      await snap.transaction.cancel(transaction.midtransOrderId);
    } catch (error) {
      console.error('Midtrans cancel error:', error);
      // Continue even if Midtrans cancel fails
    }
    
    return transaction;
  } catch (error) {
    console.error('Cancel transaction error:', error);
    throw error;
  }
};