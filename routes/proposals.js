const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { auth, authorize } = require('../middleware/auth');
const { createProposalValidator, addFeedbackValidator } = require('../utils/validators');

router.post('/', auth, authorize('worker'), createProposalValidator, proposalController.submitProposal);
router.get('/my-proposals', auth, authorize('worker'), proposalController.getMyProposals);
router.get('/job/:jobId', auth, authorize('client'), proposalController.getJobProposals);
router.get('/:proposalId', auth, proposalController.getProposalById);
router.put('/:proposalId/accept', auth, authorize('client'), proposalController.acceptProposal);
router.put('/:proposalId/reject', auth, authorize('client'), proposalController.rejectProposal);
router.post('/:proposalId/feedback', auth, addFeedbackValidator, proposalController.addFeedback);

module.exports = router;