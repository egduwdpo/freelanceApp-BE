const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Judul pekerjaan wajib diisi'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: [true, 'Deskripsi pekerjaan wajib diisi'],
    maxlength: 5000
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Web Development',
      'Mobile Development',
      'Design & Creative',
      'Writing & Translation',
      'Marketing & Sales',
      'Video & Animation',
      'Music & Audio',
      'Programming & Tech',
      'Business & Management'
    ]
  },
  subcategory: String,
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  budgetType: {
    type: String,
    enum: ['fixed', 'hourly'],
    default: 'fixed'
  },
  duration: {
    type: String,
    required: true
  },
  skills: [{
    type: String,
    required: true
  }],
  experienceLevel: {
    type: String,
    enum: ['entry', 'intermediate', 'expert'],
    default: 'intermediate'
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  selectedWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'open'
  },
  proposalsCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  deadline: Date,
  attachments: [{
    filename: String,
    url: String
  }],
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Increment views
JobSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Check if job is expired
JobSchema.methods.checkExpired = function() {
  if (this.deadline && this.deadline < new Date() && this.status === 'open') {
    this.status = 'expired';
    return this.save();
  }
  return this;
};

module.exports = mongoose.model('Job', JobSchema);