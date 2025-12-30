const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Campaign Creator (NGO)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Campaign Type
  type: {
    type: String,
    enum: ['Ramadan', 'Winter', 'Zero Waste', 'Festival', 'Emergency', 'Custom'],
    required: true
  },
  
  // Auto-trigger dates (for predefined campaigns)
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Recurrence (for annual campaigns)
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['Yearly', 'None'],
    default: 'None'
  },
  
  // Campaign Goals
  goals: {
    targetMeals: { type: Number, default: 0 },
    targetDonors: { type: Number, default: 0 },
    targetNGOs: { type: Number, default: 0 }
  },
  
  // Current Stats
  stats: {
    totalMealsDonated: { type: Number, default: 0 },
    totalDonors: { type: Number, default: 0 },
    totalNGOs: { type: Number, default: 0 },
    totalVolunteers: { type: Number, default: 0 },
    totalPickups: { type: Number, default: 0 }
  },
  
  // Participants
  participants: {
    donors: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userType: { type: String, enum: ['Customer', 'Restaurant'] },
      joinedAt: Date,
      contributionStats: {
        mealsDonated: { type: Number, default: 0 },
        totalDonationValue: { type: Number, default: 0 },
        pickupsCompleted: { type: Number, default: 0 }
      },
      badge: { type: String, enum: ['Gold', 'Silver', 'Bronze', null], default: null }
    }],
    ngos: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      joinedAt: Date,
      contributionStats: {
        pickupsCompleted: { type: Number, default: 0 },
        mealsCollected: { type: Number, default: 0 }
      }
    }],
    volunteers: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      joinedAt: Date,
      contributionStats: {
        pickupsCompleted: { type: Number, default: 0 }
      }
    }]
  },
  
  // Badge & Certificates
  badges: [{
    name: String,
    description: String,
    criteria: String, // e.g., "10+ donations"
    imageUrl: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ['Upcoming', 'Active', 'Completed', 'Archived'],
    default: 'Upcoming'
  },
  
  // Auto-donation feature
  autoDonationEnabled: {
    type: Boolean,
    default: true
  },
  
  // Special offers
  specialOffers: [{
    type: String
  }],
  
  // Banner/Images
  bannerImage: String,
  
  // Notifications
  notificationsSent: [{
    type: { type: String, enum: ['Launch', 'Milestone', 'Ending', 'Complete'] },
    sentAt: Date,
    recipientCount: Number
  }]
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ status: 1, startDate: 1, endDate: 1 });
campaignSchema.index({ type: 1, status: 1 });

// Method to check if campaign is currently active
campaignSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'Active' && now >= this.startDate && now <= this.endDate;
};

// Method to update campaign status based on dates
campaignSchema.methods.updateStatus = async function() {
  const now = new Date();
  const previousStatus = this.status;
  
  if (now < this.startDate) {
    this.status = 'Upcoming';
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = 'Active';
  } else if (now > this.endDate) {
    this.status = 'Completed';
    
    // Auto-assign badges if campaign just completed
    if (previousStatus !== 'Completed' && this.participants.donors.length > 0) {
      try {
        await this.assignBadges();
        console.log(`✅ Badges auto-assigned for campaign: ${this.name}`);
      } catch (error) {
        console.error(`❌ Error auto-assigning badges for campaign ${this.name}:`, error);
      }
    }
  }
  
  return this.status;
};

// Method to assign badges to top 3 donors
campaignSchema.methods.assignBadges = async function() {
  const User = require('./User');
  
  // Sort donors by total donation value
  const sortedDonors = this.participants.donors
    .filter(d => d.contributionStats.totalDonationValue > 0)
    .sort((a, b) => b.contributionStats.totalDonationValue - a.contributionStats.totalDonationValue);
  
  // Assign badges to top 3 donors
  const badgeAssignments = [];
  const badges = ['Gold', 'Silver', 'Bronze'];
  
  for (let i = 0; i < Math.min(3, sortedDonors.length); i++) {
    const donor = sortedDonors[i];
    donor.badge = badges[i];
    
    // Update user's badge collection
    try {
      const user = await User.findById(donor.user);
      if (user) {
        // Check if badge already exists for this campaign
        const existingBadgeIndex = user.campaignBadges.findIndex(
          b => b.campaign && b.campaign.toString() === this._id.toString()
        );
        
        const badgeData = {
          campaign: this._id,
          badge: badges[i],
          earnedAt: new Date(),
          campaignName: this.name,
          donationAmount: donor.contributionStats.totalDonationValue
        };
        
        if (existingBadgeIndex >= 0) {
          // Update existing badge
          user.campaignBadges[existingBadgeIndex] = badgeData;
        } else {
          // Add new badge
          user.campaignBadges.push(badgeData);
        }
        
        await user.save();
        
        badgeAssignments.push({
          userId: donor.user,
          badge: badges[i],
          donationAmount: donor.contributionStats.totalDonationValue
        });
      }
    } catch (error) {
      console.error(`Error assigning badge to user ${donor.user}:`, error);
    }
  }
  
  return badgeAssignments;
};

campaignSchema.methods.isParticipant = function(userId, role) {
  const roleMap = {
    'Customer': 'donors',
    'Restaurant': 'donors',
    'NGO': 'ngos',
    'Volunteer': 'volunteers'
  };
  
  const participantList = this.participants[roleMap[role]] || [];
  return participantList.some(p => p.user.toString() === userId.toString());
};

// Method to add participant
campaignSchema.methods.addParticipant = function(userId, role) {
  const roleMap = {
    'Customer': 'donors',
    'Restaurant': 'donors',
    'NGO': 'ngos',
    'Volunteer': 'volunteers'
  };
  
  const participantList = this.participants[roleMap[role]];
  if (!participantList) return false;
  
  if (!this.isParticipant(userId, role)) {
    participantList.push({
      user: userId,
      joinedAt: new Date(),
      contributionStats: {
        mealsDonated: 0,
        pickupsCompleted: 0,
        mealsCollected: 0
      }
    });
    
    // Update total count
    if (role === 'NGO') this.stats.totalNGOs++;
    else if (role === 'Volunteer') this.stats.totalVolunteers++;
    else this.stats.totalDonors++;
    
    return true;
  }
  return false;
};

module.exports = mongoose.model('Campaign', campaignSchema);
