const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['job', 'proposal', 'payment', 'system', 'message'],
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  data: {
    jobId: mongoose.Schema.Types.ObjectId,
    proposalId: mongoose.Schema.Types.ObjectId,
    transactionId: mongoose.Schema.Types.ObjectId,
    url: String,
    image: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60 // Auto delete after 30 days
  }
}, {
  timestamps: true
});

// Mark as read
NotificationSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ user: userId, read: false });
};

module.exports = mongoose.model('Notification', NotificationSchema);