const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ScheduledDonation = require('../models/ScheduledDonation');
const User = require('../models/User');
const NGOProfile = require('../models/NGOProfile');

// ========================================
// SCHEDULED DONATION PICKUP ROUTES
// ========================================

// Create a new scheduled donation
router.post('/create', auth, async (req, res) => {
  try {
    const {
      frequency,
      pickupWindow,
      weekDays,
      dayOfMonth,
      foodTypes,
      expectedFoodAmount,
      notesForNGO,
      pickupAddress
    } = req.body;

    // Validate frequency
    if (!['Daily', 'Weekly', 'Monthly'].includes(frequency)) {
      return res.status(400).json({ success: false, message: 'Invalid frequency' });
    }

    // Validate frequency-specific requirements
    if (frequency === 'Weekly' && (!weekDays || weekDays.length === 0)) {
      return res.status(400).json({ success: false, message: 'Weekly schedules require at least one weekDay' });
    }

    if (frequency === 'Monthly' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
      return res.status(400).json({ success: false, message: 'Monthly schedules require dayOfMonth (1-31)' });
    }

    // Validate pickup window
    if (!pickupWindow || !pickupWindow.startTime || !pickupWindow.endTime) {
      return res.status(400).json({ success: false, message: 'Pickup window (startTime, endTime) required' });
    }

    const schedule = new ScheduledDonation({
      donor: req.user.id,
      frequency,
      pickupWindow,
      weekDays: frequency === 'Weekly' ? weekDays : undefined,
      dayOfMonth: frequency === 'Monthly' ? dayOfMonth : undefined,
      foodTypes: foodTypes || [],
      expectedFoodAmount: expectedFoodAmount || '',
      notesForNGO: notesForNGO || '',
      pickupAddress
    });

    await schedule.save();

    res.status(201).json({
      success: true,
      message: 'Scheduled donation created successfully',
      schedule
    });
  } catch (err) {
    console.error('create scheduled donation error', err);
    res.status(500).json({ success: false, message: 'Failed to create scheduled donation' });
  }
});

// Get donor's schedules
router.get('/my-schedules', auth, async (req, res) => {
  try {
    const schedules = await ScheduledDonation.find({ donor: req.user.id })
      .populate('subscribedNGOs.ngo', 'organizationName email phone')
      .sort({ createdAt: -1 });

    // Enhance with next pickup info
    const enhancedSchedules = schedules.map(s => ({
      ...s.toObject(),
      matchesToday: s.matchesToday(),
      nextPickupTime: s.getNextPickupTime()
    }));

    res.json({
      success: true,
      count: enhancedSchedules.length,
      schedules: enhancedSchedules
    });
  } catch (err) {
    console.error('my-schedules error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch schedules' });
  }
});

// Get single schedule details
router.get('/:id', auth, async (req, res) => {
  try {
    const schedule = await ScheduledDonation.findById(req.params.id)
      .populate('donor', 'name email phone role')
      .populate('subscribedNGOs.ngo', 'organizationName email phone address');

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const enhanced = {
      ...schedule.toObject(),
      matchesToday: schedule.matchesToday(),
      nextPickupTime: schedule.getNextPickupTime()
    };

    res.json({ success: true, schedule: enhanced });
  } catch (err) {
    console.error('get schedule error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule' });
  }
});

// Edit schedule
router.patch('/:id/edit', auth, async (req, res) => {
  try {
    const schedule = await ScheduledDonation.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Verify donor owns this schedule
    if (schedule.donor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const {
      pickupWindow,
      weekDays,
      dayOfMonth,
      foodTypes,
      expectedFoodAmount,
      notesForNGO
    } = req.body;

    if (pickupWindow) schedule.pickupWindow = pickupWindow;
    if (weekDays) schedule.weekDays = weekDays;
    if (dayOfMonth) schedule.dayOfMonth = dayOfMonth;
    if (foodTypes) schedule.foodTypes = foodTypes;
    if (expectedFoodAmount) schedule.expectedFoodAmount = expectedFoodAmount;
    if (notesForNGO !== undefined) schedule.notesForNGO = notesForNGO;

    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule
    });
  } catch (err) {
    console.error('edit schedule error', err);
    res.status(500).json({ success: false, message: 'Failed to edit schedule' });
  }
});

// Pause schedule
router.patch('/:id/pause', auth, async (req, res) => {
  try {
    const schedule = await ScheduledDonation.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    if (schedule.donor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    schedule.status = 'Paused';
    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule paused',
      schedule
    });
  } catch (err) {
    console.error('pause schedule error', err);
    res.status(500).json({ success: false, message: 'Failed to pause schedule' });
  }
});

// Resume schedule
router.patch('/:id/resume', auth, async (req, res) => {
  try {
    const schedule = await ScheduledDonation.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    if (schedule.donor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    schedule.status = 'Active';
    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule resumed',
      schedule
    });
  } catch (err) {
    console.error('resume schedule error', err);
    res.status(500).json({ success: false, message: 'Failed to resume schedule' });
  }
});

// Cancel schedule
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const schedule = await ScheduledDonation.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    if (schedule.donor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    schedule.status = 'Cancelled';
    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule cancelled',
      schedule
    });
  } catch (err) {
    console.error('cancel schedule error', err);
    res.status(500).json({ success: false, message: 'Failed to cancel schedule' });
  }
});

// Get available schedules (for NGOs to browse and subscribe)
router.get('/available/browse', auth, async (req, res) => {
  try {
    const { lat, lng, distance = 50, frequency } = req.query;

    let query = { status: 'Active' };

    if (frequency) {
      query.frequency = frequency;
    }

    let schedules;

    // Geospatial query if coordinates provided
    if (lat && lng) {
      schedules = await ScheduledDonation.find({
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
      .populate('donor', 'name role')
      .populate('subscribedNGOs.ngo', 'organizationName');
    } else {
      schedules = await ScheduledDonation.find(query)
        .populate('donor', 'name role')
        .populate('subscribedNGOs.ngo', 'organizationName');
    }

    // Enhance with next pickup
    const enhancedSchedules = schedules.map(s => ({
      ...s.toObject(),
      matchesToday: s.matchesToday(),
      nextPickupTime: s.getNextPickupTime(),
      subscriberCount: s.subscribedNGOs.length
    }));

    res.json({
      success: true,
      count: enhancedSchedules.length,
      schedules: enhancedSchedules
    });
  } catch (err) {
    console.error('browse available schedules error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch available schedules' });
  }
});

// NGO subscribes to a schedule
router.post('/:id/subscribe', auth, async (req, res) => {
  try {
    const schedule = await ScheduledDonation.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    if (schedule.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Cannot subscribe to inactive schedule' });
    }

    // Check if user is an NGO
    const user = await User.findById(req.user.id);
    if (user.role !== 'NGO') {
      return res.status(403).json({ success: false, message: 'Only NGOs can subscribe to schedules' });
    }

    // Check if already subscribed
    const alreadySubscribed = schedule.subscribedNGOs.some(
      sub => sub.ngo.toString() === req.user.id
    );

    if (alreadySubscribed) {
      return res.status(400).json({ success: false, message: 'Already subscribed to this schedule' });
    }

    // Add NGO to subscribers
    schedule.subscribedNGOs.push({
      ngo: req.user.id,
      subscribedAt: new Date(),
      status: 'Active'
    });

    await schedule.save();

    res.json({
      success: true,
      message: 'Successfully subscribed to schedule',
      schedule
    });
  } catch (err) {
    console.error('subscribe to schedule error', err);
    res.status(500).json({ success: false, message: 'Failed to subscribe to schedule' });
  }
});

// NGO unsubscribes from a schedule
router.post('/:id/unsubscribe', auth, async (req, res) => {
  try {
    const schedule = await ScheduledDonation.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Remove NGO from subscribers
    schedule.subscribedNGOs = schedule.subscribedNGOs.filter(
      sub => sub.ngo.toString() !== req.user.id
    );

    await schedule.save();

    res.json({
      success: true,
      message: 'Successfully unsubscribed from schedule',
      schedule
    });
  } catch (err) {
    console.error('unsubscribe from schedule error', err);
    res.status(500).json({ success: false, message: 'Failed to unsubscribe from schedule' });
  }
});

// Log a pickup completion
router.post('/:id/log-pickup', auth, async (req, res) => {
  try {
    const { actualFoodAmount, notes, volunteerId } = req.body;

    const schedule = await ScheduledDonation.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Log pickup
    schedule.pickupLogs.push({
      pickedUpAt: new Date(),
      actualFoodAmount: actualFoodAmount || '',
      notes: notes || '',
      volunteer: volunteerId || req.user.id
    });

    schedule.stats.totalPickups += 1;

    await schedule.save();

    res.json({
      success: true,
      message: 'Pickup logged successfully',
      schedule
    });
  } catch (err) {
    console.error('log-pickup error', err);
    res.status(500).json({ success: false, message: 'Failed to log pickup' });
  }
});

// Log a missed pickup
router.post('/:id/log-missed', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    const schedule = await ScheduledDonation.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    schedule.stats.missedPickups += 1;

    // Could log the missed pickup to a history array if needed
    await schedule.save();

    res.json({
      success: true,
      message: 'Missed pickup logged',
      schedule
    });
  } catch (err) {
    console.error('log-missed error', err);
    res.status(500).json({ success: false, message: 'Failed to log missed pickup' });
  }
});

// Check reminders (cron endpoint - send reminders for today's pickups)
router.post('/reminders/send', auth, async (req, res) => {
  try {
    // Find all active schedules that match today
    const allSchedules = await ScheduledDonation.find({ status: 'Active' })
      .populate('donor', 'name email phone')
      .populate('subscribedNGOs.ngo', 'organizationName email phone');

    const todaySchedules = allSchedules.filter(s => s.matchesToday());

    let remindersSent = 0;

    for (const schedule of todaySchedules) {
      // Send reminder to donor
      // TODO: Integrate with emailService or pushService
      
      // Send reminders to subscribed NGOs
      for (const sub of schedule.subscribedNGOs) {
        if (sub.status === 'Active') {
          // TODO: Send reminder to NGO
          remindersSent++;
        }
      }
    }

    res.json({
      success: true,
      message: `Sent reminders for ${todaySchedules.length} schedules`,
      todaySchedulesCount: todaySchedules.length,
      remindersSent
    });
  } catch (err) {
    console.error('send-reminders error', err);
    res.status(500).json({ success: false, message: 'Failed to send reminders' });
  }
});

module.exports = router;
