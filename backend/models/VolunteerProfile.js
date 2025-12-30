const mongoose = require('mongoose');

const volunteerProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Verification Status
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
    phoneOTP: String,
    phoneOTPExpiry: Date,
    verifiedAt: Date
  },
  
  // Current Location (updated in real-time)
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
  
  // Availability
  isAvailable: {
    type: Boolean,
    default: true
  },
  availableFrom: Date,
  availableUntil: Date,
  
  // Vehicle Information
  hasVehicle: {
    type: Boolean,
    default: false
  },
  vehicleType: {
    type: String,
    enum: ['Bike', 'Scooter', 'Bicycle', 'Car', 'Van', 'None'],
    default: 'None'
  },
  vehicleCapacity: String, // e.g., "2 large bags", "20 kg"
  
  // Self-Assignment Capability
  canSelfAssign: {
    type: Boolean,
    default: false
  },
  
  // Associated NGO
  associatedNGO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGOProfile'
  },
  ngoAssignedAt: Date,
  
  // Service Area
  serviceRadius: {
    type: Number, // in kilometers
    default: 5
  },
  preferredAreas: [String],
  
  // Statistics
  stats: {
    totalPickups: { type: Number, default: 0 },
    successfulPickups: { type: Number, default: 0 },
    cancelledPickups: { type: Number, default: 0 },
    totalDistanceCovered: { type: Number, default: 0 }, // in km
    averageResponseTime: { type: Number, default: 0 }, // in minutes
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 }
  },
  
  // Active Assignments
  activeAssignments: [{
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDonation'
    },
    assignedAt: Date,
    status: {
      type: String,
      enum: ['Assigned', 'En Route', 'Arrived', 'Completed', 'Cancelled']
    }
  }],
  // Pending assignments awaiting volunteer confirmation
  pendingAssignments: [{
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDonation'
    },
    notifiedAt: Date
  }],
  
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

// Geospatial index
volunteerProfileSchema.index({ currentLocation: '2dsphere' });
volunteerProfileSchema.index({ isVerified: 1, isAvailable: 1 });

// Method to check if volunteer can accept high-risk items
volunteerProfileSchema.methods.canAcceptHighRisk = function() {
  return this.isVerified && this.stats.successfulPickups >= 5;
};

// Method to update availability
volunteerProfileSchema.methods.setAvailability = function(available, duration = null) {
  this.isAvailable = available;
  if (available && duration) {
    this.availableFrom = new Date();
    this.availableUntil = new Date(Date.now() + duration * 60 * 60 * 1000); // duration in hours
  }
  return this.save();
};

// Method to calculate distance from a point
volunteerProfileSchema.methods.distanceFrom = function(lat, lng) {
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

module.exports = mongoose.model('VolunteerProfile', volunteerProfileSchema);
