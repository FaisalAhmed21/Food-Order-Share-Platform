const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const NGOProfile = require('../models/NGOProfile');
const User = require('../models/User');

// Create or update NGO profile
router.post('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'NGO') {
      return res.status(403).json({
        success: false,
        message: 'Only NGO users can create NGO profiles'
      });
    }
    
    const {
      ngoName,
      registrationNumber,
      location,
      address,
      operatingHours,
      acceptedItems,
      serviceRadius,
      contactPhone,
      contactEmail,
      contactPerson,
      description,
      facilities
    } = req.body;
    
    // Check if profile exists
    let ngoProfile = await NGOProfile.findOne({ user: req.user.id });
    
    if (ngoProfile) {
      // Update existing profile
      Object.assign(ngoProfile, {
        ngoName,
        registrationNumber,
        location,
        address,
        operatingHours,
        acceptedItems,
        serviceRadius,
        contactPhone,
        contactEmail,
        contactPerson,
        description,
        facilities
      });
    } else {
      // Create new profile
      ngoProfile = new NGOProfile({
        user: req.user.id,
        ngoName,
        registrationNumber,
        location,
        address,
        operatingHours,
        acceptedItems,
        serviceRadius,
        contactPhone,
        contactEmail,
        contactPerson,
        description,
        facilities
      });
    }
    
    await ngoProfile.save();

    res.json({
      success: true,
      message: 'NGO profile saved successfully',
      profile: ngoProfile
    });
  } catch (error) {
    console.error('Error saving NGO profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save NGO profile',
      error: error.message
    });
  }
});

// Get NGO profile
router.get('/profile', auth, async (req, res) => {
  try {
    const ngoProfile = await NGOProfile.findOne({ user: req.user.id }).populate('user', 'name email');
    
    if (!ngoProfile) {
      return res.status(404).json({
        success: false,
        message: 'NGO profile not found'
      });
    }

    res.json({
      success: true,
      profile: ngoProfile
    });
  } catch (error) {
    console.error('Error fetching NGO profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NGO profile'
    });
  }
});

// Get all nearby NGOs (public route with auth)
router.get('/nearby', auth, async (req, res) => {
  try {
    const { lat, lng, maxDistance = 20, foodType } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    let query = {
      isPubliclyVisible: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(maxDistance) * 1000 // Convert km to meters
        }
      }
    };
    
    const ngos = await NGOProfile.find(query).populate('user', 'name email phone');
    
    // Filter by food type if specified
    let filteredNGOs = ngos;
    if (foodType) {
      filteredNGOs = ngos.filter(ngo => ngo.acceptsFoodType(foodType));
    }
    
    // Map to simplified response
    const result = filteredNGOs.map(ngo => ({
      _id: ngo._id,
      ngoName: ngo.ngoName,
      isVerified: ngo.isVerified,
      acceptedItems: ngo.acceptedItems,
      serviceRadius: ngo.serviceRadius,
      operatingHours: ngo.operatingHours,
      currentCapacity: ngo.currentCapacity,
      isAcceptingItems: ngo.canAcceptItems(),
      location: ngo.location,
      address: ngo.address,
      contactPhone: ngo.contactPhone,
      stats: {
        trustScore: ngo.stats.trustScore,
        totalPickups: ngo.stats.totalPickups,
        successRate: ngo.stats.totalPickups > 0 
          ? Math.round((ngo.stats.successfulPickups / ngo.stats.totalPickups) * 100) 
          : 100
      },
      distance: calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        ngo.location.coordinates[1],
        ngo.location.coordinates[0]
      )
    }));

    res.json({
      success: true,
      count: result.length,
      ngos: result
    });
  } catch (error) {
    console.error('Error fetching nearby NGOs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby NGOs',
      error: error.message
    });
  }
});

// Debug route to check all NGO users in database
router.get('/debug-all-profiles', auth, async (req, res) => {
  try {
    const allNGOUsers = await User.find({ role: { $in: ['NGO', 'ngo'] } });
    console.log('🔍 DEBUG: Total NGO Users in DB:', allNGOUsers.length);
    
    const userDetails = allNGOUsers.map(user => ({
      _id: user._id,
      name: user.name,
      organizationName: user.organizationName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt
    }));
    
    console.log('🔍 DEBUG: NGO User Details:', JSON.stringify(userDetails, null, 2));
    
    res.json({
      success: true,
      count: allNGOUsers.length,
      users: userDetails
    });
  } catch (error) {
    console.error('Error in debug route:', error);
    res.status(500).json({
      success: false,
      message: 'Debug query failed',
      error: error.message
    });
  }
});

// Get all NGOs (for donation selection) - Fetch from User model
router.get('/all-ngos', auth, async (req, res) => {
  try {
    // Fetch all users with role 'NGO' or 'ngo' from the User collection
    const ngos = await User.find({ 
      role: { $in: ['NGO', 'ngo'] } 
    })
      .select('_id name email organizationName phone createdAt')
      .sort({ organizationName: 1, name: 1 });
    
    console.log('📋 Fetched NGOs from User model:', ngos.length);
    console.log('📋 NGO Details:', ngos.map(ngo => ({
      id: ngo._id,
      name: ngo.name,
      organizationName: ngo.organizationName,
      email: ngo.email
    })));
    
    // Format response to match frontend expectations
    const formattedNgos = ngos.map(ngo => ({
      _id: ngo._id,
      ngoName: ngo.organizationName || ngo.name,
      organizationName: ngo.organizationName,
      name: ngo.name,
      email: ngo.email,
      phone: ngo.phone,
      isVerified: false // Can add verification logic later if needed
    }));
    
    res.json({
      success: true,
      count: formattedNgos.length,
      ngos: formattedNgos
    });
  } catch (error) {
    console.error('Error fetching all NGOs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NGOs',
      error: error.message
    });
  }
});

// Get NGO donations (orders with donations to this NGO)
router.get('/my-donations', auth, async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    // Check if user is an NGO
    const user = await User.findById(req.user.id);
    if (!user || (user.role !== 'NGO' && user.role !== 'ngo')) {
      return res.status(403).json({
        success: false,
        message: 'Only NGO users can access donations'
      });
    }
    
    // Find all orders with donations to this NGO (using User._id directly)
    const donations = await Order.find({
      'donation.ngo': req.user.id,
      'donation.amount': { $gt: 0 }
    })
    .populate('customer', 'name email phone')
    .populate('restaurant', 'name address')
    .populate('donation.ngo', 'name organizationName email')
    .sort({ createdAt: -1 })
    .limit(100);
    
    // Calculate total donations
    const totalDonations = donations.reduce((sum, order) => sum + (order.donation.amount || 0), 0);
    
    console.log(`💝 NGO ${user.organizationName || user.name} has ${donations.length} donations totaling ৳${totalDonations}`);
    
    res.json({
      success: true,
      donations: donations,
      totalDonations: totalDonations,
      count: donations.length
    });
  } catch (error) {
    console.error('Error fetching NGO donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations'
    });
  }
});

// Update capacity status
router.patch('/capacity', auth, async (req, res) => {
  try {
    const { currentCapacity, isAcceptingItems, temporarilyFullUntil } = req.body;
    
    const ngoProfile = await NGOProfile.findOne({ user: req.user.id });
    
    if (!ngoProfile) {
      return res.status(404).json({
        success: false,
        message: 'NGO profile not found'
      });
    }
    
    if (currentCapacity) {
      ngoProfile.currentCapacity = currentCapacity;
    }
    
    if (typeof isAcceptingItems === 'boolean') {
      ngoProfile.isAcceptingItems = isAcceptingItems;
    }
    
    if (temporarilyFullUntil) {
      ngoProfile.temporarilyFullUntil = new Date(temporarilyFullUntil);
    }
    
    await ngoProfile.save();

    res.json({
      success: true,
      message: 'Capacity status updated',
      profile: ngoProfile
    });
  } catch (error) {
    console.error('Error updating capacity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update capacity'
    });
  }
});

// Request pickup from NGO (for customers/restaurants)
router.post('/:ngoId/request-pickup', auth, async (req, res) => {
  try {
    const { donationId } = req.body;
    
    const ngoProfile = await NGOProfile.findById(req.params.ngoId);
    
    if (!ngoProfile) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
    }
    
    if (!ngoProfile.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'This NGO is not verified yet'
      });
    }
    
    if (!ngoProfile.canAcceptItems()) {
      return res.status(400).json({
        success: false,
        message: 'This NGO is not accepting items right now'
      });
    }
    
    // TODO: Create notification for NGO
    // TODO: Link with donation if donationId provided
    
    res.json({
      success: true,
      message: 'Pickup request sent to NGO',
      ngo: {
        name: ngoProfile.ngoName,
        phone: ngoProfile.contactPhone
      }
    });
  } catch (error) {
    console.error('Error requesting pickup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request pickup'
    });
  }
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return parseFloat((R * c).toFixed(2)); // Distance in km
}

module.exports = router;
