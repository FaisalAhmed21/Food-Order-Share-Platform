const express = require('express');
const router = express.Router();
const FoodDonation = require('../models/FoodDonation');
const { auth } = require('../middleware/auth');
const { assignDeliveryPerson } = require('../library/deliveryService');

// Create a new food donation (from donate food form)
router.post('/create', auth, async (req, res) => {
  try {
    const {
      ngoId,
      items,
      restaurant,
      pricing,
      pickupAddress,
      deliveryAddress,
      donorPhone,
      ngoPhone,
      specialInstructions
    } = req.body;

    // Fetch NGO details
    const User = require('../models/User');
    const ngo = await User.findById(ngoId);
    if (!ngo || (ngo.role !== 'NGO' && ngo.role !== 'ngo')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid NGO selected'
      });
    }

    // Determine donor type
    const userDataStr = req.user;
    let donorType = 'customer';
    if (userDataStr.role && (userDataStr.role.toLowerCase() === 'restaurant')) {
      donorType = 'restaurant';
    }

    // Create donation
    const donation = new FoodDonation({
      donor: req.user._id,
      donorType,
      ngo: ngoId,
      ngoName: ngo.organizationName || ngo.name,
      items,
      restaurant,
      pricing,
      pickupAddress,
      deliveryAddress,
      donorPhone,
      ngoPhone,
      specialInstructions,
      status: 'pending',
      currentStage: 'Moving for Pickup',
      statusTimestamps: {
        pending: new Date()
      }
    });

    await donation.save();

    res.json({
      success: true,
      message: 'Food donation created successfully',
      donation: donation
    });
  } catch (error) {
    console.error('Error creating food donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create donation',
      error: error.message
    });
  }
});

// Confirm payment and start donation process
router.post('/confirm-payment/:donationId', auth, async (req, res) => {
  try {
    const { donationId } = req.params;
    const { paymentIntentId } = req.body;

    const donation = await FoodDonation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Update payment status
    donation.payment.status = 'paid';
    donation.payment.paidAt = new Date();
    donation.payment.transactionId = paymentIntentId;
    donation.status = 'confirmed';
    donation.currentStage = 'Moving for Pickup';
    donation.statusTimestamps.confirmed = new Date();

    await donation.save();

    // Start delivery person assignment
    const onAssignmentSuccess = (assignedDonation) => {
      setTimeout(() => {
        startDonationAutoProgression(assignedDonation._id);
      }, 1000);
    };

    const assignmentResult = await assignDeliveryPerson(
      donation._id,
      3,
      5,
      onAssignmentSuccess,
      'donation'
    );

    if (!assignmentResult.success) {
      donation.deliveryAssignmentStatus = 'failed';
      donation.deliveryAssignmentMessage = assignmentResult.message;
      donation.status = 'cancelled';
      donation.cancellationReason = 'Unable to assign delivery person';
      donation.statusTimestamps.cancelled = new Date();
      await donation.save();

      return res.json({
        success: false,
        message: 'Payment confirmed but delivery assignment failed',
        donation: donation
      });
    }

    res.json({
      success: true,
      message: 'Payment confirmed and delivery person assigned',
      donation: donation
    });
  } catch (error) {
    console.error('Error confirming donation payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
});

// Auto-progression function for donations (4 stages)
async function startDonationAutoProgression(donationId) {
  try {
    const STAGE_DURATION = 10 * 1000; // 10 seconds per stage
    const stages = [
      { name: 'Moving for Pickup', status: 'picking_up' },
      { name: 'Picked Up', status: 'picked_up' },
      { name: 'Moving to NGO', status: 'delivering' },
      { name: 'Reached', status: 'delivered' }
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const nextStage = stages[i + 1];

      // Wait for the stage duration
      await new Promise(resolve => setTimeout(resolve, STAGE_DURATION));

      // Update to next stage
      const donation = await FoodDonation.findById(donationId);
      if (!donation || donation.status === 'cancelled') {
        console.log(`Donation ${donationId} cancelled or not found, stopping progression`);
        return;
      }

      if (nextStage) {
        donation.currentStage = nextStage.name;
        donation.status = nextStage.status;
        donation.stageStartTime = new Date();
        donation.statusTimestamps[nextStage.status] = new Date();
        donation.statusHistory.push({
          status: nextStage.status,
          timestamp: new Date(),
          note: `Stage changed to ${nextStage.name}`
        });
      } else {
        // Final stage - mark as delivered
        donation.status = 'delivered';
        donation.completedAt = new Date();
        donation.statusTimestamps.delivered = new Date();
        donation.statusHistory.push({
          status: 'delivered',
          timestamp: new Date(),
          note: 'Donation delivered to NGO'
        });
      }

      await donation.save();
      console.log(`✅ Donation ${donationId} progressed to stage: ${donation.currentStage}`);
    }

    console.log(`🎉 Donation ${donationId} completed all stages`);
  } catch (error) {
    console.error(`Error in donation auto-progression for ${donationId}:`, error);
  }
}

// Get donation tracking details
router.get('/tracking/:donationId', auth, async (req, res) => {
  try {
    const { donationId } = req.params;

    const donation = await FoodDonation.findById(donationId)
      .populate('donor', 'name email phone role')
      .populate('ngo', 'name organizationName email phone')
      .populate('restaurant', 'name address phone')
      .populate({
        path: 'deliveryPerson',
        select: 'name phone profilePicture rating totalRatings totalDeliveries currentLocation vehicleType vehicleNumber user',
        populate: {
          path: 'user',
          select: '_id'
        }
      });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Check authorization
    const userId = req.user._id.toString();
    const donorId = donation.donor._id.toString();
    const ngoId = donation.ngo._id.toString();
    const deliveryPersonId = donation.deliveryPerson?._id?.toString();
    const deliveryPersonUserId = donation.deliveryPerson?.user?._id?.toString();

    const isAuthorized =
      userId === donorId ||
      userId === ngoId ||
      userId === deliveryPersonId ||
      userId === deliveryPersonUserId;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this donation'
      });
    }

    res.json({
      success: true,
      donation: donation
    });
  } catch (error) {
    console.error('Error fetching donation tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donation tracking',
      error: error.message
    });
  }
});

// Get my donations (donor's view)
router.get('/my-donations', auth, async (req, res) => {
  try {
    const donations = await FoodDonation.find({ donor: req.user._id })
      .populate('ngo', 'name organizationName email phone')
      .populate('restaurant', 'name address')
      .populate('deliveryPerson', 'name phone profilePicture rating')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: donations.length,
      donations: donations
    });
  } catch (error) {
    console.error('Error fetching my donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
});

// Get donations for a restaurant
router.get('/restaurant-donations/:restaurantId', auth, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const donations = await FoodDonation.find({ restaurant: restaurantId })
      .populate('donor', 'name email phone role')
      .populate('ngo', 'name organizationName email phone')
      .populate('deliveryPerson', 'name phone profilePicture rating')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: donations.length,
      donations: donations
    });
  } catch (error) {
    console.error('Error fetching restaurant donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
});

// Get donations received by an NGO
router.get('/ngo-received', auth, async (req, res) => {
  try {
    // Find NGO profile
    const NGOProfile = require('../models/NGOProfile');
    const ngoProfile = await NGOProfile.findOne({ user: req.user._id });

    if (!ngoProfile) {
      return res.status(404).json({
        success: false,
        message: 'NGO profile not found'
      });
    }

    const donations = await FoodDonation.find({ ngo: req.user._id })
      .populate('donor', 'name email phone role')
      .populate('restaurant', 'name address')
      .populate('deliveryPerson', 'name phone profilePicture rating')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: donations.length,
      donations: donations
    });
  } catch (error) {
    console.error('Error fetching NGO donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
});

// Get delivery assignments for volunteer (including donations)
router.get('/volunteer-assignments', auth, async (req, res) => {
  try {
    const DeliveryPerson = require('../models/DeliveryPerson');
    const deliveryPerson = await DeliveryPerson.findOne({ user: req.user._id });

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person profile not found'
      });
    }

    const donations = await FoodDonation.find({ deliveryPerson: deliveryPerson._id })
      .populate('donor', 'name email phone role')
      .populate('ngo', 'name organizationName email phone')
      .populate('restaurant', 'name address')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: donations.length,
      donations: donations
    });
  } catch (error) {
    console.error('Error fetching volunteer donation assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: error.message
    });
  }
});

module.exports = router;

