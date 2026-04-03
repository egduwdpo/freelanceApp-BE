const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, authorize } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { updateProfileValidator, addPortfolioValidator } = require('../utils/validators');

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, updateProfileValidator, userController.updateProfile);
router.post('/upload-avatar', auth, uploadAvatar.single('avatar'), userController.uploadAvatar);
router.post('/portfolio', auth, authorize('worker'), addPortfolioValidator, userController.addPortfolio);
router.put('/portfolio/:index', auth, authorize('worker'), userController.updatePortfolio);
router.delete('/portfolio/:index', auth, authorize('worker'), userController.deletePortfolio);
router.put('/social-media', auth, userController.updateSocialMedia);
router.get('/stats', auth, userController.getStats);
router.get('/workers', userController.searchWorkers);
router.get('/:id', userController.getUserById);

module.exports = router;