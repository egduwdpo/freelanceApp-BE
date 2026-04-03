const { body } = require('express-validator');

// Auth validators
exports.registerValidator = [
  body('name')
    .notEmpty().withMessage('Nama wajib diisi')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Nama minimal 3 dan maksimal 50 karakter'),
  
  body('email')
    .notEmpty().withMessage('Email wajib diisi')
    .isEmail().withMessage('Email tidak valid')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password wajib diisi')
    .isLength({ min: 6 }).withMessage('Password minimal 6 karakter')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password harus mengandung huruf dan angka'),
  
  body('role')
    .notEmpty().withMessage('Role wajib diisi')
    .isIn(['worker', 'client']).withMessage('Role harus worker atau client')
];

exports.loginValidator = [
  body('email')
    .notEmpty().withMessage('Email wajib diisi')
    .isEmail().withMessage('Email tidak valid')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password wajib diisi')
];

// Job validators
exports.createJobValidator = [
  body('title')
    .notEmpty().withMessage('Judul wajib diisi')
    .trim()
    .isLength({ min: 10, max: 100 }).withMessage('Judul minimal 10 dan maksimal 100 karakter'),
  
  body('description')
    .notEmpty().withMessage('Deskripsi wajib diisi')
    .isLength({ min: 50, max: 5000 }).withMessage('Deskripsi minimal 50 dan maksimal 5000 karakter'),
  
  body('category')
    .notEmpty().withMessage('Kategori wajib dipilih')
    .isIn([
      'Web Development',
      'Mobile Development',
      'Design & Creative',
      'Writing & Translation',
      'Marketing & Sales',
      'Video & Animation',
      'Music & Audio',
      'Programming & Tech',
      'Business & Management'
    ]).withMessage('Kategori tidak valid'),
  
  body('budget')
    .notEmpty().withMessage('Budget wajib diisi')
    .isNumeric().withMessage('Budget harus berupa angka')
    .isFloat({ min: 10000 }).withMessage('Budget minimal Rp 10.000'),
  
  body('duration')
    .notEmpty().withMessage('Durasi wajib diisi')
    .trim(),
  
  body('skills')
    .isArray().withMessage('Skills harus berupa array')
    .notEmpty().withMessage('Minimal 1 skill diperlukan')
];

// Proposal validators
exports.createProposalValidator = [
  body('jobId')
    .notEmpty().withMessage('Job ID wajib diisi')
    .isMongoId().withMessage('Job ID tidak valid'),
  
  body('coverLetter')
    .notEmpty().withMessage('Cover letter wajib diisi')
    .isLength({ min: 50, max: 2000 }).withMessage('Cover letter minimal 50 dan maksimal 2000 karakter'),
  
  body('proposedAmount')
    .notEmpty().withMessage('Jumlah yang ditawarkan wajib diisi')
    .isNumeric().withMessage('Jumlah harus berupa angka')
    .isFloat({ min: 0 }).withMessage('Jumlah minimal 0'),
  
  body('estimatedDays')
    .notEmpty().withMessage('Estimasi hari wajib diisi')
    .isInt({ min: 1, max: 90 }).withMessage('Estimasi hari antara 1-90 hari')
];

// User profile validators
exports.updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Nama minimal 3 dan maksimal 50 karakter'),
  
  body('profile.bio')
    .optional()
    .isLength({ max: 500 }).withMessage('Bio maksimal 500 karakter'),
  
  body('profile.skills')
    .optional()
    .isArray().withMessage('Skills harus berupa array'),
  
  body('profile.hourlyRate')
    .optional()
    .isNumeric().withMessage('Hourly rate harus berupa angka')
    .isFloat({ min: 0 }).withMessage('Hourly rate minimal 0'),
  
  body('profile.availability')
    .optional()
    .isIn(['full-time', 'part-time', 'freelance']).withMessage('Availability tidak valid')
];

// Portfolio validators
exports.addPortfolioValidator = [
  body('title')
    .notEmpty().withMessage('Judul portfolio wajib diisi')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Judul minimal 3 dan maksimal 100 karakter'),
  
  body('description')
    .notEmpty().withMessage('Deskripsi portfolio wajib diisi')
    .isLength({ min: 10, max: 500 }).withMessage('Deskripsi minimal 10 dan maksimal 500 karakter'),
  
  body('link')
    .optional()
    .isURL().withMessage('Link harus berupa URL yang valid')
];

// Payment validators
exports.createPaymentValidator = [
  body('jobId')
    .notEmpty().withMessage('Job ID wajib diisi')
    .isMongoId().withMessage('Job ID tidak valid')
];

// Feedback validators
exports.addFeedbackValidator = [
  body('rating')
    .notEmpty().withMessage('Rating wajib diisi')
    .isInt({ min: 1, max: 5 }).withMessage('Rating harus antara 1-5'),
  
  body('comment')
    .optional()
    .isLength({ max: 500 }).withMessage('Komentar maksimal 500 karakter'),
  
  body('type')
    .notEmpty().withMessage('Tipe feedback wajib diisi')
    .isIn(['client', 'worker']).withMessage('Tipe feedback harus client atau worker')
];

// Change password validator
exports.changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Password lama wajib diisi'),
  
  body('newPassword')
    .notEmpty().withMessage('Password baru wajib diisi')
    .isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password baru harus mengandung huruf dan angka')
];

// Forgot password validator
exports.forgotPasswordValidator = [
  body('email')
    .notEmpty().withMessage('Email wajib diisi')
    .isEmail().withMessage('Email tidak valid')
    .normalizeEmail()
];

// Reset password validator
exports.resetPasswordValidator = [
  body('token')
    .notEmpty().withMessage('Token wajib diisi'),
  
  body('newPassword')
    .notEmpty().withMessage('Password baru wajib diisi')
    .isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password baru harus mengandung huruf dan angka')
];