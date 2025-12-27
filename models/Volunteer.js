const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ngoName: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: false
  },
  availability: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Weekends', 'Flexible'],
    default: 'Flexible'
  },
  skills: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-assignment'],
    default: 'active'
  },
  currentAssignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: false
  },
  totalAssignments: {
    type: Number,
    default: 0
  },
  completedAssignments: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const assignmentSchema = new mongoose.Schema({
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer',
    required: true
  },
  volunteerName: {
    type: String,
    required: true
  },
  donation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: false
  },
  taskType: {
    type: String,
    enum: ['Pickup', 'Distribution', 'Both'],
    required: true
  },
  taskDescription: {
    type: String,
    required: true
  },
  pickupLocation: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  distributionLocation: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  estimatedDuration: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['assigned', 'accepted', 'in-progress', 'completed', 'cancelled'],
    default: 'assigned'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  notes: {
    type: String,
    required: false
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  acceptedAt: {
    type: Date,
    required: false
  },
  startedAt: {
    type: Date,
    required: false
  },
  completedAt: {
    type: Date,
    required: false
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: false
    },
    comment: {
      type: String,
      required: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
volunteerSchema.index({ ngo: 1, status: 1 });
assignmentSchema.index({ ngo: 1, volunteer: 1 });
assignmentSchema.index({ volunteer: 1, status: 1 });

const Volunteer = mongoose.model('Volunteer', volunteerSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = { Volunteer, Assignment };
