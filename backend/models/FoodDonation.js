const mongoose = require('mongoose');

const foodDonationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorType: {
    type: String,
    enum: ['Customer', 'Restaurant'],
    required: true
  },
  // Food Details
  title: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: String,
    required: true
  },
  servings: {
    type: Number,
    required: true
  },
  foodType: {
    type: String,
    enum: ['Veg', 'Non-Veg', 'Vegan', 'Mixed'],
    required: true
  },
  freshnessLevel: {
    type: String,
    enum: ['Just Cooked', 'Today', 'Leftover'],
    required: true
  },
  expiryDateTime: {
    type: Date,
    required: true
  },
  // Smart Expiry Management
  productionTime: {
    type: Date,
    required: false
  },
  shelfLifeDuration: {
    type: Number, // in hours
    required: false
  },
  storageCondition: {
    type: String,
    enum: ['Room Temperature', 'Refrigerated', 'Frozen'],
    default: 'Room Temperature'
  },
  expiryAlerts: [{
    alertType: { type: String, enum: ['6hours', '2hours', '30minutes'], required: true },
    triggeredAt: { type: Date, required: true },
    acknowledged: { type: Boolean, default: false }
  }],
  donorActionsTaken: [{
    action: { type: String, enum: ['donated', 'discounted', 'quick_pickup', 'finished_early', 'archived'], required: true },
    takenAt: { type: Date, default: Date.now },
    notes: String
  }],
  flashDiscount: {
    enabled: { type: Boolean, default: false },
    percentage: { type: Number, min: 0, max: 100, default: 0 }
  },
  description: {
    type: String,
    default: ''
  },
  
  // Photos
  photos: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Pickup Details
  pickupAddress: {
    street: String,
    area: String,
    city: String,
    zipCode: String,
    fullAddress: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },
  pickupWindow: {
    from: {
      type: Date,
      required: true
    },
    to: {
      type: Date,
      required: true
    }
  },
  
  // Safety Checklist
  safetyChecklist: {
    properlyPacked: { type: Boolean, default: false },
    noContamination: { type: Boolean, default: false },
    safeTempStorage: { type: Boolean, default: false },
    correctExpiry: { type: Boolean, default: false },
    pickupReady: { type: Boolean, default: false }
  },
  packagingProvided: { type: Boolean, default: false },
  packagingInfo: { type: String, default: '' },
  hasUncertainty: {
    type: Boolean,
    default: false
  },
  warningAccepted: {
    type: Boolean,
    default: false
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['Available', 'Claimed', 'Picked Up', 'Completed', 'Expired', 'Cancelled', 'Archived'],
    default: 'Available'
  },
  urgencyLevel: {
    type: String,
    enum: ['Normal', 'Approaching', 'Urgent'],
    default: 'Normal'
  },
  
  // Claim Details
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  claimedAt: Date,
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Pickup Proof
  pickupProof: [{
    url: String,
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  pickedUpAt: Date,
  completedAt: Date,
  
  // Visibility & Notifications
  notifiedNGOs: [{
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notifiedAt: Date
  }],
  notifiedVolunteers: [{
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notifiedAt: Date
  }],
  
  // Additional Options
  conversionOptions: {
    canConvertToSale: { type: Boolean, default: false },
    volunteerRequested: { type: Boolean, default: false },
    pickupExtended: { type: Boolean, default: false },
    compostingRequested: { type: Boolean, default: false }
  },
  // Fallback suggestion flag
  fallbackSuggested: { type: Boolean, default: false },
  
  // Auto-expiry tracking
  expiryWarningsSent: { type: Number, default: 0 },
  autoExpired: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Index for geospatial queries (GeoJSON format)
foodDonationSchema.index({ 'pickupAddress.coordinates': '2dsphere' });

// Index for status and expiry queries
foodDonationSchema.index({ status: 1, expiryDateTime: 1 });
foodDonationSchema.index({ donor: 1, status: 1 });

// Method to calculate urgency
foodDonationSchema.methods.updateUrgency = function() {
  const now = new Date();
  const timeLeft = this.expiryDateTime - now;
  const hoursLeft = timeLeft / (1000 * 60 * 60);
  
  if (hoursLeft <= 0.5) {
    this.urgencyLevel = 'Urgent';
  } else if (hoursLeft <= 6) {
    this.urgencyLevel = 'Approaching';
  } else {
    this.urgencyLevel = 'Normal';
  }
  
  return this.urgencyLevel;
};

// Method to check if expired
foodDonationSchema.methods.isExpired = function() {
  return new Date() > this.expiryDateTime;
};

// Method to calculate time left in minutes
foodDonationSchema.methods.getTimeLeftMinutes = function() {
  const now = new Date();
  const diff = this.expiryDateTime - now;
  return Math.floor(diff / (1000 * 60));
};

// Method to get expiry status label
foodDonationSchema.methods.getExpiryStatus = function() {
  const minutesLeft = this.getTimeLeftMinutes();
  if (minutesLeft <= 0) return 'Expired';
  if (minutesLeft <= 30) return '⏳ Urgent: 30 min left';
  if (minutesLeft <= 120) return '⚠️ Expires in 2 hours';
  if (minutesLeft <= 360) return '⚠️ Approaching Expiry';
  return 'Fresh';
};

// Method to check if alert should be triggered
foodDonationSchema.methods.shouldTriggerAlert = function(alertType) {
  const minutesLeft = this.getTimeLeftMinutes();
  const thresholds = { '6hours': 360, '2hours': 120, '30minutes': 30 };
  const threshold = thresholds[alertType];
  if (!threshold) return false;
  
  // Check if alert already triggered
  const existing = this.expiryAlerts.find(a => a.alertType === alertType);
  if (existing) return false;
  
  return minutesLeft <= threshold && minutesLeft > 0;
};

module.exports = mongoose.model('FoodDonation', foodDonationSchema);
