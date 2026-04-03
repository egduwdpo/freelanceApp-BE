const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nama wajib diisi'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email wajib diisi'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password wajib diisi'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['worker', 'client'],
    required: true
  },
  profile: {
    bio: String,
    skills: [String],
    hourlyRate: Number,
    availability: String,
    location: String,
    avatar: String,
    socialMedia: {
      github: String,
      linkedin: String,
      instagram: String,
      twitter: String,
      website: String
    },
    portfolio: [{
      title: String,
      description: String,
      link: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    completedJobs: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return; // No 'next()' needed here for async functions
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // No 'next()' needed here; resolving the async function is enough
  } catch (error) {
    throw error; // Throwing inside an async hook is the same as next(error)
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update rating method
UserSchema.methods.updateRating = async function(newRating) {
  const total = this.profile.rating * this.profile.totalReviews;
  this.profile.totalReviews += 1;
  this.profile.rating = (total + newRating) / this.profile.totalReviews;
  return this.save();
};

module.exports = mongoose.model('User', UserSchema);