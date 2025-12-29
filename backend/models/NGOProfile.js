const mongoose = require('mongoose');

const ngoProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  ngoName: {
    type: String,
    required: true
  },
  registrationNumber: {
    type: String,
    required: false
  },
  
  // Location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  address: {
    street: String,
    area: String,
    city: String,
    zipCode: String,
    fullAddress: String
  },
  
  // Verification Status
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String,
    url: String,
    uploadedAt: Date
  }],
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Operating Details
  operatingHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  
  // Accepted Items
  acceptedItems: {
    veg: { type: Boolean, default: true },
    nonVeg: { type: Boolean, default: false },
    vegan: { type: Boolean, default: true },
    dryFoods: { type: Boolean, default: true },
    cookedMeals: { type: Boolean, default: true },
    rawIngredients: { type: Boolean, default: false }
  },
  
  // Capacity Management
  serviceRadius: {
    type: Number, // in kilometers
    default: 10
  },
  currentCapacity: {
    type: String,
    enum: ['Low', 'Medium', 'Full'],
    default: 'Low'
  },
  isAcceptingItems: {
    type: Boolean,
    default: true
  },
  temporarilyFullUntil: Date,
  
  // Contact Information
  contactPhone: String,
  contactEmail: String,
  contactPerson: String,
  
  // Statistics
  stats: {
    totalPickups: { type: Number, default: 0 },
    successfulPickups: { type: Number, default: 0 },
    cancelledPickups: { type: Number, default: 0 },
    totalMealsCollected: { type: Number, default: 0 },
    trustScore: { type: Number, default: 100, min: 0, max: 100 }
  },
  
  // Volunteers Associated
  volunteers: [{
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date,
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    }
  }],
  
  // Description
  description: String,
  facilities: [String], // e.g., ["Refrigeration", "Dry Storage", "Vehicle Available"]
  
  // Public Visibility
  isPubliclyVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
ngoProfileSchema.index({ location: '2dsphere' });
ngoProfileSchema.index({ isVerified: 1, isAcceptingItems: 1 });

// Method to check if NGO is currently accepting items
ngoProfileSchema.methods.canAcceptItems = function() {
  if (!this.isAcceptingItems) return false;
  if (this.currentCapacity === 'Full') return false;
  if (this.temporarilyFullUntil && new Date() < this.temporarilyFullUntil) return false;
  return true;
};

// Method to check if NGO accepts specific food type
ngoProfileSchema.methods.acceptsFoodType = function(foodType) {
  const typeMap = {
    'Veg': 'veg',
    'Non-Veg': 'nonVeg',
    'Vegan': 'vegan',
    'Mixed': 'veg' // Mixed requires at least veg acceptance
  };
  
  return this.acceptedItems[typeMap[foodType]] === true;
};

// Method to update trust score
ngoProfileSchema.methods.updateTrustScore = function() {
  const total = this.stats.totalPickups;
  if (total === 0) {
    this.stats.trustScore = 100;
    return 100;
  }
  
  const successRate = (this.stats.successfulPickups / total) * 100;
  this.stats.trustScore = Math.round(successRate);
  return this.stats.trustScore;
};

module.exports = mongoose.model('NGOProfile', ngoProfileSchema);
