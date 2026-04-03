const Job = require('../models/Job');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');

// @desc    Create job
// @route   POST /api/jobs
// @access  Private (Client only)
exports.createJob = async (req, res) => {
  try {
    const { title, description, category, subcategory, budget, budgetType, duration, skills, experienceLevel, deadline } = req.body;
    
    const job = new Job({
      title,
      description,
      category,
      subcategory,
      budget,
      budgetType: budgetType || 'fixed',
      duration,
      skills,
      experienceLevel: experienceLevel || 'intermediate',
      deadline,
      client: req.user.userId
    });
    
    await job.save();
    
    res.status(201).json({
      message: 'Pekerjaan berhasil dibuat',
      job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all jobs with filters
// @route   GET /api/jobs
// @access  Private
exports.getJobs = async (req, res) => {
  try {
    const { 
      status, 
      category, 
      search, 
      minBudget, 
      maxBudget,
      skills,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;
    
    let filter = {};
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = parseInt(minBudget);
      if (maxBudget) filter.budget.$lte = parseInt(maxBudget);
    }
    if (skills) {
      const skillsArray = skills.split(',');
      filter.skills = { $in: skillsArray };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // If worker, only show open jobs
    if (req.user.role === 'worker') {
      filter.status = 'open';
    }
    
    const jobs = await Job.find(filter)
      .populate('client', 'name email profile.avatar profile.rating')
      .populate('selectedWorker', 'name email profile.avatar')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Job.countDocuments(filter);
    
    res.json({
      jobs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Private
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('client', 'name email profile.avatar profile.rating profile.completedJobs')
      .populate('selectedWorker', 'name email profile.avatar profile.skills profile.rating');
    
    if (!job) {
      return res.status(404).json({ message: 'Pekerjaan tidak ditemukan' });
    }
    
    // Increment views
    await job.incrementViews();
    
    // Check if expired
    await job.checkExpired();
    
    res.json(job);
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Client only)
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Pekerjaan tidak ditemukan' });
    }
    
    // Check if user is the client
    if (job.client.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    // Only allow update if job is open
    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Hanya pekerjaan yang masih terbuka yang dapat diupdate' });
    }
    
    const allowedUpdates = ['title', 'description', 'category', 'subcategory', 'budget', 'budgetType', 'duration', 'skills', 'experienceLevel', 'deadline'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });
    
    await job.save();
    
    res.json({
      message: 'Pekerjaan berhasil diperbarui',
      job
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update job status
// @route   PUT /api/jobs/:id/status
// @access  Private (Client only)
exports.updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Pekerjaan tidak ditemukan' });
    }
    
    // Check if user is the client
    if (job.client.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    const validStatuses = ['open', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }
    
    job.status = status;
    if (status === 'completed') {
      job.completedAt = new Date();
    }
    await job.save();
    
    // Create notification for worker
    if (job.selectedWorker) {
      const notification = new Notification({
        user: job.selectedWorker,
        title: status === 'completed' ? 'Pekerjaan Selesai' : 'Status Pekerjaan Diperbarui',
        message: status === 'completed' 
          ? `Pekerjaan "${job.title}" telah selesai. Client akan segera melakukan pembayaran.`
          : `Status pekerjaan "${job.title}" telah diubah menjadi ${status}`,
        type: 'job',
        data: { jobId: job._id }
      });
      await notification.save();
      
      // Send email notification
      await sendEmail(
        job.selectedWorker.email,
        `Status Pekerjaan Diperbarui - ${job.title}`,
        `
          <h2>Status Pekerjaan Diperbarui</h2>
          <p>Halo,</p>
          <p>Status pekerjaan "${job.title}" telah diubah menjadi ${status} oleh client.</p>
          <p>Silakan login ke aplikasi untuk melihat detail lebih lanjut.</p>
        `
      );
    }
    
    res.json({
      message: 'Status pekerjaan berhasil diperbarui',
      job
    });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Client only)
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Pekerjaan tidak ditemukan' });
    }
    
    // Check if user is the client
    if (job.client.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    // Only allow delete if job is open and no selected worker
    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Hanya pekerjaan yang masih terbuka yang dapat dihapus' });
    }
    
    if (job.selectedWorker) {
      return res.status(400).json({ message: 'Tidak dapat menghapus pekerjaan yang sudah memiliki worker' });
    }
    
    await job.deleteOne();
    
    res.json({ message: 'Pekerjaan berhasil dihapus' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get jobs by client
// @route   GET /api/jobs/client/my-jobs
// @access  Private (Client only)
exports.getClientJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ client: req.user.userId })
      .populate('selectedWorker', 'name email profile.avatar')
      .sort('-createdAt');
    
    res.json(jobs);
  } catch (error) {
    console.error('Get client jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get jobs by worker (assigned)
// @route   GET /api/jobs/worker/my-jobs
// @access  Private (Worker only)
exports.getWorkerJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ selectedWorker: req.user.userId })
      .populate('client', 'name email profile.avatar')
      .sort('-createdAt');
    
    res.json(jobs);
  } catch (error) {
    console.error('Get worker jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get job categories
// @route   GET /api/jobs/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = [
      'Web Development',
      'Mobile Development',
      'Design & Creative',
      'Writing & Translation',
      'Marketing & Sales',
      'Video & Animation',
      'Music & Audio',
      'Programming & Tech',
      'Business & Management'
    ];
    
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};