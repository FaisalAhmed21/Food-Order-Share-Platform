const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const FoodDonation = require('../models/FoodDonation');
const NGOProfile = require('../models/NGOProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const User = require('../models/User');
const upload = require('../config/multer');
const { sendNotificationEmail } = require('../config/emailService');
const { sendPushNotification } = require('../config/pushService');

// Helper function to convert GeoJSON coordinates to simple {lat, lng} for frontend
function transformDonationCoordinates(donation) {
  if (donation.pickupAddress && donation.pickupAddress.coordinates) {
    if (donation.pickupAddress.coordinates.coordinates && Array.isArray(donation.pickupAddress.coordinates.coordinates)) {
      // GeoJSON format [lng, lat] -> {lat, lng}
      const [lng, lat] = donation.pickupAddress.coordinates.coordinates;
      donation.pickupAddress.coordinates = { lat, lng };
    }
  }
  return donation;
}

// Create a new food donation
router.post('/create', auth, upload.array('photos', 6), async (req, res) => {
  try {
    let {
      title,
      quantity,
      servings,
      foodType,
      freshnessLevel,
      expiryDateTime,
      productionTime,
      shelfLifeDuration,
      storageCondition,
      description,
      pickupAddress,
      pickupWindow,
      safetyChecklist,
      packagingProvided,
      packagingInfo,
      hasUncertainty,
      warningAccepted
    } = req.body;

    // When multipart/form-data is used, some fields are sent as JSON strings.
    // Parse them if necessary.
    try {
      if (typeof pickupWindow === 'string' && pickupWindow.length > 0) {
        pickupWindow = JSON.parse(pickupWindow);
      }
    } catch (e) {
      // leave as-is
    }

    try {
      if (typeof pickupAddress === 'string' && pickupAddress.length > 0) {
        pickupAddress = JSON.parse(pickupAddress);
      }
    } catch (e) {}

    try {
      if (typeof safetyChecklist === 'string' && safetyChecklist.length > 0) {
        safetyChecklist = JSON.parse(safetyChecklist);
      }
    } catch (e) {}

    // Normalize booleans and numeric fields
    if (typeof hasUncertainty === 'string') {
      hasUncertainty = hasUncertainty === 'true' || hasUncertainty === '1';
    }
    if (typeof warningAccepted === 'string') {
      warningAccepted = warningAccepted === 'true' || warningAccepted === '1';
    }
    if (typeof packagingProvided === 'string') {
      packagingProvided = packagingProvided === 'true' || packagingProvided === '1';
    }
    if (typeof servings === 'string' && servings.trim() !== '') servings = parseInt(servings, 10);

    // Debug: log incoming request summary
    console.log('Donation create request by user:', req.user && req.user.id);
    console.log('Headers:', Object.keys(req.headers).filter(h => ['authorization','content-type'].includes(h)).map(h => ({ [h]: req.headers[h] })));
    console.log('Files count:', req.files && req.files.length);

    // If files were uploaded via multer, map them to photo objects
    let photos = [];
    if (req.files && req.files.length > 0) {
      photos = req.files.map(f => {
        let photoUrl = '';
        // Cloudinary provides 'path' or 'secure_url'
        if (f.path && f.path.startsWith('http')) {
          photoUrl = f.path;
        }
        // Local storage provides filename - construct URL
        else if (f.filename) {
          const subFolder = f.fieldname === 'photos' ? 'donations' : 'general';
          photoUrl = `http://localhost:5000/uploads/${subFolder}/${f.filename}`;
        }
        // Fallback
        else {
          photoUrl = f.path || f.secure_url || f.url || f.location || '';
        }
        
        // Return as object with url property (matches schema)
        return { url: photoUrl };
      }).filter(p => p.url);
      
      console.log('Processed photo objects:', photos);
    } else if (req.body.photos) {
      try {
        // body may contain JSON string of photos
        const parsedPhotos = typeof req.body.photos === 'string' ? JSON.parse(req.body.photos) : req.body.photos;
        // Ensure each photo is an object with url property
        photos = parsedPhotos.map(p => typeof p === 'string' ? { url: p } : p);
      } catch (e) {
        photos = req.body.photos || [];
      }
    }

    // Basic field presence checks to provide clearer feedback
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (!quantity) {
      return res.status(400).json({ success: false, message: 'Quantity is required' });
    }
    if (!servings) {
      return res.status(400).json({ success: false, message: 'Servings is required' });
    }

    // Validation: Check expiry time
    const expiryDate = new Date(expiryDateTime);
    const now = new Date();
    
    if (expiryDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Expiry time cannot be in the past'
      });
    }
    
    // Collect warnings to present combined message if multiple issues
    const warnings = [];
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    if (expiryDate < oneHourFromNow) {
      warnings.push('Expiry time is less than 1 hour');
    }
    
    // Validate pickup window
    console.log('Pickup window from body:', pickupWindow);
    
    // Ensure pickupWindow exists and has valid from/to
    if (!pickupWindow || !pickupWindow.from || !pickupWindow.to) {
      return res.status(400).json({
        success: false,
        message: 'Pickup window start and end times are required'
      });
    }
    
    const pickupFrom = new Date(pickupWindow.from);
    const pickupTo = new Date(pickupWindow.to);
    
    console.log('Parsed pickup dates - from:', pickupFrom, 'to:', pickupTo);

    // Check if dates are valid
    if (isNaN(pickupFrom.getTime()) || isNaN(pickupTo.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pickup window dates. Please select valid date and time.'
      });
    }

    // pickupFrom must be in the future (allow up to 5 minutes in the past to handle clock skew)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (pickupFrom < fiveMinutesAgo) {
      return res.status(400).json({
        success: false,
        message: 'Pickup window start time must be in the future'
      });
    }

    // pickupFrom must be before pickupTo
    if (pickupFrom >= pickupTo) {
      return res.status(400).json({
        success: false,
        message: 'Pickup window start must be before end time'
      });
    }

    // pickup window must end before expiry
    if (pickupTo > expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Pickup window cannot end after expiry time'
      });
    }
    
    // Safety checklist removed from required flow (handled client-side if desired).
    // Packaging rule: if leftover and no packaging provided, warn/require confirmation
    if (String(freshnessLevel).toLowerCase() === 'leftover' && !packagingProvided) {
      warnings.push('Freshness set to Leftover but packaging information not provided');
    }
    
    // Validate photos: check files uploaded via multer first, then fallback to photos array
    const uploadedPhotosCount = (req.files && req.files.length) || photos.length;
    console.log('Photo validation - req.files count:', req.files && req.files.length, 'photos array length:', photos.length);
    
    if (uploadedPhotosCount < 2) {
      console.log('Photo validation failed. Need at least 2 photos. req.files:', req.files && req.files.length, 'photos:', photos.length);
      return res.status(400).json({
        success: false,
        message: 'Please upload at least 2 photos of the food'
      });
    }

    // If there are warnings and user hasn't accepted them, return combined warning
    if (warnings.length > 0 && !warningAccepted) {
      return res.status(400).json({
        success: false,
        message: `Some details seem suspicious: ${warnings.join('; ')}. Please review your submission.`,
        requiresWarning: true,
        warnings
      });
    }

    // Get user role
    const user = await User.findById(req.user.id);
    const donorType = user.role === 'Restaurant' ? 'Restaurant' : 'Customer';

    // Smart Expiry: Auto-calculate expiry if production time and shelf life provided
    let finalExpiryDate = expiryDate;
    if (productionTime && shelfLifeDuration) {
      const prodTime = new Date(productionTime);
      const shelfHours = parseFloat(shelfLifeDuration);
      finalExpiryDate = new Date(prodTime.getTime() + shelfHours * 60 * 60 * 1000);
    }

    // Convert pickupAddress coordinates from {lat, lng} to GeoJSON format
    let processedPickupAddress = { ...pickupAddress };
    if (pickupAddress && pickupAddress.coordinates && pickupAddress.coordinates.lat && pickupAddress.coordinates.lng) {
      const { lat, lng } = pickupAddress.coordinates;
      processedPickupAddress.coordinates = {
        type: 'Point',
        coordinates: [lng, lat] // GeoJSON format: [longitude, latitude]
      };
      console.log('Converted coordinates to GeoJSON:', processedPickupAddress.coordinates);
    }

    // Get NGO information and address if provided
    let ngoInfo = null;
    let ngoAddress = null;
    if (req.body.ngo) {
      const ngoUser = await User.findById(req.body.ngo);
      if (ngoUser && (ngoUser.role === 'NGO' || ngoUser.role === 'ngo')) {
        ngoInfo = {
          id: ngoUser._id,
          name: ngoUser.organizationName || ngoUser.name,
          phone: ngoUser.phone
        };
        
        // Get NGO profile for address
        const ngoProfile = await NGOProfile.findOne({ user: ngoUser._id });
        if (ngoProfile && ngoProfile.address) {
          const ngoLat = ngoProfile.location?.coordinates?.[1] || 23.8103;
          const ngoLng = ngoProfile.location?.coordinates?.[0] || 90.4125;
          
          ngoAddress = {
            street: ngoProfile.address.street || '',
            area: ngoProfile.address.area || '',
            city: ngoProfile.address.city || 'Dhaka',
            postalCode: ngoProfile.address.postalCode || '',
            coordinates: {
              type: 'Point',
              coordinates: [ngoLng, ngoLat] // GeoJSON format: [longitude, latitude]
            }
          };
          console.log('NGO address coordinates (GeoJSON):', ngoAddress.coordinates);
        }
      }
    }

    // Create donation
    const donation = new FoodDonation({
      donor: req.user.id,
      donorType,
      donationType: 'surplus',
      ngo: ngoInfo ? ngoInfo.id : undefined,
      ngoName: ngoInfo ? ngoInfo.name : undefined,
      ngoPhone: ngoInfo ? ngoInfo.phone : undefined,
      deliveryAddress: ngoAddress,
      title,
      quantity,
      servings,
      foodType,
      freshnessLevel,
      expiryDateTime: finalExpiryDate,
      productionTime: productionTime ? new Date(productionTime) : undefined,
      shelfLifeDuration: shelfLifeDuration ? parseFloat(shelfLifeDuration) : undefined,
      storageCondition: storageCondition || 'Room Temperature',
      description,
      photos,
      pickupAddress: processedPickupAddress,
      pickupWindow: {
        from: pickupFrom,
        to: pickupTo
      },
      safetyChecklist,
      packagingProvided: packagingProvided || false,
      packagingInfo: packagingInfo || '',
      hasUncertainty: hasUncertainty || false,
      warningAccepted: warningAccepted || false,
      donorPhone: user.phone,
      status: 'confirmed', // Start in confirmed status
      currentStage: 'Moving for Pickup',
      statusTimestamps: {
        pending: new Date(),
        confirmed: new Date()
      }
    });
    
    // Calculate initial urgency
    donation.updateUrgency();
    
    await donation.save();
    
    // If NGO is selected, start delivery assignment and auto-progression
    if (ngoInfo && ngoAddress) {
      const { assignDeliveryPerson } = require('../library/deliveryService');
      
      // Auto-progression function for donations
      const startDonationAutoProgression = async (donationId) => {
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
            const donationToUpdate = await FoodDonation.findById(donationId);
            if (!donationToUpdate || donationToUpdate.status === 'cancelled') {
              console.log(`Donation ${donationId} cancelled or not found, stopping progression`);
              return;
            }

            if (nextStage) {
              donationToUpdate.currentStage = nextStage.name;
              donationToUpdate.status = nextStage.status;
              donationToUpdate.stageStartTime = new Date();
              donationToUpdate.statusTimestamps[nextStage.status] = new Date();
              donationToUpdate.statusHistory.push({
                status: nextStage.status,
                timestamp: new Date(),
                note: `Stage changed to ${nextStage.name}`
              });
            } else {
              // Final stage - mark as delivered
              donationToUpdate.status = 'delivered';
              donationToUpdate.completedAt = new Date();
              donationToUpdate.statusTimestamps.delivered = new Date();
              donationToUpdate.statusHistory.push({
                status: 'delivered',
                timestamp: new Date(),
                note: 'Donation delivered to NGO'
              });
            }

            await donationToUpdate.save();
            console.log(`✅ Donation ${donationId} progressed to stage: ${donationToUpdate.currentStage}`);
          }

          console.log(`🎉 Donation ${donationId} completed all stages`);
        } catch (error) {
          console.error(`Error in donation auto-progression for ${donationId}:`, error);
        }
      };

      // Assign delivery person
      const onAssignmentSuccess = (assignedDonation) => {
        setTimeout(() => {
          startDonationAutoProgression(assignedDonation._id);
        }, 1000);
      };

      try {
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
        }
      } catch (error) {
        console.error('Error assigning delivery person to donation:', error);
      }
    }
    
    // Extract coordinates - check if it's old format {lat,lng} or new GeoJSON format
    let lat, lng;
    if (pickupAddress && pickupAddress.coordinates) {
      if (pickupAddress.coordinates.lat && pickupAddress.coordinates.lng) {
        // Old format from request
        lat = pickupAddress.coordinates.lat;
        lng = pickupAddress.coordinates.lng;
      } else if (pickupAddress.coordinates.coordinates && Array.isArray(pickupAddress.coordinates.coordinates)) {
        // New GeoJSON format [lng, lat]
        lng = pickupAddress.coordinates.coordinates[0];
        lat = pickupAddress.coordinates.coordinates[1];
      }
    }
    
    // Attempt to auto-assign the nearest available volunteer on publish
    try {
      if (lat && lng) {
        const maxSearchMeters = 20000; // 20km

        const nearbyVolunteers = await VolunteerProfile.find({
          isAvailable: true,
          currentLocation: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat]
              },
              $maxDistance: maxSearchMeters
            }
          }
        }).populate('user', 'name email phone');

        let selectedVolunteer = null;
        for (let vol of nearbyVolunteers) {
          // compute distance in km
          const distanceKm = vol.distanceFrom(lat, lng);
          const volunteerRadiusKm = vol.serviceRadius || 5;

          // skip volunteers outside their service radius
          if (distanceKm > volunteerRadiusKm) continue;

          // skip volunteers who cannot accept high-risk items for urgent/non-veg/large donations
          const isHighRisk = donation.urgencyLevel === 'Urgent' || donation.foodType === 'Non-Veg' || donation.servings > 50;
          if (isHighRisk && !vol.canAcceptHighRisk()) continue;

          selectedVolunteer = vol;
          break;
        }

        if (selectedVolunteer) {
          // Create a pending assignment: record assignedVolunteer on donation and notify volunteer,
          // but do not mark volunteer unavailable until they accept.
          donation.assignedVolunteer = selectedVolunteer.user._id;
          donation.notifiedVolunteers = donation.notifiedVolunteers || [];
          donation.notifiedVolunteers.push({ volunteerId: selectedVolunteer.user._id, notifiedAt: new Date() });
          await donation.save();

          // Add to volunteer's pending assignments (awaiting confirmation)
          selectedVolunteer.pendingAssignments = selectedVolunteer.pendingAssignments || [];
          selectedVolunteer.pendingAssignments.push({ donation: donation._id, notifiedAt: new Date() });
          await selectedVolunteer.save();

          // notify the volunteer by email/push if possible
          try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const subject = `Pickup available: ${donation.title}`;
            const html = `A pickup near you is available. Please open the app to accept or decline: <a href="${frontendUrl}/volunteer-dashboard">Open Volunteer Dashboard</a>`;
            if (selectedVolunteer.user && selectedVolunteer.user.email) {
              await sendNotificationEmail(selectedVolunteer.user.email, subject, html);
            }

            if (selectedVolunteer.pushSubscription) {
              const payload = {
                title: `Pickup available: ${donation.title}`,
                body: `A pickup near you is available. Open app to accept or decline.`,
                url: `${frontendUrl}/volunteer-dashboard`
              };
              await sendPushNotification(selectedVolunteer.pushSubscription, payload);
            }
          } catch (err) {
            console.error('Error notifying assigned volunteer:', err);
          }

          console.log('Auto-pending volunteer assignment:', selectedVolunteer.user && selectedVolunteer.user._id);
        }
      }
    } catch (err) {
      console.error('Error during volunteer auto-assignment:', err);
    }
    
    // Find nearby NGOs and notify them
    // Extract coordinates (already done above, reuse lat/lng)
    if (lat && lng) {
      
      // Find NGOs within 20km radius
      const nearbyNGOs = await NGOProfile.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: 20000 // 20km in meters
          }
        },
        isVerified: true,
        isAcceptingItems: true
      }).populate('user', 'name email phone');
      
      // Filter NGOs that accept this food type
      const eligibleNGOs = nearbyNGOs.filter(ngo => ngo.acceptsFoodType(foodType));
      
      // Save notification records
      donation.notifiedNGOs = eligibleNGOs.map(ngo => ({
        ngoId: ngo.user._id,
        notifiedAt: new Date()
      }));

      await donation.save();

      // Send email notifications to eligible NGOs (if configured)
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const subject = `New Food Donation Available: ${title}`;
        const html = `
          <div>
            <h3>New donation near you</h3>
            <p>"${title}" has been posted and may be available for pickup.</p>
            <p><a href="${frontendUrl}/donation-details?id=${donation._id}">View donation details</a></p>
            <p>Log in to the NGO dashboard to claim pickup.</p>
          </div>
        `;

        await Promise.all(eligibleNGOs.map(async ngo => {
          try {
            if (ngo.user && ngo.user.email) {
              await sendNotificationEmail(ngo.user.email, subject, html);
            }

            // Attempt push notification if NGO has subscription
            try {
              if (ngo.pushSubscription) {
                const payload = {
                  title: `New donation: ${title}`,
                  body: `${title} available nearby. Open app to claim.` ,
                  url: `${frontendUrl}/donation-details?id=${donation._id}`
                };
                await sendPushNotification(ngo.pushSubscription, payload);
              }
            } catch (err) {
              console.error('Error sending push to NGO', ngo._id, err);
            }
          } catch (err) {
            console.error('Error sending notification to NGO', ngo.user && ngo.user.email, err);
          }
        }));

        console.log(`✅ Notified ${eligibleNGOs.length} NGOs about new donation`);
      } catch (err) {
        console.error('Error sending NGO notifications:', err);
      }
    }

    // Transform coordinates to simple {lat, lng} format for frontend
    const transformedDonation = transformDonationCoordinates(donation.toObject());
    
    console.log('✅ Donation created successfully:', {
      id: donation._id,
      title: donation.title,
      status: donation.status,
      currentStage: donation.currentStage,
      ngo: donation.ngoName,
      deliveryAssignmentStatus: donation.deliveryAssignmentStatus
    });
    
    res.json({
      success: true,
      message: 'Donation published successfully! Volunteer assignment in progress.',
      donation: transformedDonation,
      donationId: donation._id
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create donation',
      error: error.message
    });
  }
});

// Get all available donations (for NGOs and Volunteers)
router.get('/available', auth, async (req, res) => {
  try {
    const {
      foodType,
      urgency,
      distance,
      lat,
      lng,
      limit = 50
    } = req.query;
    
    let query = { status: 'Available' };
    
    // Filter by food type
    if (foodType) {
      query.foodType = foodType;
    }
    
    // Filter by urgency
    if (urgency) {
      query.urgencyLevel = urgency;
    }
    
    let donations;
    
    // Geospatial query if coordinates provided
    if (lat && lng && distance) {
      donations = await FoodDonation.find({
        ...query,
        'pickupAddress.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: parseFloat(distance) * 1000 // Convert km to meters
          }
        }
      })
      .populate('donor', 'name email phone role')
      .limit(parseInt(limit))
      .sort({ urgencyLevel: -1, createdAt: -1 });
    } else {
      donations = await FoodDonation.find(query)
        .populate('donor', 'name email phone role')
        .limit(parseInt(limit))
        .sort({ urgencyLevel: -1, createdAt: -1 });
    }
    
    // Update urgency for all donations
    for (let donation of donations) {
      donation.updateUrgency();
      await donation.save();
    }

    // Transform coordinates to simple {lat, lng} format for frontend
    const transformedDonations = donations.map(d => transformDonationCoordinates(d.toObject()));

    res.json({
      success: true,
      count: transformedDonations.length,
      donations: transformedDonations
    });
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
});

// Get donation tracking details by ID
// Get user's donations
router.get('/my-donations', auth, async (req, res) => {
  try {
    const donations = await FoodDonation.find({ donor: req.user.id })
      .populate('ngo', 'name organizationName email phone')
      .populate('deliveryPerson', 'name phone profilePicture rating')
      .sort({ createdAt: -1 })
      .limit(50);
    
    console.log(`📦 Found ${donations.length} donations for user ${req.user.id}`);
    
    // Transform coordinates to simple {lat, lng} format for frontend
    const transformedDonations = donations.map(d => {
      const obj = d.toObject();
      // Ensure donationNumber is included
      if (!obj.donationNumber) {
        obj.donationNumber = `FD${d._id.toString().slice(-8).toUpperCase()}`;
      }
      return transformDonationCoordinates(obj);
    });
    
    res.json({
      success: true,
      count: transformedDonations.length,
      donations: transformedDonations
    });
  } catch (error) {
    console.error('Error fetching my donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your donations',
      error: error.message
    });
  }
});

// Get a single donation by id
// Claim a donation (NGO only)
router.post('/:id/claim', auth, async (req, res) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }
    
    if (donation.status !== 'Available') {
      return res.status(400).json({
        success: false,
        message: 'This donation is no longer available'
      });
    }
    
    // Check if user is NGO
    const user = await User.findById(req.user.id);
    if (user.role !== 'NGO') {
      return res.status(403).json({
        success: false,
        message: 'Only NGOs can claim donations'
      });
    }
    
    // Check NGO verification for high-risk items
    const ngoProfile = await NGOProfile.findOne({ user: req.user.id });
    
    if (!ngoProfile) {
      return res.status(400).json({
        success: false,
        message: 'NGO profile not found. Please complete your profile first.'
      });
    }
    
    // Check if NGO can accept this food type
    if (!ngoProfile.acceptsFoodType(donation.foodType)) {
      return res.status(400).json({
        success: false,
        message: `Your NGO does not accept ${donation.foodType} items`
      });
    }
    
    // High-risk item check for unverified NGOs
    const isHighRisk = donation.urgencyLevel === 'Urgent' || 
                       donation.foodType === 'Non-Veg' || 
                       donation.servings > 50;
    
    if (!ngoProfile.isVerified && isHighRisk) {
      return res.status(403).json({
        success: false,
        message: 'Complete verification to claim high-risk items',
        requiresVerification: true
      });
    }
    
    // Claim the donation
    donation.status = 'Claimed';
    donation.claimedBy = req.user.id;
    donation.claimedAt = new Date();
    
    await donation.save();
    
    // Update NGO stats
    ngoProfile.stats.totalPickups += 1;
    await ngoProfile.save();

    res.json({
      success: true,
      message: 'Donation claimed successfully',
      donation
    });
  } catch (error) {
    console.error('Error claiming donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim donation'
    });
  }
});

// Assign volunteer to donation
router.post('/:id/assign-volunteer', auth, async (req, res) => {
  try {
    const { volunteerId } = req.body;
    
    const donation = await FoodDonation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }
    
    if (donation.status !== 'Claimed') {
      return res.status(400).json({
        success: false,
        message: 'Donation must be claimed before assigning volunteer'
      });
    }
    
    // Verify volunteer exists
    const volunteer = await VolunteerProfile.findOne({ user: volunteerId }).populate('user', 'name phone');
    
    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }
    
    if (!volunteer.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Volunteer is not available'
      });
    }
    
    // Assign volunteer
    donation.assignedVolunteer = volunteerId;
    await donation.save();
    
    // Add to volunteer's active assignments
    volunteer.activeAssignments.push({
      donation: donation._id,
      assignedAt: new Date(),
      status: 'Assigned'
    });
    await volunteer.save();

    res.json({
      success: true,
      message: 'Volunteer assigned successfully',
      volunteer: {
        name: volunteer.user.name,
        phone: volunteer.user.phone
      }
    });
  } catch (error) {
    console.error('Error assigning volunteer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign volunteer'
    });
  }
});

// Upload pickup proof and mark as picked up
router.post('/:id/pickup-proof', auth, async (req, res) => {
  try {
    const { proofPhotos } = req.body;
    
    if (!proofPhotos || proofPhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least 1 proof photo'
      });
    }
    
    const donation = await FoodDonation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }
    
    // Add pickup proof
    donation.pickupProof = proofPhotos.map(url => ({
      url,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    }));
    donation.status = 'Picked Up';
    donation.pickedUpAt = new Date();
    
    await donation.save();
    
    // Update volunteer stats
    if (donation.assignedVolunteer) {
      const volunteer = await VolunteerProfile.findOne({ user: donation.assignedVolunteer });
      if (volunteer) {
        volunteer.stats.totalPickups += 1;
        volunteer.stats.successfulPickups += 1;
        await volunteer.save();
      }
    }
    
    // Update NGO stats
    if (donation.claimedBy) {
      const ngo = await NGOProfile.findOne({ user: donation.claimedBy });
      if (ngo) {
        ngo.stats.successfulPickups += 1;
        ngo.stats.totalMealsCollected += donation.servings;
        ngo.updateTrustScore();
        await ngo.save();
      }
    }

    res.json({
      success: true,
      message: 'Pickup confirmed successfully',
      donation
    });
  } catch (error) {
    console.error('Error uploading pickup proof:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload pickup proof'
    });
  }
});

// Mark donation as completed
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }
    
    if (donation.status !== 'Picked Up') {
      return res.status(400).json({
        success: false,
        message: 'Donation must be picked up before completing'
      });
    }
    
    donation.status = 'Completed';
    donation.completedAt = new Date();
    
    await donation.save();

    res.json({
      success: true,
      message: 'Donation completed successfully',
      donation
    });
  } catch (error) {
    console.error('Error completing donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete donation'
    });
  }
});

// Cancel donation
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const donation = await FoodDonation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }
    
    // Only donor can cancel
    if (donation.donor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the donor can cancel this donation'
      });
    }
    
    donation.status = 'Cancelled';
    donation.cancellationReason = reason;
    
    await donation.save();

    res.json({
      success: true,
      message: 'Donation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel donation'
    });
  }
});

// Auto-expire donations (should be called by a cron job)
router.post('/auto-expire', async (req, res) => {
  try {
    const now = new Date();
    
    const expiredDonations = await FoodDonation.updateMany(
      {
        status: { $in: ['Available', 'Claimed'] },
        expiryDateTime: { $lt: now },
        autoExpired: false
      },
      {
        $set: {
          status: 'Expired',
          autoExpired: true
        }
      }
    );

    res.json({
      success: true,
      message: `Expired ${expiredDonations.modifiedCount} donations`
    });
  } catch (error) {
    console.error('Error auto-expiring donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-expire donations'
    });
  }
});

// Trigger fallback suggestions for stale donations (cron-friendly endpoint)
router.post('/trigger-fallback', async (req, res) => {
  try {
    const hoursThreshold = parseInt(req.body.hours || req.query.hours || 6, 10); // default 6 hours
    const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    const staleDonations = await FoodDonation.find({
      status: 'Available',
      createdAt: { $lt: cutoff },
      fallbackSuggested: { $ne: true }
    }).limit(200);

    let updated = 0;
    for (let d of staleDonations) {
      d.conversionOptions = d.conversionOptions || {};
      d.conversionOptions.volunteerRequested = true;
      d.fallbackSuggested = true;
      await d.save();
      updated++;
    }

    res.json({ success: true, updated });
  } catch (err) {
    console.error('Error triggering fallback:', err);
    res.status(500).json({ success: false, message: 'Failed to trigger fallback' });
  }
});

// Donor actions for fallback suggestions
// Request a volunteer (ask system to broaden volunteer search / notify more volunteers)
router.post('/:id/request-volunteer', auth, async (req, res) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    if (donation.donor.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Only donor can request volunteer' });

    donation.conversionOptions = donation.conversionOptions || {};
    donation.conversionOptions.volunteerRequested = true;
    donation.fallbackSuggested = true;
    await donation.save();

    // (Optional) trigger notifications to volunteers - best-effort
    try {
      // Extract coordinates from GeoJSON or old format
      let lat, lng;
      if (donation.pickupAddress && donation.pickupAddress.coordinates) {
        if (donation.pickupAddress.coordinates.lat && donation.pickupAddress.coordinates.lng) {
          lat = donation.pickupAddress.coordinates.lat;
          lng = donation.pickupAddress.coordinates.lng;
        } else if (donation.pickupAddress.coordinates.coordinates && Array.isArray(donation.pickupAddress.coordinates.coordinates)) {
          lng = donation.pickupAddress.coordinates.coordinates[0];
          lat = donation.pickupAddress.coordinates.coordinates[1];
        }
      }
      
      if (lat && lng) {
        const nearbyVolunteers = await VolunteerProfile.find({ isAvailable: true, currentLocation: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 50000 } } }).limit(50).populate('user', 'name email phone');
        // Notify volunteers (push/email) - reuse sendPushNotification/sendNotificationEmail if available
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const subject = `Volunteer requested for donation: ${donation.title}`;
        const html = `A donor has requested volunteer help. View: <a href="${frontendUrl}/donation-details?id=${donation._id}">Donation</a>`;
        for (let vol of nearbyVolunteers) {
          try {
            if (vol.pushSubscription) await sendPushNotification(vol.pushSubscription, { title: subject, body: donation.title, url: `${frontendUrl}/donation-details?id=${donation._id}` });
            if (vol.user && vol.user.email) await sendNotificationEmail(vol.user.email, subject, html);
          } catch (e) { /* ignore individual notify errors */ }
        }
      }
    } catch (err) { console.error('Error notifying volunteers on request-volunteer', err); }

    res.json({ success: true, message: 'Volunteer request noted', donation: transformDonationCoordinates(donation.toObject()) });
  } catch (err) {
    console.error('request-volunteer error', err);
    res.status(500).json({ success: false, message: 'Failed to request volunteer' });
  }
});

// Convert to sale suggestion: mark donation as for-sale candidate
router.post('/:id/convert-to-sale', auth, async (req, res) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    if (donation.donor.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Only donor can convert to sale' });

    donation.conversionOptions = donation.conversionOptions || {};
    donation.conversionOptions.forSaleSuggested = true;
    donation.fallbackSuggested = true;
    await donation.save();

    res.json({ success: true, message: 'Marked as sale candidate', donation: transformDonationCoordinates(donation.toObject()) });
  } catch (err) {
    console.error('convert-to-sale error', err);
    res.status(500).json({ success: false, message: 'Failed to mark for sale' });
  }
});

// Extend pickup window: donor requests to extend pickup window by minutes
router.post('/:id/extend-pickup', auth, async (req, res) => {
  try {
    const { extendMinutes } = req.body;
    const donation = await FoodDonation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    if (donation.donor.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Only donor can extend pickup window' });

    const minutes = parseInt(extendMinutes || 30, 10);
    donation.pickupWindow = donation.pickupWindow || {};
    donation.pickupWindow.to = new Date((donation.pickupWindow.to || new Date()).getTime() + minutes * 60 * 1000);
    donation.conversionOptions = donation.conversionOptions || {};
    donation.conversionOptions.extendedByMinutes = (donation.conversionOptions.extendedByMinutes || 0) + minutes;
    donation.fallbackSuggested = true;
    await donation.save();

    res.json({ success: true, message: `Extended pickup window by ${minutes} minutes`, donation: transformDonationCoordinates(donation.toObject()) });
  } catch (err) {
    console.error('extend-pickup error', err);
    res.status(500).json({ success: false, message: 'Failed to extend pickup window' });
  }
});

// Mark composting suggestion: donor opts to mark donation as compost/unsalvageable
router.post('/:id/mark-compost', auth, async (req, res) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    if (donation.donor.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Only donor can mark compost' });

    donation.conversionOptions = donation.conversionOptions || {};
    donation.conversionOptions.compostingSuggested = true;
    donation.fallbackSuggested = true;
    donation.status = 'CompostingSuggested';
    await donation.save();

    res.json({ success: true, message: 'Marked for composting', donation: transformDonationCoordinates(donation.toObject()) });
  } catch (err) {
    console.error('mark-compost error', err);
    res.status(500).json({ success: false, message: 'Failed to mark for composting' });
  }
});

// ========================================
// SMART EXPIRY MANAGEMENT ENDPOINTS
// ========================================

// Donor takes action on expiring donation
router.post('/:id/donor-action', auth, async (req, res) => {
  try {
    const { action, notes, discountPercentage } = req.body;
    const donation = await FoodDonation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Verify donor owns this donation
    if (donation.donor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Valid actions: 'donate_now', 'flash_discount', 'quick_pickup', 'finished_early', 'archive'
    const validActions = ['donate_now', 'flash_discount', 'quick_pickup', 'finished_early', 'archive'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    // Log action
    donation.donorActionsTaken.push({
      action,
      takenAt: new Date(),
      notes: notes || ''
    });

    // Apply action effects
    switch (action) {
      case 'donate_now':
        // Keep status as Available, mark high urgency
        donation.urgencyLevel = 'Critical';
        break;

      case 'flash_discount':
        if (!discountPercentage || discountPercentage < 1 || discountPercentage > 100) {
          return res.status(400).json({ success: false, message: 'Invalid discount percentage' });
        }
        donation.flashDiscount = {
          enabled: true,
          percentage: discountPercentage
        };
        donation.urgencyLevel = 'High';
        break;

      case 'quick_pickup':
        // Shorten pickup window to ASAP
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        donation.pickupWindow.from = now;
        donation.pickupWindow.to = twoHoursLater;
        donation.urgencyLevel = 'Critical';
        break;

      case 'finished_early':
        // Mark as available for immediate pickup
        donation.freshnessLevel = 'Fresh';
        donation.urgencyLevel = 'High';
        break;

      case 'archive':
        donation.status = 'Archived';
        break;
    }

    await donation.save();

    res.json({
      success: true,
      message: `Action '${action}' applied successfully`,
      donation
    });
  } catch (err) {
    console.error('donor-action error', err);
    res.status(500).json({ success: false, message: 'Failed to apply donor action' });
  }
});

// Get donations expiring soon (for NGOs/Volunteers priority view)
router.get('/expiring-soon', auth, async (req, res) => {
  try {
    const { hoursAhead = 6, lat, lng, distance = 50 } = req.query;

    const hoursAheadNum = parseInt(hoursAhead);
    const threshold = new Date(Date.now() + hoursAheadNum * 60 * 60 * 1000);

    let query = {
      status: 'Available',
      expiryDateTime: { $lte: threshold }
    };

    let donations;

    // Geospatial query if coordinates provided
    if (lat && lng) {
      donations = await FoodDonation.find({
        ...query,
        'pickupAddress.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: parseFloat(distance) * 1000
          }
        }
      })
      .populate('donor', 'name email phone role')
      .sort({ expiryDateTime: 1 }); // Soonest expiry first
    } else {
      donations = await FoodDonation.find(query)
        .populate('donor', 'name email phone role')
        .sort({ expiryDateTime: 1 });
    }

    // Enhance with expiry status
    const enhancedDonations = donations.map(d => ({
      ...d.toObject(),
      timeLeftMinutes: d.getTimeLeftMinutes(),
      expiryStatus: d.getExpiryStatus()
    }));

    res.json({
      success: true,
      count: enhancedDonations.length,
      donations: enhancedDonations
    });
  } catch (err) {
    console.error('expiring-soon error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch expiring donations' });
  }
});

// Check expiry alerts (cron endpoint - trigger alerts at thresholds)
router.post('/check-expiry-alerts', auth, async (req, res) => {
  try {
    // This endpoint should be called by a cron job or scheduler
    // Check all Available donations for expiry alert thresholds

    const donations = await FoodDonation.find({
      status: 'Available',
      expiryDateTime: { $exists: true }
    }).populate('donor', 'name email phone');

    const alertThresholds = [
      { type: '6_hour', minutes: 360 },
      { type: '2_hour', minutes: 120 },
      { type: '30_minute', minutes: 30 }
    ];

    let alertsTriggered = 0;
    const alertResults = [];

    for (const donation of donations) {
      for (const threshold of alertThresholds) {
        if (donation.shouldTriggerAlert(threshold.type)) {
          // Trigger alert
          donation.expiryAlerts.push({
            alertType: threshold.type,
            triggeredAt: new Date(),
            acknowledged: false
          });

          await donation.save();
          alertsTriggered++;

          alertResults.push({
            donationId: donation._id,
            title: donation.title,
            alertType: threshold.type,
            timeLeftMinutes: donation.getTimeLeftMinutes(),
            donorEmail: donation.donor.email
          });

          // TODO: Send notification to donor (email/push)
          // This would integrate with emailService or pushService
        }
      }
    }

    res.json({
      success: true,
      message: `Checked ${donations.length} donations, triggered ${alertsTriggered} alerts`,
      alertsTriggered,
      alerts: alertResults
    });
  } catch (err) {
    console.error('check-expiry-alerts error', err);
    res.status(500).json({ success: false, message: 'Failed to check expiry alerts' });
  }
});

// Auto-archive expired donations (cron endpoint)
router.post('/auto-archive-expired', auth, async (req, res) => {
  try {
    // Find all donations past expiry that are still Available
    const now = new Date();

    const expiredDonations = await FoodDonation.find({
      status: 'Available',
      expiryDateTime: { $lt: now }
    });

    let archivedCount = 0;

    for (const donation of expiredDonations) {
      donation.status = 'Archived';
      donation.donorActionsTaken.push({
        action: 'auto_archived',
        takenAt: now,
        notes: 'Automatically archived due to expiry time passed'
      });
      await donation.save();
      archivedCount++;
    }

    res.json({
      success: true,
      message: `Auto-archived ${archivedCount} expired donations`,
      archivedCount
    });
  } catch (err) {
    console.error('auto-archive-expired error', err);
    res.status(500).json({ success: false, message: 'Failed to auto-archive expired donations' });
  }
});

// Get donation by ID (MUST BE LAST - catches all /:id patterns)
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('📦 Fetching donation with ID:', req.params.id);
    
    const donation = await FoodDonation.findById(req.params.id)
      .populate('donor', 'name email phone role')
      .populate('ngo', 'name organizationName email phone')
      .populate('deliveryPerson', 'name phone profilePicture rating');

    if (!donation) {
      console.log('❌ Donation not found with ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    console.log('✅ Donation found:', {
      id: donation._id,
      title: donation.title,
      status: donation.status,
      currentStage: donation.currentStage
    });

    // Update urgency before returning
    if (typeof donation.updateUrgency === 'function') {
      donation.updateUrgency();
      await donation.save();
    }

    // Transform coordinates to simple {lat, lng} format for frontend
    const transformedDonation = transformDonationCoordinates(donation.toObject());

    res.json({
      success: true,
      donation: transformedDonation
    });
  } catch (error) {
    console.error('Error fetching donation by id:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donation',
      error: error.message
    });
  }
});

module.exports = router;

