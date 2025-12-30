const mongoose = require('mongoose');

const deliveryPersonSchema = new mongoose.Schema({
  // User reference (for volunteers)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Basic Info
  name: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  
  // Verification (merged from VolunteerProfile)
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDetails: {
    governmentId: {
      type: String,
      url: String,
      uploadedAt: Date
    },
    phoneVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date
  },
  
  // Vehicle Information
  vehicleType: {
    type: String,
    enum: ['bike', 'bicycle', 'scooter', 'car', 'van', 'none'],
    default: 'bike'
  },
  vehicleNumber: String,
  vehicleCapacity: String,
  
  // Status & Availability
  status: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'available'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  availableFrom: Date,
  availableUntil: Date,
  
  // Location
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [90.4125, 23.8103] // Default Dhaka coordinates
    }
  },
  lastLocationUpdate: Date,
  
  // Service Area
  serviceRadius: {
    type: Number, // in kilometers
    default: 5
  },
  preferredAreas: [String],
  
  // Current Assignment
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  currentDonation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDonation'
  },
  
  // Associated NGO (for volunteers)
  associatedNGO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGOProfile'
  },
  
  // Self-Assignment Capability
  canSelfAssign: {
    type: Boolean,
    default: false
  },
  
  // Statistics
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  ratingSum: {
    type: Number,
    default: 0
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  totalPickups: {
    type: Number,
    default: 0
  },
  successfulPickups: {
    type: Number,
    default: 0
  },
  cancelledPickups: {
    type: Number,
    default: 0
  },
  totalDistanceCovered: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number,
    default: 0
  },
  
  // Earnings
  earnings: {
    today: { type: Number, default: 0 },
    thisWeek: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // Activity
  lastActive: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  
  // Contact Preferences
  notificationPreferences: {
    sms: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },
  
  // Emergency Contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}, {
  timestamps: true
});

// Index for geospatial queries
deliveryPersonSchema.index({ currentLocation: '2dsphere' });
deliveryPersonSchema.index({ status: 1, isOnline: 1 });
deliveryPersonSchema.index({ isVerified: 1, isAvailable: 1 });

// Method to check if can accept high-risk items
deliveryPersonSchema.methods.canAcceptHighRisk = function() {
  return this.isVerified && this.successfulPickups >= 5;
};

// Method to update availability
deliveryPersonSchema.methods.setAvailability = function(available, duration = null) {
  this.isAvailable = available;
  if (available && duration) {
    this.availableFrom = new Date();
    this.availableUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
  }
  return this.save();
};

// Method to calculate distance from a point
deliveryPersonSchema.methods.distanceFrom = function(lat, lng) {
  const [volLng, volLat] = this.currentLocation.coordinates;
  const R = 6371; // Earth's radius in km
  
  const dLat = (lat - volLat) * Math.PI / 180;
  const dLon = (lng - volLng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(volLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

module.exports = mongoose.model('DeliveryPerson', deliveryPersonSchema);
