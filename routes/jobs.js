const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { auth, authorize } = require('../middleware/auth');
const { createJobValidator } = require('../utils/validators');

router.post('/', auth, authorize('client'), createJobValidator, jobController.createJob);
router.get('/', auth, jobController.getJobs);
router.get('/categories', jobController.getCategories);
router.get('/client/my-jobs', auth, authorize('client'), jobController.getClientJobs);
router.get('/worker/my-jobs', auth, authorize('worker'), jobController.getWorkerJobs);
router.get('/:id', auth, jobController.getJobById);
router.put('/:id', auth, authorize('client'), jobController.updateJob);
router.put('/:id/status', auth, authorize('client'), jobController.updateJobStatus);
router.delete('/:id', auth, authorize('client'), jobController.deleteJob);

module.exports = router;