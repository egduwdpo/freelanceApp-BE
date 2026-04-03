const Proposal = require('../models/Proposal');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');

// @desc    Submit proposal
// @route   POST /api/proposals
// @access  Private (Worker only)
exports.submitProposal = async (req, res) => {
  try {
    const { jobId, coverLetter, proposedAmount, estimatedDays } = req.body;
    
    // Check if job exists and is open
    const job = await Job.findById(jobId).populate('client', 'name email');
    if (!job) {
      return res.status(404).json({ message: 'Pekerjaan tidak ditemukan' });
    }
    
    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Pekerjaan sudah tidak tersedia' });
    }
    
    // Check if already proposed
    const existingProposal = await Proposal.findOne({
      job: jobId,
      worker: req.user.userId
    });
    
    if (existingProposal) {
      return res.status(400).json({ message: 'Anda sudah mengirim proposal untuk pekerjaan ini' });
    }
    
    // Create proposal
    const proposal = new Proposal({
      job: jobId,
      worker: req.user.userId,
      coverLetter,
      proposedAmount,
      estimatedDays
    });
    
    await proposal.save();
    
    // Increment proposals count
    job.proposalsCount += 1;
    await job.save();
    
    // Create notification for client
    const notification = new Notification({
      user: job.client._id,
      title: 'Proposal Baru',
      message: `Ada proposal baru untuk pekerjaan "${job.title}" dari ${req.user.name}`,
      type: 'proposal',
      data: { proposalId: proposal._id, jobId: job._id }
    });
    await notification.save();
    
    // Send email notification to client
    const emailHtml = `
      <h2>Proposal Baru untuk Pekerjaan Anda</h2>
      <p>Halo ${job.client.name},</p>
      <p>Anda menerima proposal baru untuk pekerjaan "${job.title}" dari ${req.user.name}.</p>
      <p><strong>Jumlah yang ditawarkan:</strong> Rp ${proposedAmount.toLocaleString()}</p>
      <p><strong>Estimasi pengerjaan:</strong> ${estimatedDays} hari</p>
      <p><strong>Cover Letter:</strong></p>
      <p>${coverLetter}</p>
      <p>Silakan login ke aplikasi untuk melihat detail proposal dan memutuskan apakah akan menerima atau menolak.</p>
    `;
    
    await sendEmail(job.client.email, 'Proposal Baru untuk Pekerjaan Anda', emailHtml);
    
    res.status(201).json({
      message: 'Proposal berhasil dikirim',
      proposal
    });
  } catch (error) {
    console.error('Submit proposal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get proposals for a job (client only)
// @route   GET /api/proposals/job/:jobId
// @access  Private (Client only)
exports.getJobProposals = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'Pekerjaan tidak ditemukan' });
    }
    
    // Check if user is the client
    if (job.client.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    const proposals = await Proposal.find({ job: req.params.jobId })
      .populate('worker', 'name email profile.skills profile.avatar profile.rating profile.completedJobs profile.location')
      .sort('-createdAt');
    
    res.json(proposals);
  } catch (error) {
    console.error('Get job proposals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept proposal
// @route   PUT /api/proposals/:proposalId/accept
// @access  Private (Client only)
exports.acceptProposal = async (req, res) => {
  try {
    const { instructions } = req.body;
    const proposal = await Proposal.findById(req.params.proposalId)
      .populate('job')
      .populate('worker', 'name email');
    
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal tidak ditemukan' });
    }
    
    // Check if user is the client
    if (proposal.job.client.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    // Check if job is still open
    if (proposal.job.status !== 'open') {
      return res.status(400).json({ message: 'Pekerjaan sudah tidak tersedia' });
    }
    
    // Update proposal status
    proposal.status = 'accepted';
    await proposal.save();
    
    // Update job
    proposal.job.status = 'in_progress';
    proposal.job.selectedWorker = proposal.worker._id;
    await proposal.job.save();
    
    // Reject other proposals
    await Proposal.updateMany(
      { job: proposal.job._id, _id: { $ne: proposal._id } },
      { status: 'rejected' }
    );
    
    // Send email with task details
    const emailContent = `
      <h2>Selamat! Proposal Anda Diterima</h2>
      <p>Halo ${proposal.worker.name},</p>
      <p>Proposal Anda untuk pekerjaan "${proposal.job.title}" telah diterima.</p>
      
      <h3>Detail Pekerjaan:</h3>
      <p><strong>Judul:</strong> ${proposal.job.title}</p>
      <p><strong>Deskripsi:</strong> ${proposal.job.description}</p>
      <p><strong>Budget:</strong> Rp ${proposal.proposedAmount.toLocaleString()}</p>
      <p><strong>Estimasi Waktu:</strong> ${proposal.estimatedDays} hari</p>
      <p><strong>Kategori:</strong> ${proposal.job.category}</p>
      <p><strong>Skills yang dibutuhkan:</strong> ${proposal.job.skills.join(', ')}</p>
      
      <h3>Instruksi Pengerjaan:</h3>
      <p>${instructions || 'Silakan mulai mengerjakan sesuai dengan deskripsi yang telah disepakati.'}</p>
      
      <h3>Catatan Penting:</h3>
      <ul>
        <li>Komunikasi dengan client dapat dilakukan melalui fitur chat di aplikasi</li>
        <li>Update progress pekerjaan secara berkala</li>
        <li>Pastikan untuk menyelesaikan pekerjaan sesuai deadline yang telah disepakati</li>
      </ul>
      
      <p>Anda dapat melihat detail pekerjaan dan mulai mengerjakan di aplikasi.</p>
      <br>
      <p>Salam,</p>
      <p>Tim Freelance App Indonesia</p>
    `;
    
    await sendEmail(proposal.worker.email, `Proposal Diterima - ${proposal.job.title}`, emailContent);
    
    // Create in-app notification
    const notification = new Notification({
      user: proposal.worker._id,
      title: 'Proposal Diterima',
      message: `Proposal Anda untuk pekerjaan "${proposal.job.title}" telah diterima. Cek email untuk detail tugas.`,
      type: 'proposal',
      data: { jobId: proposal.job._id, proposalId: proposal._id }
    });
    await notification.save();
    
    res.json({
      message: 'Proposal berhasil diterima',
      job: proposal.job
    });
  } catch (error) {
    console.error('Accept proposal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject proposal
// @route   PUT /api/proposals/:proposalId/reject
// @access  Private (Client only)
exports.rejectProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.proposalId)
      .populate('job')
      .populate('worker', 'name email');
    
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal tidak ditemukan' });
    }
    
    // Check if user is the client
    if (proposal.job.client.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    proposal.status = 'rejected';
    await proposal.save();
    
    // Create notification for worker
    const notification = new Notification({
      user: proposal.worker._id,
      title: 'Proposal Ditolak',
      message: `Proposal Anda untuk pekerjaan "${proposal.job.title}" ditolak. Jangan berkecil hati, coba cari pekerjaan lainnya.`,
      type: 'proposal',
      data: { jobId: proposal.job._id }
    });
    await notification.save();
    
    res.json({
      message: 'Proposal berhasil ditolak'
    });
  } catch (error) {
    console.error('Reject proposal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get worker's proposals
// @route   GET /api/proposals/my-proposals
// @access  Private (Worker only)
exports.getMyProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find({ worker: req.user.userId })
      .populate('job', 'title description budget status category createdAt')
      .sort('-createdAt');
    
    res.json(proposals);
  } catch (error) {
    console.error('Get my proposals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get proposal details
// @route   GET /api/proposals/:proposalId
// @access  Private
exports.getProposalById = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.proposalId)
      .populate('job')
      .populate('worker', 'name email profile.skills profile.avatar profile.rating')
      .populate('client', 'name email profile.avatar');
    
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal tidak ditemukan' });
    }
    
    // Check if user is involved
    if (proposal.worker._id.toString() !== req.user.userId && 
        proposal.job.client.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    res.json(proposal);
  } catch (error) {
    console.error('Get proposal by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add feedback to completed proposal
// @route   POST /api/proposals/:proposalId/feedback
// @access  Private
exports.addFeedback = async (req, res) => {
  try {
    const { rating, comment, type } = req.body;
    const proposal = await Proposal.findById(req.params.proposalId)
      .populate('job');
    
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal tidak ditemukan' });
    }
    
    // Check if user is involved
    const isClient = proposal.job.client.toString() === req.user.userId;
    const isWorker = proposal.worker.toString() === req.user.userId;
    
    if (!isClient && !isWorker) {
      return res.status(403).json({ message: 'Tidak memiliki akses' });
    }
    
    // Check if job is completed
    if (proposal.job.status !== 'completed') {
      return res.status(400).json({ message: 'Pekerjaan belum selesai' });
    }
    
    if (type === 'client' && isClient) {
      if (proposal.clientFeedback) {
        return res.status(400).json({ message: 'Anda sudah memberikan feedback' });
      }
      proposal.clientFeedback = { rating, comment, createdAt: new Date() };
    } else if (type === 'worker' && isWorker) {
      if (proposal.workerFeedback) {
        return res.status(400).json({ message: 'Anda sudah memberikan feedback' });
      }
      proposal.workerFeedback = { rating, comment, createdAt: new Date() };
    } else {
      return res.status(400).json({ message: 'Tipe feedback tidak valid' });
    }
    
    await proposal.save();
    
    // Update user rating if both feedbacks are given
    if (proposal.clientFeedback && proposal.workerFeedback) {
      const worker = await User.findById(proposal.worker);
      await worker.updateRating(proposal.clientFeedback.rating);
      
      const client = await User.findById(proposal.job.client);
      await client.updateRating(proposal.workerFeedback.rating);
    }
    
    res.json({
      message: 'Feedback berhasil ditambahkan',
      feedback: type === 'client' ? proposal.clientFeedback : proposal.workerFeedback
    });
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};