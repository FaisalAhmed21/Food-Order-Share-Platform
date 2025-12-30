const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  // Delivery Person
  deliveryPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPerson',
    required: true
  },
  
  // Assignment Type
  type: {
    type: String,
    enum: ['food_order', 'food_donation'],
    required: true
  },
  
  // Related Order or Donation
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  donation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDonation'
  },
  
  // Pickup Information
  pickupLocation: {
    name: String, // Restaurant or Donor name
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Delivery Information
  deliveryLocation: {
    name: String, // Customer or NGO name
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'cod'], // cod = cash on delivery
    default: 'pending'
  },
  
  // Order Details
  items: [{
    name: String,
    quantity: Number,
    price: Number
  }],
  
  totalAmount: {
    type: Number,
    default: 0
  },
  
  // Assignment Status
  status: {
    type: String,
    enum: ['assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered', 'cancelled'],
    default: 'assigned'
  },
  
  // Timestamps
  assignedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: Date,
  pickedUpAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  
  // Notes
  notes: String,
  cancellationReason: String,
  
  // Distance
  estimatedDistance: Number, // in km
  actualDistance: Number, // in km
  
  // Customer/Recipient Contact
  recipientName: String,
  recipientPhone: String,
  
  // Delivery Instructions
  deliveryInstructions: String
}, {
  timestamps: true
});

// Indexes
assignmentSchema.index({ deliveryPerson: 1, status: 1 });
assignmentSchema.index({ order: 1 });
assignmentSchema.index({ donation: 1 });
assignmentSchema.index({ status: 1, assignedAt: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema);

