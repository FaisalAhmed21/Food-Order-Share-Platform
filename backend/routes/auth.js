const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const User = require('../models/User');
const { sendResetEmail } = require('../config/emailService');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production',
    { expiresIn: '7d' }
  );
};

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Create user
    user = new User({
      email,
      password,
      name: name || '',
      authProvider: 'local',
      role: role || 'Customer'
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data without password
    const userResponse = {
      _id: user._id,
      email: user.email,
      name: user.name,
      authProvider: user.authProvider,
      role: user.role,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Match password
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Return user data without password
    const userResponse = {
      _id: user._id,
      email: user.email,
      name: user.name,
      authProvider: user.authProvider,
      profilePicture: user.profilePicture,
      role: user.role,
      createdAt: user.createdAt
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

// Google OAuth Token Verification Route
router.post('/google/verify', async (req, res) => {
  try {
    // Handle both 'credential' and 'token' field names
    const credential = req.body.credential || req.body.token;
    
    if (!credential) {
      return res.status(400).json({ success: false, message: "Missing Google credential" });
    }

    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check by email
      user = await User.findOne({ email });

      if (user) {
        user.googleId = googleId;
        user.authProvider = "google";
        if (!user.profilePicture) user.profilePicture = picture;
        await user.save();
      } else {
        // Create new user with default role 'Customer'
        user = await User.create({
          googleId,
          email,
          name,
          profilePicture: picture,
          authProvider: "google",
          role: "Customer" // Default role
        });
      }
    }

    // Allow role selection for existing users
    if (!user.role) {
      user.role = "Customer"; // Default role if not set
      await user.save();
    }

    // Create JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Google Login Successful",
      token,
      user
    });

  } catch (err) {
    console.error("Google login error:", err);
    return res.status(500).json({ success: false, message: "Google login failed", error: err.message });
  }
});

// Forgot Password - Send reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({ 
        success: true, 
        message: 'If this email exists, a password reset link has been sent' 
      });
    }

    // Check if user is a Google OAuth user
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Password reset is not available for Google OAuth accounts. Please use Google Sign-in instead.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token expiry to 1 hour
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save token and expiry to database
    user.resetToken = resetTokenHash;
    user.resetTokenExpiry = tokenExpiry;
    await user.save();

    // Send email
    const emailResult = await sendResetEmail(user.email, resetToken, user.name);

    if (emailResult.success) {
      res.status(200).json({
        success: true,
        message: 'Password reset link has been sent to your email'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send reset email',
        error: emailResult.error
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password request',
      error: error.message
    });
  }
});

// Reset Password - Verify token and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validation
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and new password are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching reset token and valid expiry
    const user = await User.findOne({
      resetToken: resetTokenHash,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Update password
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
});

module.exports = router;
