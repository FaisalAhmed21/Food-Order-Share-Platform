const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token, access denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if this is the hardcoded admin
    if (decoded.userId === 'admin_hardcoded_id') {
      req.user = {
        _id: 'admin_hardcoded_id',
        id: 'admin_hardcoded_id',
        email: 'admin@gmail.com',
        name: 'System Administrator',
        role: 'Admin',
        isAdmin: true
      };
      req.userId = 'admin_hardcoded_id';
      return next();
    }
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Add user to request
    req.user = user;
    req.userId = user._id;
    
    // Debug logging for NGO campaign creation
    if (req.path.includes('/campaign') || req.path.includes('/ngo')) {
      console.log('Auth middleware - User ID:', user._id);
      console.log('Auth middleware - User role:', user.role);
      console.log('Auth middleware - User email:', user.email);
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token is not valid' 
    });
  }
};

// Check if user is restaurant owner
const isOwner = async (req, res, next) => {
  const role = req.user.role.toLowerCase();
  if (role !== 'owner' && role !== 'restaurant' && role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Restaurant owner privileges required.'
    });
  }
  next();
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

module.exports = { auth, isOwner, isAdmin };
