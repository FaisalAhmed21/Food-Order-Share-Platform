const mongoose = require('mongoose');

const foodDonationSchema = new mongoose.Schema({
  // Donor information (can be customer or restaurant)
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorType: {
    type: String,
    enum: ['customer', 'restaurant', 'Customer', 'Restaurant'],
    required: true
  },
  
  // Type of donation
  donationType: {
    type: String,
    enum: ['surplus', 'paid'], // surplus = donate existing food, paid = order food to donate
    default: 'surplus'
  },
  
  // NGO receiving the donation
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ngoName: String, // Cached NGO name
  
  // For surplus food donations
  title: String,
  quantity: String,
  servings: Number,
  foodType: {
    type: String,
    enum: ['Veg', 'Non-Veg', 'Vegan', 'Mixed']
  },
  freshnessLevel: {
    type: String,
    enum: ['Just Cooked', 'Today', 'Leftover']
  },
  expiryDateTime: Date,
  productionTime: Date,
  shelfLifeDuration: Number,
  storageCondition: String,
  description: String,
  photos: [{
    url: String
  }],
  pickupWindow: {
    from: Date,
    to: Date
  },
  safetyChecklist: {
    properlyPacked: Boolean,
    noContamination: Boolean,
    safeTempStorage: Boolean,
    correctExpiry: Boolean,
    pickupReady: Boolean
  },
  packagingProvided: Boolean,
  packagingInfo: String,
  hasUncertainty: Boolean,
  warningAccepted: Boolean,
  urgencyLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // For paid food donations (ordering food to donate)
  items: [{
    name: { type: String },
    quantity: { type: Number, min: 1 },
    price: { type: Number, min: 0 },
    description: String
  }],
  
  // Restaurant (if customer is donating restaurant food)
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  
  // Pricing (only for paid donations)
  pricing: {
    subtotal: { type: Number, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, min: 0 }
  },
  
  // Delivery information
  deliveryPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPerson'
  },
  deliveryAssignmentStatus: {
    type: String,
    enum: ['pending', 'assigned', 'failed'],
    default: 'pending'
  },
  deliveryAssignmentMessage: String,
  
  // Addresses
  pickupAddress: {
    street: String,
    area: String,
    city: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  deliveryAddress: { // NGO address
    street: String,
    area: String,
    city: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Contact information
  donorPhone: String,
  ngoPhone: String,
  
  // Donation stages (4 stages)
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'picking_up', 'picked_up', 'delivering', 'delivered', 'cancelled'],
    default: 'pending'
  },
  currentStage: {
    type: String,
    enum: ['Moving for Pickup', 'Picked Up', 'Moving to NGO', 'Reached'],
    default: 'Moving for Pickup'
  },
  stageStartTime: Date, // When current stage started
  
  // Status history
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }],
  
  statusTimestamps: {
    pending: Date,
    confirmed: Date,
    picking_up: Date,
    picked_up: Date,
    delivering: Date,
    delivered: Date,
    cancelled: Date
  },
  
  // Payment
  payment: {
    method: {
      type: String,
      enum: ['card', 'cash', 'online'],
      default: 'card'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    amount: Number,
    transactionId: String,
    paidAt: Date
  },
  
  // Special instructions
  specialInstructions: String,
  
  // Cancellation
  cancellationReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  
  // Completion
  completedAt: Date,
  
}, {
  timestamps: true
});

// Indexes for faster queries
foodDonationSchema.index({ donor: 1, createdAt: -1 });
foodDonationSchema.index({ ngo: 1, createdAt: -1 });
foodDonationSchema.index({ restaurant: 1, createdAt: -1 });
foodDonationSchema.index({ deliveryPerson: 1, status: 1 });
foodDonationSchema.index({ status: 1, createdAt: -1 });

// Virtual for donation ID display
foodDonationSchema.virtual('donationNumber').get(function() {
  return `FD${this._id.toString().slice(-8).toUpperCase()}`;
});

// Method to calculate urgency level based on expiry time
foodDonationSchema.methods.updateUrgency = function() {
  if (!this.expiryDateTime) {
    this.urgencyLevel = 0;
    return;
  }

  const now = new Date();
  const expiry = new Date(this.expiryDateTime);
  const timeLeft = expiry - now; // milliseconds
  const hoursLeft = timeLeft / (1000 * 60 * 60);

  if (hoursLeft <= 0) {
    // Expired
    this.urgencyLevel = 100;
  } else if (hoursLeft <= 1) {
    // Less than 1 hour - CRITICAL
    this.urgencyLevel = 90;
  } else if (hoursLeft <= 2) {
    // 1-2 hours - VERY HIGH
    this.urgencyLevel = 75;
  } else if (hoursLeft <= 4) {
    // 2-4 hours - HIGH
    this.urgencyLevel = 60;
  } else if (hoursLeft <= 8) {
    // 4-8 hours - MEDIUM
    this.urgencyLevel = 40;
  } else if (hoursLeft <= 24) {
    // 8-24 hours - LOW
    this.urgencyLevel = 20;
  } else {
    // More than 24 hours - VERY LOW
    this.urgencyLevel = 10;
  }
};

// Ensure virtuals are included in JSON
foodDonationSchema.set('toJSON', { virtuals: true });
foodDonationSchema.set('toObject', { virtuals: true });

const FoodDonation = mongoose.model('FoodDonation', foodDonationSchema);

module.exports = FoodDonation;
