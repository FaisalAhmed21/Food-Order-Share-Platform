const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    name: String,
    price: Number,
    quantity: Number,
    customizations: {
      size: String,
      spiceLevel: String,
      addons: [String],
      instructions: String
    },
    subtotal: Number
  }],
  deliveryAddress: {
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
  contactPhone: String,
  deliveryPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPerson'
  },
  deliveryAssignmentAttempts: {
    type: Number,
    default: 0
  },
  deliveryAssignmentStatus: {
    type: String,
    enum: ['searching', 'assigned', 'no_delivery_person', 'cancelled'],
    default: 'searching'
  },
  deliveryAssignmentMessage: {
    type: String,
    default: 'Searching for delivery person...'
  },
  pricing: {
    subtotal: Number,
    deliveryFee: Number,
    tax: Number,
    discount: Number,
    donationAmount: { type: Number, default: 0 },
    total: Number
  },
  
  // Donation Information
  donation: {
    amount: { type: Number, default: 0 },
    ngo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NGOProfile'
    },
    ngoName: String,
    donatedAt: Date,
    transferredToNGO: { type: Boolean, default: false }
  },
  
  // Order Type
  orderType: {
    type: String,
    enum: ['self', 'donate', 'both'], // self = for me, donate = donate meal, both = order + donate
    default: 'self'
  },
  
  payment: {
    method: {
      type: String,
      enum: ['stripe', 'cash', 'bkash'],
      default: 'stripe'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    stripePaymentIntentId: String,
    stripeTransferId: String,
    paidAt: Date,
    transactionId: String,
    amountInBDT: Number,
    amountInUSD: Number,
    // Payment split information
    restaurantAmount: Number, // Amount restaurant receives
    donationAmount: Number, // Amount sent to NGO
    platformFee: Number // Platform fee if any
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: Date,
    note: String
  }],
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  notes: String,
  cancellationReason: String,
  deliveryPersonRating: {
    type: Number,
    min: 1,
    max: 5
  },
  deliveryPersonReview: String,
  deliveryPersonReviewedAt: Date,
  itemReviews: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    reviewedAt: Date
  }],
  statusTimestamps: {
    pending: Date,
    confirmed: Date,
    preparing: Date,
    ready: Date,
    out_for_delivery: Date,
    delivered: Date
  },
  currentStage: {
    type: String,
    enum: ['To Restaurant', 'Preparing', 'Ready to Pickup', 'Rider En Route', 'Reached'],
    default: 'To Restaurant'
  },
  stageStartTime: Date
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${Date.now()}${String(count + 1).padStart(4, '0')}`;
    
    // Add initial status to history
    this.statusHistory.push({
      status: 'pending',
      timestamp: new Date(),
      note: 'Order placed'
    });
  }
  next();
});

// Index for faster queries
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'donation.ngo': 1, createdAt: -1 }); // For NGO donations query

module.exports = mongoose.model('Order', orderSchema);
