const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  foodType: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['kg', 'plates', 'servings', 'pieces'],
    default: 'servings'
  },
  description: {
    type: String,
    required: false
  },
  pickupAddress: {
    type: String,
    required: true
  },
  expiryTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'claimed', 'picked-up', 'completed', 'expired'],
    default: 'available'
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  claimedByName: {
    type: String,
    required: false
  },
  claimedAt: {
    type: Date,
    required: false
  },
  completedAt: {
    type: Date,
    required: false
  },
  mealsServed: {
    type: Number,
    default: 0
  },
  beneficiaries: {
    type: Number,
    default: 0
  },
  acknowledgement: {
    photo: {
      type: String,
      required: false
    },
    note: {
      type: String,
      required: false
    },
    addedAt: {
      type: Date,
      required: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
donationSchema.index({ restaurant: 1, status: 1 });
donationSchema.index({ claimedBy: 1, status: 1 });

module.exports = mongoose.model('Donation', donationSchema);
