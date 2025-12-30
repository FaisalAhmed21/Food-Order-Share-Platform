const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const upload = require('../config/multer');
const path = require('path');

// ========================================
// COMMUNITY CAMPAIGNS & DRIVES ROUTES
// ========================================

// NGO-specific routes (must come first)
// Create a new campaign (NGO only)
router.post('/ngo/create', auth, upload.single('campaignBanner'), async (req, res) => {
  console.log('========================================');
  console.log('CREATE CAMPAIGN ROUTE HIT!');
  console.log('req.user from auth middleware:', req.user ? 'EXISTS' : 'NULL');
  console.log('req.user._id:', req.user?._id);
  console.log('req.user.role (direct):', req.user?.role);
  console.log('========================================');
  
  try {
    const user = await User.findById(req.user._id || req.user.id);
    
    console.log('Campaign creation - User found:', user ? 'Yes' : 'No');
    console.log('Campaign creation - User role:', user?.role);
    console.log('Campaign creation - req.user.role:', req.user?.role);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.role?.toLowerCase() !== 'ngo') {
      return res.status(403).json({ 
        success: false, 
        message: `Only NGOs can create campaigns. Your role: ${user.role}` 
      });
    }

    const {
      name,
      description,
      type,
      startDate,
      endDate,
      targetMeals,
      targetDonors
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    // Handle uploaded image
    let bannerImageUrl = '';
    if (req.file) {
      // Generate URL for uploaded file
      bannerImageUrl = `/uploads/campaigns/${req.file.filename}`;
    }

    const campaign = new Campaign({
      name,
      description,
      type: type || 'Custom',
      startDate,
      endDate,
      goals: {
        targetMeals: parseInt(targetMeals) || 0,
        targetDonors: parseInt(targetDonors) || 0
      },
      createdBy: user._id,
      bannerImage: bannerImageUrl,
      status: new Date() >= new Date(startDate) ? 'Active' : 'Upcoming'
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign
    });
  } catch (err) {
    console.error('create campaign error', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Campaign name already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
});

// Get campaigns created by the logged-in NGO
router.get('/ngo/my-campaigns', auth, async (req, res) => {
  try {
    if (req.user.role?.toLowerCase() !== 'ngo') {
      return res.status(403).json({ success: false, message: 'Only NGOs can access this endpoint' });
    }

    const campaigns = await Campaign.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });

    // Update status for all campaigns
    for (const campaign of campaigns) {
      await campaign.updateStatus();
      await campaign.save();
    }

    res.json({
      success: true,
      count: campaigns.length,
      campaigns
    });
  } catch (err) {
    console.error('get my campaigns error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
  }
});

// Manually assign badges to top donors (NGO creator only)
router.post('/ngo/:id/assign-badges', auth, async (req, res) => {
  try {
    if (req.user.role?.toLowerCase() !== 'ngo') {
      return res.status(403).json({ success: false, message: 'Only NGOs can assign badges' });
    }

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Verify the campaign belongs to this NGO
    if (campaign.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only assign badges for campaigns you created' });
    }

    // Assign badges
    const badgeAssignments = await campaign.assignBadges();
    await campaign.save();

    res.json({
      success: true,
      message: `Badges assigned to ${badgeAssignments.length} donors`,
      badgeAssignments
    });
  } catch (err) {
    console.error('assign badges error', err);
    res.status(500).json({ success: false, message: 'Failed to assign badges' });
  }
});

// Delete a campaign (NGO creator only)
router.delete('/ngo/:id', auth, async (req, res) => {
  try {
    if (req.user.role?.toLowerCase() !== 'ngo') {
      return res.status(403).json({ success: false, message: 'Only NGOs can delete campaigns' });
    }

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Verify the campaign belongs to this NGO
    if (campaign.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete campaigns you created' });
    }

    await Campaign.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (err) {
    console.error('delete campaign error', err);
    res.status(500).json({ success: false, message: 'Failed to delete campaign' });
  }
});

// Get all campaigns (with optional status filter)
router.get('/all', auth, async (req, res) => {
  try {
    const { status } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const campaigns = await Campaign.find(query)
      .populate('createdBy', 'name email role')
      .sort({ startDate: -1 });

    console.log('GET /all - Found campaigns:', campaigns.length);
    console.log('GET /all - First campaign:', campaigns[0] ? { name: campaigns[0].name, status: campaigns[0].status, createdBy: campaigns[0].createdBy } : 'none');

    // Update status for all campaigns (auto-update based on dates)
    for (const campaign of campaigns) {
      await campaign.updateStatus();
      // Skip validation for old campaigns without createdBy
      await campaign.save({ validateBeforeSave: false });
    }

    res.json({
      success: true,
      count: campaigns.length,
      campaigns
    });
  } catch (err) {
    console.error('get campaigns error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
  }
});

// Get active campaigns only
router.get('/active', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: 'Active' }).sort({ endDate: 1 });

    // Update status
    for (const campaign of campaigns) {
      await campaign.updateStatus();
      await campaign.save();
    }

    const activeCampaigns = campaigns.filter(c => c.isActive());

    res.json({
      success: true,
      count: activeCampaigns.length,
      campaigns: activeCampaigns
    });
  } catch (err) {
    console.error('get active campaigns error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch active campaigns' });
  }
});

// Get single campaign details
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    await campaign.updateStatus();
    await campaign.save();

    // Check if user is participant (skip for admin)
    let isParticipant = false;
    if (req.user.id !== 'admin_hardcoded_id') {
      const user = await User.findById(req.user.id);
      if (user) {
        isParticipant = campaign.isParticipant(req.user.id, user.role);
      }
    }

    res.json({
      success: true,
      campaign,
      isParticipant
    });
  } catch (err) {
    console.error('get campaign error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch campaign' });
  }
});

// Join a campaign
router.post('/:id/join', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (!campaign.isActive()) {
      return res.status(400).json({ success: false, message: 'Campaign is not active' });
    }

    const user = await User.findById(req.user.id);

    // Prevent NGOs from joining campaigns they created
    if (campaign.createdBy.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot join your own campaign' });
    }

    // Check if already participant
    if (campaign.isParticipant(req.user.id, user.role)) {
      return res.status(400).json({ success: false, message: 'Already joined this campaign' });
    }

    // Add participant
    const added = campaign.addParticipant(req.user.id, user.role);

    if (!added) {
      return res.status(400).json({ success: false, message: 'Invalid role or unable to join' });
    }

    await campaign.save();

    res.json({
      success: true,
      message: `Successfully joined campaign as ${user.role}`,
      campaign
    });
  } catch (err) {
    console.error('join campaign error', err);
    res.status(500).json({ success: false, message: 'Failed to join campaign' });
  }
});

// Leave a campaign
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const user = await User.findById(req.user.id);

    // Remove from participants
    let removed = false;

    switch (user.role) {
      case 'Customer':
      case 'Restaurant':
        campaign.participants.donors = campaign.participants.donors.filter(
          d => d.user.toString() !== req.user.id
        );
        removed = true;
        break;
      case 'NGO':
        campaign.participants.ngos = campaign.participants.ngos.filter(
          n => n.user.toString() !== req.user.id
        );
        removed = true;
        break;
      case 'Volunteer':
        campaign.participants.volunteers = campaign.participants.volunteers.filter(
          v => v.user.toString() !== req.user.id
        );
        removed = true;
        break;
    }

    if (removed) {
      await campaign.save();
      res.json({
        success: true,
        message: 'Successfully left campaign',
        campaign
      });
    } else {
      res.status(400).json({ success: false, message: 'Not a participant' });
    }
  } catch (err) {
    console.error('leave campaign error', err);
    res.status(500).json({ success: false, message: 'Failed to leave campaign' });
  }
});

// Log a contribution to campaign
router.post('/:id/log-contribution', auth, async (req, res) => {
  try {
    const { contributionType, value, donationId, orderId } = req.body;

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (!campaign.isActive()) {
      return res.status(400).json({ success: false, message: 'Campaign is not active' });
    }

    const user = await User.findById(req.user.id);

    if (!campaign.isParticipant(req.user.id, user.role)) {
      return res.status(400).json({ success: false, message: 'Not a campaign participant' });
    }

    // Update campaign stats
    if (contributionType === 'donation') {
      campaign.stats.totalMealsDonated += parseInt(value) || 1;
      campaign.stats.totalDonations += 1;
    } else if (contributionType === 'pickup') {
      campaign.stats.totalPickups += 1;
    }

    // Update participant stats
    let participant = null;

    switch (user.role) {
      case 'Customer':
      case 'Restaurant':
        participant = campaign.participants.donors.find(d => d.user.toString() === req.user.id);
        if (participant) {
          participant.contributionStats.mealsContributed += parseInt(value) || 1;
          participant.contributionStats.totalDonations += 1;
        }
        break;
      case 'NGO':
        participant = campaign.participants.ngos.find(n => n.user.toString() === req.user.id);
        if (participant) {
          participant.contributionStats.mealsDistributed += parseInt(value) || 1;
        }
        break;
      case 'Volunteer':
        participant = campaign.participants.volunteers.find(v => v.user.toString() === req.user.id);
        if (participant) {
          participant.contributionStats.pickupsCompleted += 1;
        }
        break;
    }

    await campaign.save();

    res.json({
      success: true,
      message: 'Contribution logged successfully',
      campaign
    });
  } catch (err) {
    console.error('log-contribution error', err);
    res.status(500).json({ success: false, message: 'Failed to log contribution' });
  }
});

// Get campaign statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    await campaign.updateStatus();
    await campaign.save();

    // Calculate progress percentages
    const goalProgress = {
      meals: campaign.goals.targetMeals > 0 
        ? Math.round((campaign.stats.totalMealsDonated / campaign.goals.targetMeals) * 100) 
        : 0,
      donors: campaign.goals.targetDonors > 0 
        ? Math.round((campaign.stats.totalDonors / campaign.goals.targetDonors) * 100) 
        : 0,
      ngos: campaign.goals.targetNGOs > 0 
        ? Math.round((campaign.stats.totalNGOs / campaign.goals.targetNGOs) * 100) 
        : 0
    };

    const stats = {
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      goals: campaign.goals,
      stats: campaign.stats,
      goalProgress,
      participantCounts: {
        donors: campaign.participants.donors.length,
        ngos: campaign.participants.ngos.length,
        volunteers: campaign.participants.volunteers.length
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('get campaign stats error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch campaign stats' });
  }
});

// Get campaign leaderboard
router.get('/:id/leaderboard', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('participants.donors.user', 'name role')
      .populate('participants.ngos.user', 'name organizationName')
      .populate('participants.volunteers.user', 'name');

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Build leaderboards
    const topDonors = campaign.participants.donors
      .map(d => ({
        userId: d.user._id,
        name: d.user.name,
        role: d.user.role,
        mealsContributed: d.contributionStats.mealsContributed,
        totalDonations: d.contributionStats.totalDonations
      }))
      .sort((a, b) => b.mealsContributed - a.mealsContributed)
      .slice(0, 10);

    const topNGOs = campaign.participants.ngos
      .map(n => ({
        userId: n.user._id,
        name: n.user.organizationName || n.user.name,
        mealsDistributed: n.contributionStats.mealsDistributed
      }))
      .sort((a, b) => b.mealsDistributed - a.mealsDistributed)
      .slice(0, 10);

    const topVolunteers = campaign.participants.volunteers
      .map(v => ({
        userId: v.user._id,
        name: v.user.name,
        pickupsCompleted: v.contributionStats.pickupsCompleted
      }))
      .sort((a, b) => b.pickupsCompleted - a.pickupsCompleted)
      .slice(0, 10);

    res.json({
      success: true,
      leaderboard: {
        topDonors,
        topNGOs,
        topVolunteers
      }
    });
  } catch (err) {
    console.error('get leaderboard error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

// Auto-trigger campaigns (cron endpoint - checks dates and activates/completes campaigns)
router.post('/trigger-auto-campaigns', auth, async (req, res) => {
  try {
    const now = new Date();

    // Find all upcoming campaigns that should be activated
    const upcomingCampaigns = await Campaign.find({
      status: 'Upcoming',
      startDate: { $lte: now }
    });

    let activated = 0;

    for (const campaign of upcomingCampaigns) {
      await campaign.updateStatus();
      await campaign.save();
      if (campaign.status === 'Active') {
        activated++;
      }
    }

    // Find all active campaigns that should be completed
    const activeCampaigns = await Campaign.find({
      status: 'Active',
      endDate: { $lt: now }
    });

    let completed = 0;

    for (const campaign of activeCampaigns) {
      await campaign.updateStatus();
      await campaign.save();
      if (campaign.status === 'Completed') {
        completed++;
      }
    }

    // Check for recurring campaigns that need to be recreated
    const recurringCampaigns = await Campaign.find({
      isRecurring: true,
      recurrencePattern: 'Yearly',
      status: 'Completed'
    });

    let recreated = 0;

    for (const campaign of recurringCampaigns) {
      // Check if next occurrence should be created
      const nextYear = new Date(campaign.startDate);
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      // If next occurrence is within the next 30 days and doesn't exist yet
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (nextYear <= thirtyDaysFromNow) {
        // Check if already created
        const existingNext = await Campaign.findOne({
          name: campaign.name,
          type: campaign.type,
          startDate: { $gte: nextYear, $lt: new Date(nextYear.getTime() + 24 * 60 * 60 * 1000) }
        });

        if (!existingNext) {
          // Create next occurrence
          const nextEndDate = new Date(campaign.endDate);
          nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);

          const newCampaign = new Campaign({
            name: campaign.name,
            description: campaign.description,
            type: campaign.type,
            startDate: nextYear,
            endDate: nextEndDate,
            isRecurring: true,
            recurrencePattern: 'Yearly',
            goals: campaign.goals,
            badges: campaign.badges,
            status: 'Upcoming'
          });

          await newCampaign.save();
          recreated++;
        }
      }
    }

    res.json({
      success: true,
      message: `Activated ${activated} campaigns, completed ${completed} campaigns, recreated ${recreated} recurring campaigns`,
      activated,
      completed,
      recreated
    });
  } catch (err) {
    console.error('trigger-auto-campaigns error', err);
    res.status(500).json({ success: false, message: 'Failed to trigger auto campaigns' });
  }
});

// Award badges (can be called manually or by cron)
router.post('/:id/award-badges', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    let badgesAwarded = 0;

    // Check donor badges
    for (const donor of campaign.participants.donors) {
      for (const badge of campaign.badges) {
        // Check if badge already awarded
        if (donor.badges && donor.badges.includes(badge.name)) {
          continue;
        }

        // Simple criteria check (this could be more sophisticated)
        let qualifies = false;

        if (badge.criteria.includes('10 meals')) {
          qualifies = donor.contributionStats.mealsContributed >= 10;
        } else if (badge.criteria.includes('50 meals')) {
          qualifies = donor.contributionStats.mealsContributed >= 50;
        } else if (badge.criteria.includes('100 meals')) {
          qualifies = donor.contributionStats.mealsContributed >= 100;
        }

        if (qualifies) {
          donor.badges = donor.badges || [];
          donor.badges.push(badge.name);
          badgesAwarded++;
        }
      }
    }

    // Check volunteer badges
    for (const volunteer of campaign.participants.volunteers) {
      for (const badge of campaign.badges) {
        if (volunteer.badges && volunteer.badges.includes(badge.name)) {
          continue;
        }

        let qualifies = false;

        if (badge.criteria.includes('5 pickups')) {
          qualifies = volunteer.contributionStats.pickupsCompleted >= 5;
        } else if (badge.criteria.includes('20 pickups')) {
          qualifies = volunteer.contributionStats.pickupsCompleted >= 20;
        }

        if (qualifies) {
          volunteer.badges = volunteer.badges || [];
          volunteer.badges.push(badge.name);
          badgesAwarded++;
        }
      }
    }

    await campaign.save();

    res.json({
      success: true,
      message: `Awarded ${badgesAwarded} badges`,
      badgesAwarded
    });
  } catch (err) {
    console.error('award-badges error', err);
    res.status(500).json({ success: false, message: 'Failed to award badges' });
  }
});

// Create a custom campaign (admin/system use)
router.post('/create', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      startDate,
      endDate,
      isRecurring,
      recurrencePattern,
      goals,
      badges
    } = req.body;

    const campaign = new Campaign({
      name,
      description,
      type: type || 'Custom',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isRecurring: isRecurring || false,
      recurrencePattern: recurrencePattern || 'None',
      goals: goals || {},
      badges: badges || [],
      status: 'Upcoming'
    });

    await campaign.updateStatus();
    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign
    });
  } catch (err) {
    console.error('create campaign error', err);
    res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
});

module.exports = router;
