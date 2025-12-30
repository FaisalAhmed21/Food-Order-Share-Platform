const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const VolunteerProfile = require('../models/VolunteerProfile');
const FoodDonation = require('../models/FoodDonation');
const User = require('../models/User');

// Create or update volunteer profile
router.post('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'Volunteer') {
      return res.status(403).json({
        success: false,
        message: 'Only Volunteer users can create volunteer profiles'
      });
    }
    
    const {
      currentLocation,
      hasVehicle,
      vehicleType,
      vehicleCapacity,
      serviceRadius,
      preferredAreas,
      emergencyContact
    } = req.body;
    
    let volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id });
    
    if (volunteerProfile) {
      // Update existing profile
      Object.assign(volunteerProfile, {
        currentLocation,
        hasVehicle,
        vehicleType,
        vehicleCapacity,
        serviceRadius,
        preferredAreas,
        emergencyContact,
        lastLocationUpdate: new Date()
      });
    } else {
      // Create new profile
      volunteerProfile = new VolunteerProfile({
        user: req.user.id,
        currentLocation,
        hasVehicle,
        vehicleType,
        vehicleCapacity,
        serviceRadius,
        preferredAreas,
        emergencyContact
      });
    }
    
    await volunteerProfile.save();

    res.json({
      success: true,
      message: 'Volunteer profile saved successfully',
      profile: volunteerProfile
    });
  } catch (error) {
    console.error('Error saving volunteer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save volunteer profile',
      error: error.message
    });
  }
});

// Get volunteer profile
router.get('/profile', auth, async (req, res) => {
  try {
    const volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id })
      .populate('user', 'name email phone')
      .populate('associatedNGO', 'ngoName');
    
    if (!volunteerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }

    res.json({
      success: true,
      profile: volunteerProfile
    });
  } catch (error) {
    console.error('Error fetching volunteer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer profile'
    });
  }
});

// Update location
router.patch('/location', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id });
    
    if (!volunteerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }
    
    volunteerProfile.currentLocation = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    };
    volunteerProfile.lastLocationUpdate = new Date();
    
    await volunteerProfile.save();

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

// Toggle availability
router.patch('/availability', auth, async (req, res) => {
  try {
    const { isAvailable, durationHours } = req.body;
    
    const volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id });
    
    if (!volunteerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }
    
    await volunteerProfile.setAvailability(isAvailable, durationHours);

    res.json({
      success: true,
      message: `Availability set to ${isAvailable ? 'available' : 'unavailable'}`,
      profile: volunteerProfile
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability'
    });
  }
});

// Get nearby pickups for volunteer
router.get('/nearby-pickups', auth, async (req, res) => {
  try {
    const volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id });
    
    if (!volunteerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }
    
    const [lng, lat] = volunteerProfile.currentLocation.coordinates;
    const maxDistance = req.query.distance || volunteerProfile.serviceRadius || 5;
    
    // Find nearby donations that are claimed and need pickup
    const donations = await FoodDonation.find({
      status: 'Claimed',
      'pickupAddress.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      }
    })
    .populate('donor', 'name phone')
    .populate('claimedBy', 'name')
    .limit(20);

    res.json({
      success: true,
      count: donations.length,
      donations
    });
  } catch (error) {
    console.error('Error fetching nearby pickups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby pickups'
    });
  }
});

// Self-assign to a donation (for verified volunteers)
router.post('/self-assign/:donationId', auth, async (req, res) => {
  try {
    const volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id });
    
    if (!volunteerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }
    
    if (!volunteerProfile.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Only verified volunteers can self-assign'
      });
    }
    
    if (!volunteerProfile.canSelfAssign) {
      return res.status(403).json({
        success: false,
        message: 'Self-assignment not enabled for your profile'
      });
    }
    
    const donation = await FoodDonation.findById(req.params.donationId);
    
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }
    
    if (donation.status !== 'Claimed') {
      return res.status(400).json({
        success: false,
        message: 'This donation is not available for pickup assignment'
      });
    }
    
    // Check if it's a high-risk item
    const isHighRisk = donation.urgencyLevel === 'Urgent' || 
                       donation.foodType === 'Non-Veg' || 
                       donation.servings > 50;
    
    if (isHighRisk && !volunteerProfile.canAcceptHighRisk()) {
      return res.status(403).json({
        success: false,
        message: 'Complete at least 5 successful pickups to handle high-risk items'
      });
    }
    
    // Assign volunteer
    donation.assignedVolunteer = req.user.id;
    await donation.save();
    
    // Add to volunteer's active assignments
    volunteerProfile.activeAssignments.push({
      donation: donation._id,
      assignedAt: new Date(),
      status: 'Assigned'
    });
    await volunteerProfile.save();

    res.json({
      success: true,
      message: 'Successfully self-assigned to pickup',
      donation
    });
  } catch (error) {
    console.error('Error self-assigning:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to self-assign'
    });
  }
});

// Get volunteer's active assignments
router.get('/my-assignments', auth, async (req, res) => {
  try {
    const volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id })
      .populate({
        path: 'activeAssignments.donation',
        populate: {
          path: 'donor claimedBy',
          select: 'name phone email'
        }
      })
      .populate({
        path: 'pendingAssignments.donation',
        populate: {
          path: 'donor claimedBy',
          select: 'name phone email'
        }
      });
    
    if (!volunteerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }

    res.json({
      success: true,
      assignments: volunteerProfile.activeAssignments,
      pending: volunteerProfile.pendingAssignments || []
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
});

// Volunteer accepts a pending assignment
router.post('/assignment/:donationId/accept', auth, async (req, res) => {
  try {
    const volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id });
    if (!volunteerProfile) return res.status(404).json({ success: false, message: 'Volunteer profile not found' });

    const pendingIndex = (volunteerProfile.pendingAssignments || []).findIndex(p => p.donation.toString() === req.params.donationId);
    if (pendingIndex === -1) return res.status(404).json({ success: false, message: 'Pending assignment not found' });

    // Move pending to active assignments
    volunteerProfile.activeAssignments = volunteerProfile.activeAssignments || [];
    volunteerProfile.activeAssignments.push({ donation: req.params.donationId, assignedAt: new Date(), status: 'Assigned' });
    // remove pending
    volunteerProfile.pendingAssignments.splice(pendingIndex, 1);
    // mark volunteer unavailable
    volunteerProfile.isAvailable = false;
    await volunteerProfile.save();

    // update donation record
    const donation = await FoodDonation.findById(req.params.donationId);
    if (donation) {
      donation.assignedVolunteer = req.user.id;
      donation.assignedAt = new Date();
      await donation.save();
    }

    res.json({ success: true, message: 'Assignment accepted', assignment: volunteerProfile.activeAssignments.slice(-1)[0] });
  } catch (err) {
    console.error('Error accepting assignment:', err);
    res.status(500).json({ success: false, message: 'Failed to accept assignment' });
  }
});

// Volunteer declines a pending assignment
router.post('/assignment/:donationId/decline', auth, async (req, res) => {
  try {
    const volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id });
    if (!volunteerProfile) return res.status(404).json({ success: false, message: 'Volunteer profile not found' });

    const pendingIndex = (volunteerProfile.pendingAssignments || []).findIndex(p => p.donation.toString() === req.params.donationId);
    if (pendingIndex === -1) return res.status(404).json({ success: false, message: 'Pending assignment not found' });

    // remove pending
    volunteerProfile.pendingAssignments.splice(pendingIndex, 1);
    await volunteerProfile.save();

    // clear donation.assignedVolunteer if it was pointing to this volunteer
    const donation = await FoodDonation.findById(req.params.donationId);
    if (donation && donation.assignedVolunteer && donation.assignedVolunteer.toString() === req.user.id) {
      donation.assignedVolunteer = null;
      await donation.save();

      // Attempt to reassign immediately excluding this volunteer
      try {
        const { assignNearestVolunteer } = require('../library/assignmentService');
        await assignNearestVolunteer(donation._id, [req.user.id]);
      } catch (err) {
        console.error('Error attempting reassignment after decline:', err);
      }
    }

    res.json({ success: true, message: 'Assignment declined and reassignment attempted' });
  } catch (err) {
    console.error('Error declining assignment:', err);
    res.status(500).json({ success: false, message: 'Failed to decline assignment' });
  }
});

// Update assignment status
router.patch('/assignment/:donationId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const volunteerProfile = await VolunteerProfile.findOne({ user: req.user.id });
    
    if (!volunteerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }
    
    const assignment = volunteerProfile.activeAssignments.find(
      a => a.donation.toString() === req.params.donationId
    );
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }
    
    assignment.status = status;
    await volunteerProfile.save();

    res.json({
      success: true,
      message: 'Assignment status updated',
      assignment
    });
  } catch (error) {
    console.error('Error updating assignment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment status'
    });
  }
});

// Update volunteer location (IP-based background tracking)
router.post('/update-location', auth, async (req, res) => {
  try {
    const DeliveryPerson = require('../models/DeliveryPerson');
    const { location, city, region, country } = req.body;
    
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates required'
      });
    }
    
    // Find or create delivery person by email
    let deliveryPerson = await DeliveryPerson.findOne({ email: req.user.email });
    
    if (!deliveryPerson) {
      // Create delivery person profile if doesn't exist
      const User = require('../models/User');
      const user = await User.findById(req.user._id);
      
      deliveryPerson = new DeliveryPerson({
        name: user.name,
        email: user.email,
        phone: user.phone || 'N/A',
        currentLocation: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        isOnline: true,
        status: 'available'
      });
    } else {
      // Update existing location
      deliveryPerson.currentLocation = {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      };
      deliveryPerson.lastActive = new Date();
      deliveryPerson.isOnline = true;
    }
    
    await deliveryPerson.save();
    
    console.log(`📍 Location updated for ${deliveryPerson.name}: ${city}, ${region}`);
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        lat: location.lat,
        lng: location.lng,
        city,
        region,
        country
      }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

// Get volunteer's delivery assignments (food orders)
router.get('/my-delivery-assignments', auth, async (req, res) => {
  try {
    const DeliveryPerson = require('../models/DeliveryPerson');
    const Order = require('../models/Order');
    
    // Find delivery person by email (volunteers are also delivery persons)
    const deliveryPerson = await DeliveryPerson.findOne({ email: req.user.email });
    
    if (!deliveryPerson) {
      return res.json({
        success: true,
        assignments: [],
        message: 'No delivery person profile found'
      });
    }
    
    // Find all orders assigned to this delivery person
    const assignments = await Order.find({ deliveryPerson: deliveryPerson._id })
      .populate('restaurant', 'name image address')
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      assignments: assignments
    });
  } catch (error) {
    console.error('Error fetching delivery assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery assignments'
    });
  }
});

module.exports = router;
