const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Mains', 'Starters', 'Sides', 'Desserts', 'Beverages', 'BBQ', 'Pizza', 'Burgers', 'Biryani', 'Chinese', 'Thai', 'Continental', 'Salads', 'Breakfast', 'Snacks', 'Combo Meals', 'Vegetarian', 'Seafood', 'Chicken', 'Japanese', 'Soups']
  },
  available: {
    type: Boolean,
    default: true
  },
  badges: {
    type: [String],
    default: []
  },
  image: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  dietary: {
    type: [String],
    default: ['Halal']
  },
  spiceLevel: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  sizes: [{
    name: String,
    price: Number
  }],
  addons: [{
    name: String,
    price: Number
  }],
  allergens: [{
    type: String
  }],
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  preparationTime: {
    type: Number,
    default: 15
  },
  isVegetarian: {
    type: Boolean,
    default: false
  },
  isVegan: {
    type: Boolean,
    default: false
  },
  customizations: [{
    name: String,
    options: [String],
    required: Boolean
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingSum: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  discountPrice: {
    type: Number
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  branch: {
    type: String,
    default: 'All Branches',
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
menuItemSchema.index({ restaurant: 1, category: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });
menuItemSchema.index({ available: 1 });
menuItemSchema.index({ rating: -1 });
menuItemSchema.index({ totalOrders: -1 });

// Generate slug before saving
menuItemSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
