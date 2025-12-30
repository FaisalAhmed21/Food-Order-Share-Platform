const mongoose = require('mongoose');

const scheduledDonationSchema = new mongoose.Schema({
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
  
  // Schedule Details
  frequency: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly'],
    required: true
  },
  pickupWindow: {
    startTime: { type: String, required: true }, // e.g., "19:00"
    endTime: { type: String, required: true }     // e.g., "21:00"
  },
  
  // For Weekly - specify days
  weekDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  
  // For Monthly - specify day of month
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31
  },
  
  // Food Details
  expectedFoodAmount: {
    type: String,
    default: 'Not specified'
  },
  notesForNGO: {
    type: String,
    default: ''
  },
  foodTypes: [{
    type: String,
    enum: ['Veg', 'Non-Veg', 'Vegan', 'Mixed']
  }],
  
  // Pickup Location
  pickupAddress: {
    street: String,
    area: String,
    city: String,
    zipCode: String,
    fullAddress: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // NGO Subscription
  subscribedNGOs: [{
    ngo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    subscribedAt: Date,
    status: {
      type: String,
      enum: ['Active', 'Paused', 'Cancelled'],
      default: 'Active'
    }
  }],
  
  // Schedule Status
  status: {
    type: String,
    enum: ['Active', 'Paused', 'Cancelled'],
    default: 'Active'
  },
  
  // Stats
  totalPickups: { type: Number, default: 0 },
  missedPickups: { type: Number, default: 0 },
  
  // Reminders Sent
  lastReminderSent: Date,
  
  // Visibility Radius (km)
  visibilityRadius: {
    type: Number,
    default: 20
  }
}, {
  timestamps: true
});

// Index for geospatial queries
scheduledDonationSchema.index({ 'pickupAddress.coordinates': '2dsphere' });
scheduledDonationSchema.index({ donor: 1, status: 1 });
scheduledDonationSchema.index({ status: 1, frequency: 1 });

// Method to check if today matches schedule
scheduledDonationSchema.methods.matchesToday = function() {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfMonth = now.getDate();
  
  if (this.frequency === 'Daily') return true;
  if (this.frequency === 'Weekly') return this.weekDays.includes(dayName);
  if (this.frequency === 'Monthly') return this.dayOfMonth === dayOfMonth;
  return false;
};

// Method to get next pickup time
scheduledDonationSchema.methods.getNextPickupTime = function() {
  const now = new Date();
  const [startHour, startMin] = this.pickupWindow.startTime.split(':').map(Number);
  
  let nextPickup = new Date();
  nextPickup.setHours(startHour, startMin, 0, 0);
  
  // If time already passed today, move to next occurrence
  if (nextPickup <= now) {
    if (this.frequency === 'Daily') {
      nextPickup.setDate(nextPickup.getDate() + 1);
    } else if (this.frequency === 'Weekly') {
      // Find next matching weekday
      for (let i = 1; i <= 7; i++) {
        nextPickup.setDate(nextPickup.getDate() + 1);
        const dayName = nextPickup.toLocaleDateString('en-US', { weekday: 'long' });
        if (this.weekDays.includes(dayName)) break;
      }
    } else if (this.frequency === 'Monthly') {
      nextPickup.setMonth(nextPickup.getMonth() + 1);
      nextPickup.setDate(this.dayOfMonth);
    }
  }
  
  return nextPickup;
};

module.exports = mongoose.model('ScheduledDonation', scheduledDonationSchema);
