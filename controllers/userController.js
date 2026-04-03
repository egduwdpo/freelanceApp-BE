const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, profile } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (name) user.name = name;
    
    if (profile) {
      // Update profile fields
      const allowedFields = ['bio', 'skills', 'hourlyRate', 'availability', 'location'];
      allowedFields.forEach(field => {
        if (profile[field] !== undefined) {
          user.profile[field] = profile[field];
        }
      });
    }
    
    user.updatedAt = Date.now();
    await user.save();
    
    res.json({
      message: 'Profil berhasil diperbarui',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload avatar
// @route   POST /api/users/upload-avatar
// @access  Private
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }
    
    const user = await User.findById(req.user.userId);
    
    // Delete old avatar if exists and not default
    if (user.profile.avatar && user.profile.avatar !== 'default-avatar.png') {
      const oldAvatarPath = path.join(__dirname, '..', user.profile.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }
    
    user.profile.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    
    res.json({
      message: 'Avatar berhasil diupload',
      avatar: user.profile.avatar
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Error uploading avatar' });
  }
};

// @desc    Add portfolio
// @route   POST /api/users/portfolio
// @access  Private (Worker only)
exports.addPortfolio = async (req, res) => {
  try {
    const { title, description, link } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Judul dan deskripsi wajib diisi' });
    }
    
    const user = await User.findById(req.user.userId);
    
    user.profile.portfolio.push({
      title,
      description,
      link: link || '',
      createdAt: new Date()
    });
    
    await user.save();
    
    res.json({
      message: 'Portfolio berhasil ditambahkan',
      portfolio: user.profile.portfolio
    });
  } catch (error) {
    console.error('Add portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update portfolio
// @route   PUT /api/users/portfolio/:index
// @access  Private (Worker only)
exports.updatePortfolio = async (req, res) => {
  try {
    const { title, description, link } = req.body;
    const index = parseInt(req.params.index);
    
    const user = await User.findById(req.user.userId);
    
    if (index < 0 || index >= user.profile.portfolio.length) {
      return res.status(404).json({ message: 'Portfolio tidak ditemukan' });
    }
    
    if (title) user.profile.portfolio[index].title = title;
    if (description) user.profile.portfolio[index].description = description;
    if (link !== undefined) user.profile.portfolio[index].link = link;
    
    await user.save();
    
    res.json({
      message: 'Portfolio berhasil diperbarui',
      portfolio: user.profile.portfolio[index]
    });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete portfolio
// @route   DELETE /api/users/portfolio/:index
// @access  Private (Worker only)
exports.deletePortfolio = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const index = parseInt(req.params.index);
    
    if (index >= 0 && index < user.profile.portfolio.length) {
      user.profile.portfolio.splice(index, 1);
      await user.save();
      res.json({ message: 'Portfolio berhasil dihapus', portfolio: user.profile.portfolio });
    } else {
      res.status(404).json({ message: 'Portfolio tidak ditemukan' });
    }
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update social media
// @route   PUT /api/users/social-media
// @access  Private
exports.updateSocialMedia = async (req, res) => {
  try {
    const { github, linkedin, instagram, twitter, website } = req.body;
    const user = await User.findById(req.user.userId);
    
    user.profile.socialMedia = {
      github: github || '',
      linkedin: linkedin || '',
      instagram: instagram || '',
      twitter: twitter || '',
      website: website || ''
    };
    
    await user.save();
    
    res.json({
      message: 'Link sosial media berhasil diperbarui',
      socialMedia: user.profile.socialMedia
    });
  } catch (error) {
    console.error('Update social media error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const stats = {
      completedJobs: user.profile.completedJobs || 0,
      rating: user.profile.rating || 0,
      totalReviews: user.profile.totalReviews || 0,
      memberSince: user.createdAt
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user by ID (public)
// @route   GET /api/users/:id
// @access  Public
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -email');
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search workers
// @route   GET /api/users/workers
// @access  Public
exports.searchWorkers = async (req, res) => {
  try {
    const { skills, minRating, location, page = 1, limit = 10 } = req.query;
    
    let filter = { role: 'worker', isActive: true };
    
    if (skills) {
      const skillsArray = skills.split(',');
      filter['profile.skills'] = { $in: skillsArray };
    }
    
    if (minRating) {
      filter['profile.rating'] = { $gte: parseFloat(minRating) };
    }
    
    if (location) {
      filter['profile.location'] = { $regex: location, $options: 'i' };
    }
    
    const workers = await User.find(filter)
      .select('name profile.avatar profile.skills profile.rating profile.completedJobs profile.location')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(filter);
    
    res.json({
      workers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Search workers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};