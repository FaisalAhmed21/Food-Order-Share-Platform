const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const NGOProfile = require('../models/NGOProfile');
const { auth } = require('../middleware/auth');
const upload = require('../config/multer');
const multer = require('multer');

// Helper to create JWT
const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production', { expiresIn: '7d' });
};

// Partner registration endpoint (Restaurant or NGO)
router.post('/register', upload.fields([{ name: 'restaurantLogo', maxCount: 1 }, { name: 'ngoLogo', maxCount: 1 }]), async (req, res) => {
  try {
    const { email, password, name, role, organizationName, phone, address, location } = req.body;

    if (!email || !password || !role || !organizationName) {
      return res.status(400).json({ success: false, message: 'email, password, role and organizationName are required' });
    }

    const normalizedRole = role.toLowerCase();
    if (!['restaurant', 'ngo'].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'role must be either "restaurant" or "ngo"' });
    }

    // Check existing
    let existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Create user
    const user = new User({
      email,
      password,
      name: name || organizationName,
      phone: phone || '',
      authProvider: 'local',
      role: normalizedRole === 'restaurant' ? 'Restaurant' : 'NGO',
      organizationName
    });

    await user.save();

    // Create corresponding profile
    if (normalizedRole === 'restaurant') {
      const logoFile = req.files && req.files['restaurantLogo'] ? req.files['restaurantLogo'][0] : null;
      const logoUrl = logoFile ? fileUrlFromFile(logoFile) : '/uploads/partners/logos/default-restaurant.jpg';
      
      const restaurant = new Restaurant({
        name: organizationName,
        owner: user._id,
        cuisine: ['General'],
        description: 'Pending verification',
        image: logoUrl,
        address: address || { fullAddress: 'To be provided' },
        location: location || restaurantDefaultLocation(),
        isVerified: false,
        deliveryTime: 30,
        deliveryFee: 50
      });
      await restaurant.save();
    } else {
      const logoFile = req.files && req.files['ngoLogo'] ? req.files['ngoLogo'][0] : null;
      const logoUrl = logoFile ? fileUrlFromFile(logoFile) : '/uploads/partners/logos/default-ngo.jpg';
      
      const ngoProfile = new NGOProfile({
        user: user._id,
        ngoName: organizationName,
        address: address || {},
        location: location || ngoDefaultLocation(),
        isVerified: false
      });
      
      // Store logo in verificationDocuments or add a logo field if needed
      if (logoUrl) {
        ngoProfile.verificationDocuments = ngoProfile.verificationDocuments || [];
        ngoProfile.verificationDocuments.push({ type: 'logo', url: logoUrl, uploadedAt: new Date() });
      }
      
      await ngoProfile.save();
    }

    const token = createToken(user._id);

    res.status(201).json({ success: true, message: 'Partner registered. Pending manual verification by admin.', token, user: { _id: user._id, email: user.email, role: user.role, organizationName: user.organizationName } });
  } catch (error) {
    console.error('Partner registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to register partner', error: error.message });
  }
});

// Upload verification documents (authenticated partners)
router.post('/:type/upload-docs', auth, upload.array('documents', 6), async (req, res) => {
  try {
    const type = (req.params.type || '').toLowerCase();
    if (!['restaurant', 'ngo'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be restaurant or ngo' });
    }

    // Only allow matching roles
    const userRole = (req.user.role || '').toLowerCase();
    if (type === 'restaurant' && userRole !== 'restaurant' && userRole !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only restaurant users can upload restaurant documents' });
    }
    if (type === 'ngo' && userRole !== 'ngo') {
      return res.status(403).json({ success: false, message: 'Only NGO users can upload NGO documents' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No documents uploaded' });
    }

    const savedDocs = files.map(f => ({ type: f.mimetype, url: fileUrlFromFile(f), uploadedAt: new Date() }));

    if (type === 'ngo') {
      let profile = await NGOProfile.findOne({ user: req.user._id });
      if (!profile) {
        // create minimal profile if missing
        profile = new NGOProfile({ user: req.user._id, ngoName: req.user.organizationName || req.user.name || 'Unnamed NGO', location: ngoDefaultLocation(), isVerified: false });
      }
      profile.verificationDocuments = profile.verificationDocuments.concat(savedDocs);
      profile.isVerified = false; // Ensure still pending
      await profile.save();

      return res.json({ success: true, message: 'Documents uploaded. Verification pending.', documents: profile.verificationDocuments });
    }

    // restaurant
    let restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      // create minimal restaurant if missing
      restaurant = new Restaurant({ name: req.user.organizationName || req.user.name || 'Unnamed Restaurant', owner: req.user._id, location: restaurantDefaultLocation(), isVerified: false });
    }

    restaurant.verificationDocuments = (restaurant.verificationDocuments || []).concat(savedDocs);
    restaurant.isVerified = false;
    await restaurant.save();

    return res.json({ success: true, message: 'Documents uploaded. Verification pending.', documents: restaurant.verificationDocuments });
  } catch (error) {
    console.error('Upload docs error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload documents', error: error.message });
  }
});

// Get current verification status for logged-in partner
router.get('/status', auth, async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (role === 'ngo') {
      const profile = await NGOProfile.findOne({ user: req.user._id }).select('isVerified verificationDocuments verifiedAt verifiedBy ngoName');
      if (!profile) return res.status(404).json({ success: false, message: 'NGO profile not found' });
      return res.json({ success: true, type: 'ngo', profile });
    }

    if (role === 'restaurant' || role === 'owner') {
      const restaurant = await Restaurant.findOne({ owner: req.user._id }).select('isVerified verificationDocuments name');
      if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
      return res.json({ success: true, type: 'restaurant', restaurant });
    }

    return res.status(400).json({ success: false, message: 'User is not a partner' });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch status', error: error.message });
  }
});

// Helpers
function fileUrlFromFile(file) {
  // If Cloudinary used, file.path may be a full URL. If local storage, expose via /uploads
  if (!file) return '';
  if (file.path && file.path.startsWith('http')) return file.path;
  // multer local storage: file.filename and destination
  if (file.filename) {
    const relative = file.destination ? file.destination.split('uploads')[1] : '';
    // Normalize backslashes for windows
    const cleaned = (relative || '') + '/' + file.filename;
    const urlPath = cleaned.replace(/\\/g, '/').replace(/^\//, '');
    return `/uploads/${urlPath}`;
  }
  return file.filename || file.path || '';
}

function restaurantDefaultLocation() {
  return { type: 'Point', coordinates: [90.4125, 23.8103] };
}

function ngoDefaultLocation() {
  return { type: 'Point', coordinates: [90.4125, 23.8103] };
}

module.exports = router;
