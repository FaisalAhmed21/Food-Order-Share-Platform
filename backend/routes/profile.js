const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = require('../config/multer');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Get user profile
router.get('/get', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone || '',
        profilePicture: user.profilePicture || '',
        role: user.role,
        organizationName: user.organizationName || '',
        documents: user.documents || '',
        verificationMark: user.verificationMark || false
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
  }
});

// Update user profile with file uploads
router.post('/update', verifyToken, upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'documents', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, email, phone, organizationName } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update basic fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (organizationName && (user.role === 'Restaurant' || user.role === 'NGO')) {
      user.organizationName = organizationName;
    }

    // Handle file uploads with multer
    if (req.files) {
      // Profile picture for all roles
      if (req.files.profilePicture && req.files.profilePicture.length > 0) {
        user.profilePicture = `/uploads/${req.files.profilePicture[0].filename}`;
      }
      // Documents for Restaurant and NGO only
      if (req.files.documents && req.files.documents.length > 0) {
        if (user.role === 'Restaurant' || user.role === 'NGO') {
          user.documents = `/uploads/${req.files.documents[0].filename}`;
        }
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone || '',
        profilePicture: user.profilePicture || '',
        role: user.role,
        organizationName: user.organizationName || '',
        documents: user.documents || '',
        verificationMark: user.verificationMark || false
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating profile', 
      error: error.message 
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File size too large (max 5MB)' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${error.message}` });
  } else if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next();
});

module.exports = router;