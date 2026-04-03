const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    console.log('📝 Register request:', req.body);
    
    const { name, email, password, role } = req.body;
    
    // Validasi sederhana
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'Semua field wajib diisi' 
      });
    }
    
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }
    
    // Create user
    user = new User({
      name,
      email,
      password,
      role,
      profile: {
        skills: [],
        portfolio: [],
        socialMedia: {}
      }
    });
    
    // Save user
    await user.save();
    console.log('✅ User created:', user._id);
    
    // Generate token
    const token = generateToken(user._id, user.role);
    
    res.status(201).json({
      message: 'Registrasi berhasil',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });
    
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan server',
      error: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    console.log('🔐 Login request:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi' });
    }
    
    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Akun Anda telah dinonaktifkan' });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    
    // Generate token
    const token = generateToken(user._id, user.role);
    
    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};