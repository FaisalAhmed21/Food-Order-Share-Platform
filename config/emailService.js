const nodemailer = require('nodemailer');

// Create transporter for sending emails
// For Gmail: You need to generate an App Password (not your regular password)
// Instructions: https://support.google.com/accounts/answer/185833

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

// Function to send password reset email
const sendResetEmail = async (email, resetToken, userName) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: email,
    subject: 'Password Reset Request - FoodShare',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Password Reset Request</h2>
        <p>Hello ${userName || 'User'},</p>
        <p>You requested a password reset for your FoodShare account. Click the button below to reset your password:</p>
        <p style="margin: 20px 0;">
          <a href="${resetLink}" style="
            background-color: #667eea;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
          ">Reset Password</a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetLink}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin-top: 20px;">
        <p style="color: #999; font-size: 12px;">FoodShare - Food Order and Share Platform</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Reset email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, message: 'Failed to send reset email', error: error.message };
  }
};

module.exports = { sendResetEmail };