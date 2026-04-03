const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Send email function
exports.sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const mailOptions = {
      from: `"Freelance App Indonesia" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
        .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Selamat Datang di Freelance App Indonesia!</h1>
        </div>
        <div class="content">
          <p>Halo ${user.name},</p>
          <p>Selamat bergabung dengan platform freelance terbaik di Indonesia.</p>
          <p>Anda telah terdaftar sebagai <strong>${user.role === 'worker' ? 'Worker (Pencari Kerja)' : 'Client (Pencari Jasa)'}</strong>.</p>
          <p>Berikut adalah beberapa langkah untuk memulai:</p>
          <ul>
            <li>Lengkapi profil Anda dengan informasi yang detail</li>
            <li>${user.role === 'worker' ? 'Tambahkan portfolio dan skills Anda' : 'Mulai posting pekerjaan yang Anda butuhkan'}</li>
            <li>Jelajahi dan mulai berinteraksi dengan komunitas freelance</li>
          </ul>
          <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi tim support kami.</p>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Mulai Sekarang</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Freelance App Indonesia. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await exports.sendEmail(user.email, 'Selamat Datang di Freelance App Indonesia', html);
};

// Send proposal accepted email
exports.sendProposalAcceptedEmail = async (worker, job, proposal, instructions) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #48bb78; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .job-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Selamat! Proposal Anda Diterima</h1>
        </div>
        <div class="content">
          <p>Halo ${worker.name},</p>
          <p>Proposal Anda untuk pekerjaan <strong>"${job.title}"</strong> telah diterima.</p>
          
          <div class="job-details">
            <h3>Detail Pekerjaan:</h3>
            <p><strong>Judul:</strong> ${job.title}</p>
            <p><strong>Deskripsi:</strong> ${job.description}</p>
            <p><strong>Budget:</strong> Rp ${proposal.proposedAmount.toLocaleString()}</p>
            <p><strong>Estimasi Waktu:</strong> ${proposal.estimatedDays} hari</p>
            <p><strong>Kategori:</strong> ${job.category}</p>
            <p><strong>Skills yang dibutuhkan:</strong> ${job.skills.join(', ')}</p>
          </div>
          
          <div class="job-details">
            <h3>Instruksi Pengerjaan:</h3>
            <p>${instructions || 'Silakan mulai mengerjakan sesuai dengan deskripsi yang telah disepakati.'}</p>
          </div>
          
          <h3>Catatan Penting:</h3>
          <ul>
            <li>Komunikasi dengan client dapat dilakukan melalui fitur chat di aplikasi</li>
            <li>Update progress pekerjaan secara berkala</li>
            <li>Pastikan untuk menyelesaikan pekerjaan sesuai deadline yang telah disepakati</li>
          </ul>
          
          <p>Anda dapat melihat detail pekerjaan dan mulai mengerjakan di aplikasi.</p>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" class="button" style="display: inline-block; padding: 10px 20px; background: #48bb78; color: white; text-decoration: none; border-radius: 5px;">Lihat Pekerjaan</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Freelance App Indonesia. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await exports.sendEmail(worker.email, `Proposal Diterima - ${job.title}`, html);
};

// Send payment confirmation email
exports.sendPaymentConfirmationEmail = async (user, job, amount, type = 'client') => {
  const isClient = type === 'client';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4299e1; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isClient ? 'Pembayaran Berhasil' : 'Pembayaran Diterima'}</h1>
        </div>
        <div class="content">
          <p>Halo ${user.name},</p>
          ${isClient ? `
            <p>Pembayaran Anda untuk pekerjaan <strong>"${job.title}"</strong> telah berhasil diproses.</p>
            <p><strong>Jumlah:</strong> Rp ${amount.toLocaleString()}</p>
            <p>Dana akan ditahan oleh sistem hingga pekerjaan selesai. Setelah pekerjaan selesai, Anda dapat merilis pembayaran kepada worker.</p>
          ` : `
            <p>Pembayaran untuk pekerjaan <strong>"${job.title}"</strong> telah diterima oleh sistem.</p>
            <p><strong>Jumlah:</strong> Rp ${amount.toLocaleString()}</p>
            <p>Silakan mulai mengerjakan pekerjaan sesuai dengan kesepakatan. Pastikan untuk mengupdate progress pekerjaan secara berkala.</p>
          `}
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" style="display: inline-block; padding: 10px 20px; background: #4299e1; color: white; text-decoration: none; border-radius: 5px;">Lihat Detail</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Freelance App Indonesia. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await exports.sendEmail(user.email, `Pembayaran ${isClient ? 'Berhasil' : 'Diterima'} - ${job.title}`, html);
};

// Send job completion email
exports.sendJobCompletionEmail = async (client, worker, job) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #9f7aea; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Pekerjaan Selesai!</h1>
        </div>
        <div class="content">
          <p>Halo ${client.name},</p>
          <p>Pekerjaan <strong>"${job.title}"</strong> telah ditandai selesai oleh ${worker.name}.</p>
          <p>Silakan review hasil pekerjaan dan lakukan pembayaran jika sudah sesuai.</p>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" style="display: inline-block; padding: 10px 20px; background: #9f7aea; color: white; text-decoration: none; border-radius: 5px;">Review Pekerjaan</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Freelance App Indonesia. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;
  
  return await exports.sendEmail(client.email, `Pekerjaan Selesai - ${job.title}`, html);
};

// Send payment released email
exports.sendPaymentReleasedEmail = async (worker, job, amount) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #48bb78; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Pembayaran Telah Dirilis!</h1>
        </div>
        <div class="content">
          <p>Halo ${worker.name},</p>
          <p>Pembayaran untuk pekerjaan <strong>"${job.title}"</strong> telah dirilis oleh client.</p>
          <p><strong>Jumlah:</strong> Rp ${amount.toLocaleString()}</p>
          <p>Dana akan segera ditransfer ke rekening Anda dalam 1-3 hari kerja.</p>
          <p>Terima kasih telah bekerja sama dengan kami!</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Freelance App Indonesia. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;
  
  return await exports.sendEmail(worker.email, `Pembayaran Dirilis - ${job.title}`, html);
};

// Send new proposal email to client
exports.sendNewProposalEmail = async (client, job, worker, proposal) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ed8936; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .proposal-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Proposal Baru untuk Pekerjaan Anda</h1>
        </div>
        <div class="content">
          <p>Halo ${client.name},</p>
          <p>Anda menerima proposal baru untuk pekerjaan <strong>"${job.title}"</strong> dari ${worker.name}.</p>
          
          <div class="proposal-details">
            <h3>Detail Proposal:</h3>
            <p><strong>Jumlah yang ditawarkan:</strong> Rp ${proposal.proposedAmount.toLocaleString()}</p>
            <p><strong>Estimasi pengerjaan:</strong> ${proposal.estimatedDays} hari</p>
            <p><strong>Cover Letter:</strong></p>
            <p>${proposal.coverLetter}</p>
          </div>
          
          <p>Silakan login ke aplikasi untuk melihat detail proposal dan memutuskan apakah akan menerima atau menolak.</p>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/jobs/${job._id}/proposals" style="display: inline-block; padding: 10px 20px; background: #ed8936; color: white; text-decoration: none; border-radius: 5px;">Lihat Proposal</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Freelance App Indonesia. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;
  
  return await exports.sendEmail(client.email, `Proposal Baru - ${job.title}`, html);
};

// Send forgot password email
exports.sendForgotPasswordEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f56565; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Password</h1>
        </div>
        <div class="content">
          <p>Halo ${user.name},</p>
          <p>Anda meminta untuk mereset password akun Anda.</p>
          <p>Klik link di bawah ini untuk mereset password Anda:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #f56565; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </p>
          <p>Link ini akan kadaluarsa dalam 1 jam.</p>
          <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Freelance App Indonesia. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;
  
  return await exports.sendEmail(user.email, 'Reset Password - Freelance App', html);
};