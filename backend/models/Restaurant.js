const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true
  },
  cuisine: {
    type: [String],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  deliveryTime: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    default: 50
  },
  minimumOrder: {
    type: Number,
    default: 0
  },
  priceRange: {
    type: String,
    enum: ['৳', '৳৳', '৳৳৳'],
    default: '৳৳'
  },
  status: {
    type: String,
    enum: ['Open', 'Closed', 'Temporarily Closed'],
    default: 'Open'
  },
  badges: {
    type: [String],
    default: []
  },
  image: {
    type: String,
    required: true
  },
  heroImage: {
    type: String
  },
  logo: {
    type: String
  },
  address: {
    street: String,
    area: String,
    city: String,
    zipCode: String,
    fullAddress: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [90.4125, 23.8103] // Dhaka coordinates
    }
  },
  dietary: {
    type: [String],
    default: ['Halal']
  },
  distance: {
    type: Number,
    default: 0
  },
  openingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    tradeLicenseNumber: String,
    foodSafetyLicense: String,
    businessRegistration: String,
    tinNumber: String,
    documentPDF: String, // PDF file path
    uploadedAt: Date
  }],
  verificationMark: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featuredUntil: {
    type: Date
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  avgPreparationTime: {
    type: Number,
    default: 30
  },
  tags: [String],
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String
  },
  stripeAccountId: {
    type: String,
    sparse: true
  },
  bankAccount: {
    accountNumber: String,
    accountHolderName: String,
    bankName: String,
    routingNumber: String
  },
  branches: [{
    name: {
      type: String,
      required: true
    },
    address: String,
    phone: String
  }]
}, {
  timestamps: true
});

// Index for location-based queries
restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ deliveryTime: 1 });
restaurantSchema.index({ cuisine: 1 });

// Generate slug before saving
restaurantSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
