const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Akses ditolak. Token tidak ditemukan.' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Token tidak valid. User tidak ditemukan.' 
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Akun Anda telah dinonaktifkan.' 
      });
    }
    
    req.user = {
      userId: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token tidak valid.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token sudah kadaluarsa.' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} tidak memiliki akses ke resource ini.` 
      });
    }
    next();
  };
};

module.exports = { auth, authorize };