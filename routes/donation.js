const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get donation statistics for a restaurant
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'Restaurant') {
      return res.status(403).json({ message: 'Only restaurants can access this endpoint' });
    }

    const donations = await Donation.find({ restaurant: req.userId });

    // Calculate statistics
    const totalDonations = donations.length;
    const completedDonations = donations.filter(d => d.status === 'completed');
    const totalMealsServed = completedDonations.reduce((sum, d) => sum + d.mealsServed, 0);
    const totalBeneficiaries = completedDonations.reduce((sum, d) => sum + d.beneficiaries, 0);
    
    // Get unique NGOs served
    const uniqueNGOs = new Set(
      completedDonations
        .filter(d => d.claimedBy)
        .map(d => d.claimedBy.toString())
    );
    const ngoCount = uniqueNGOs.size;

    // Calculate by status
    const statusCounts = {
      available: donations.filter(d => d.status === 'available').length,
      claimed: donations.filter(d => d.status === 'claimed').length,
      'picked-up': donations.filter(d => d.status === 'picked-up').length,
      completed: completedDonations.length,
      expired: donations.filter(d => d.status === 'expired').length
    };

    // Calculate monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    completedDonations.forEach(donation => {
      if (donation.completedAt >= sixMonthsAgo) {
        const month = months[donation.completedAt.getMonth()];
        const year = donation.completedAt.getFullYear();
        const key = `${month} ${year}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = { meals: 0, count: 0 };
        }
        monthlyData[key].meals += donation.mealsServed;
        monthlyData[key].count += 1;
      }
    });

    res.json({
      success: true,
      stats: {
        totalDonations,
        totalMealsServed,
        totalBeneficiaries,
        ngoCount,
        statusCounts,
        monthlyData
      }
    });
  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all donations for a restaurant
router.get('/my-donations', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'Restaurant') {
      return res.status(403).json({ message: 'Only restaurants can access this endpoint' });
    }

    const donations = await Donation.find({ restaurant: req.userId })
      .populate('claimedBy', 'name organizationName')
      .sort({ createdAt: -1 });

    res.json({ success: true, donations });
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new donation
router.post('/create', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'Restaurant') {
      return res.status(403).json({ message: 'Only restaurants can create donations' });
    }

    const { foodType, quantity, unit, description, pickupAddress, expiryTime } = req.body;

    if (!foodType || !quantity || !pickupAddress || !expiryTime) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const user = await User.findById(req.userId);
    
    const donation = new Donation({
      restaurant: req.userId,
      restaurantName: user.organizationName || user.name,
      foodType,
      quantity,
      unit: unit || 'servings',
      description,
      pickupAddress,
      expiryTime: new Date(expiryTime)
    });

    await donation.save();

    res.status(201).json({ 
      success: true, 
      message: 'Donation created successfully',
      donation 
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update donation status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const donation = await Donation.findById(id);
    
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Check if user owns this donation
    if (req.userRole === 'Restaurant' && donation.restaurant.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this donation' });
    }

    donation.status = status;
    
    if (status === 'completed') {
      donation.completedAt = new Date();
    }

    await donation.save();

    res.json({ 
      success: true, 
      message: 'Donation status updated',
      donation 
    });
  } catch (error) {
    console.error('Error updating donation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available donations for NGOs
router.get('/available', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can access this endpoint' });
    }

    const donations = await Donation.find({ 
      status: 'available',
      expiryTime: { $gt: new Date() }
    })
    .populate('restaurant', 'name organizationName')
    .sort({ createdAt: -1 });

    res.json({ success: true, donations });
  } catch (error) {
    console.error('Error fetching available donations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Claim a donation (for NGOs)
router.patch('/:id/claim', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can claim donations' });
    }

    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'available') {
      return res.status(400).json({ message: 'Donation is not available' });
    }

    const user = await User.findById(req.userId);

    donation.status = 'claimed';
    donation.claimedBy = req.userId;
    donation.claimedByName = user.organizationName || user.name;
    donation.claimedAt = new Date();

    await donation.save();

    res.json({ 
      success: true, 
      message: 'Donation claimed successfully',
      donation 
    });
  } catch (error) {
    console.error('Error claiming donation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get claimed donations for NGO
router.get('/my-claimed', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can access this endpoint' });
    }

    const donations = await Donation.find({ claimedBy: req.userId })
      .populate('restaurant', 'name organizationName phone')
      .sort({ claimedAt: -1 });

    res.json({ success: true, donations });
  } catch (error) {
    console.error('Error fetching claimed donations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add acknowledgement to a donation
router.patch('/:id/acknowledge', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can add acknowledgements' });
    }

    const { mealsServed, beneficiaries, photo, note } = req.body;
    
    const donation = await Donation.findOne({
      _id: req.params.id,
      claimedBy: req.userId
    }).populate('restaurant', 'name organizationName email');
    
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    donation.status = 'completed';
    donation.completedAt = new Date();
    donation.mealsServed = mealsServed || 0;
    donation.beneficiaries = beneficiaries || 0;
    donation.acknowledgement = {
      photo: photo || '',
      note: note || '',
      addedAt: new Date()
    };

    await donation.save();

    res.json({ 
      success: true, 
      message: 'Acknowledgement added successfully. Restaurant has been notified.',
      donation 
    });
  } catch (error) {
    console.error('Error adding acknowledgement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
