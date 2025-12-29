const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Campaign = require('../models/Campaign');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  // Check for hardcoded admin
  if (req.user.id === 'admin_hardcoded_id') {
    return next();
  }

  // Check if user has admin role
  User.findById(req.user.id)
    .then(user => {
      if (user && user.role === 'Admin') {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
      }
    })
    .catch(err => {
      res.status(500).json({ success: false, message: 'Error verifying admin status' });
    });
};

// Delete restaurant (Admin only)
router.delete('/restaurants/:id', auth, isAdmin, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Delete all menu items for this restaurant
    await MenuItem.deleteMany({ restaurant: req.params.id });

    // Delete the restaurant
    await Restaurant.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Restaurant and all associated menu items deleted successfully'
    });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ success: false, message: 'Error deleting restaurant' });
  }
});

// Delete menu item (Admin only)
router.delete('/menu-items/:id', auth, isAdmin, async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    await MenuItem.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ success: false, message: 'Error deleting menu item' });
  }
});

// Toggle restaurant verification (Admin only)
router.patch('/restaurants/:id/verify', auth, isAdmin, async (req, res) => {
  try {
    const { verificationMark } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { verificationMark },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Also update the owner's verification mark
    if (restaurant.owner) {
      await User.findByIdAndUpdate(restaurant.owner, { verificationMark });
    }

    res.json({
      success: true,
      message: `Restaurant ${verificationMark ? 'verified' : 'unverified'} successfully`,
      restaurant
    });
  } catch (error) {
    console.error('Update verification error:', error);
    res.status(500).json({ success: false, message: 'Error updating verification' });
  }
});

// Toggle NGO verification (Admin only)
router.patch('/ngos/:id/verify', auth, isAdmin, async (req, res) => {
  try {
    const { verificationMark } = req.body;

    const ngo = await User.findByIdAndUpdate(
      req.params.id,
      { verificationMark },
      { new: true }
    );

    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    if (ngo.role !== 'NGO' && ngo.role !== 'ngo') {
      return res.status(400).json({ success: false, message: 'User is not an NGO' });
    }

    res.json({
      success: true,
      message: `NGO ${verificationMark ? 'verified' : 'unverified'} successfully`,
      ngo
    });
  } catch (error) {
    console.error('Update NGO verification error:', error);
    res.status(500).json({ success: false, message: 'Error updating verification' });
  }
});

// Get all NGOs (Admin only)
router.get('/ngos', auth, isAdmin, async (req, res) => {
  try {
    const ngos = await User.find({ role: { $in: ['NGO', 'ngo'] } })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: ngos.length,
      ngos
    });
  } catch (error) {
    console.error('Get NGOs error:', error);
    res.status(500).json({ success: false, message: 'Error fetching NGOs' });
  }
});

// Get all restaurants with owners (Admin only)
router.get('/restaurants', auth, isAdmin, async (req, res) => {
  try {
    // Only get restaurants that have an owner (properly created by restaurant users)
    const restaurants = await Restaurant.find({ owner: { $exists: true, $ne: null } })
      .populate('owner', 'name email role verificationMark')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: restaurants.length,
      restaurants
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ success: false, message: 'Error fetching restaurants' });
  }
});

// Delete NGO (Admin only)
router.delete('/ngos/:id', auth, isAdmin, async (req, res) => {
  try {
    const ngo = await User.findById(req.params.id);

    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    if (ngo.role !== 'NGO' && ngo.role !== 'ngo') {
      return res.status(400).json({ success: false, message: 'User is not an NGO' });
    }

    // Delete the NGO user account
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'NGO deleted successfully'
    });
  } catch (error) {
    console.error('Delete NGO error:', error);
    res.status(500).json({ success: false, message: 'Error deleting NGO' });
  }
});

// Delete campaign (Admin only)
router.delete('/campaigns/:id', auth, isAdmin, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Delete the campaign
    await Campaign.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, message: 'Error deleting campaign' });
  }
});

module.exports = router;
