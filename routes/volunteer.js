const express = require('express');
const router = express.Router();
const { Volunteer, Assignment } = require('../models/Volunteer');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    req.userRole = user.role;
    req.userName = user.name || user.organizationName;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all volunteers for an NGO
router.get('/volunteers', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can access this endpoint' });
    }

    const volunteers = await Volunteer.find({ ngo: req.userId })
      .populate('currentAssignment')
      .sort({ createdAt: -1 });

    res.json({ success: true, volunteers });
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new volunteer
router.post('/volunteers', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can add volunteers' });
    }

    const { name, email, phone, address, availability, skills } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }

    const volunteer = new Volunteer({
      ngo: req.userId,
      ngoName: req.userName,
      name,
      email,
      phone,
      address,
      availability: availability || 'Flexible',
      skills: skills || []
    });

    await volunteer.save();

    res.status(201).json({ 
      success: true, 
      message: 'Volunteer added successfully',
      volunteer 
    });
  } catch (error) {
    console.error('Error adding volunteer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update volunteer
router.patch('/volunteers/:id', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can update volunteers' });
    }

    const volunteer = await Volunteer.findOne({ 
      _id: req.params.id, 
      ngo: req.userId 
    });

    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    const { name, email, phone, address, availability, skills, status } = req.body;

    if (name) volunteer.name = name;
    if (email) volunteer.email = email;
    if (phone) volunteer.phone = phone;
    if (address) volunteer.address = address;
    if (availability) volunteer.availability = availability;
    if (skills) volunteer.skills = skills;
    if (status) volunteer.status = status;

    await volunteer.save();

    res.json({ 
      success: true, 
      message: 'Volunteer updated successfully',
      volunteer 
    });
  } catch (error) {
    console.error('Error updating volunteer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete volunteer
router.delete('/volunteers/:id', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can delete volunteers' });
    }

    const volunteer = await Volunteer.findOneAndDelete({ 
      _id: req.params.id, 
      ngo: req.userId 
    });

    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    res.json({ 
      success: true, 
      message: 'Volunteer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting volunteer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all assignments for an NGO
router.get('/assignments', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can access this endpoint' });
    }

    const assignments = await Assignment.find({ ngo: req.userId })
      .populate('volunteer')
      .populate('donation')
      .sort({ scheduledDate: -1 });

    res.json({ success: true, assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new assignment
router.post('/assignments', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can create assignments' });
    }

    const {
      volunteerId,
      donationId,
      taskType,
      taskDescription,
      pickupLocation,
      distributionLocation,
      scheduledDate,
      estimatedDuration,
      priority,
      notes
    } = req.body;

    if (!volunteerId || !taskType || !taskDescription || !scheduledDate) {
      return res.status(400).json({ 
        message: 'Volunteer, task type, description, and scheduled date are required' 
      });
    }

    const volunteer = await Volunteer.findOne({ 
      _id: volunteerId, 
      ngo: req.userId 
    });

    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    // If donation is linked, verify and update it
    if (donationId) {
      const Donation = require('../models/Donation');
      const donation = await Donation.findOne({
        _id: donationId,
        claimedBy: req.userId
      });

      if (!donation) {
        return res.status(404).json({ message: 'Donation not found or not claimed by your NGO' });
      }

      // Update donation status to picked-up when volunteer is assigned
      donation.status = 'picked-up';
      await donation.save();
    }

    const assignment = new Assignment({
      ngo: req.userId,
      volunteer: volunteerId,
      volunteerName: volunteer.name,
      donation: donationId || undefined,
      taskType,
      taskDescription,
      pickupLocation,
      distributionLocation,
      scheduledDate: new Date(scheduledDate),
      estimatedDuration,
      priority: priority || 'medium',
      notes
    });

    await assignment.save();

    // Update volunteer status and assignment
    volunteer.status = 'on-assignment';
    volunteer.currentAssignment = assignment._id;
    volunteer.totalAssignments += 1;
    await volunteer.save();

    res.status(201).json({ 
      success: true, 
      message: 'Assignment created successfully',
      assignment 
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update assignment status
router.patch('/assignments/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user owns this assignment
    if (req.userRole === 'NGO' && assignment.ngo.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this assignment' });
    }

    assignment.status = status;
    
    if (status === 'accepted') {
      assignment.acceptedAt = new Date();
    } else if (status === 'in-progress') {
      assignment.startedAt = new Date();
    } else if (status === 'completed') {
      assignment.completedAt = new Date();
      
      // Update volunteer
      const volunteer = await Volunteer.findById(assignment.volunteer);
      if (volunteer) {
        volunteer.completedAssignments += 1;
        volunteer.status = 'active';
        volunteer.currentAssignment = null;
        await volunteer.save();
      }
    } else if (status === 'cancelled') {
      // Update volunteer
      const volunteer = await Volunteer.findById(assignment.volunteer);
      if (volunteer) {
        volunteer.status = 'active';
        volunteer.currentAssignment = null;
        await volunteer.save();
      }
    }

    if (feedback) {
      assignment.feedback = feedback;
    }

    await assignment.save();

    res.json({ 
      success: true, 
      message: 'Assignment status updated',
      assignment 
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get assignment statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'NGO') {
      return res.status(403).json({ message: 'Only NGOs can access this endpoint' });
    }

    const volunteers = await Volunteer.find({ ngo: req.userId });
    const assignments = await Assignment.find({ ngo: req.userId });

    const stats = {
      totalVolunteers: volunteers.length,
      activeVolunteers: volunteers.filter(v => v.status === 'active').length,
      onAssignment: volunteers.filter(v => v.status === 'on-assignment').length,
      totalAssignments: assignments.length,
      pendingAssignments: assignments.filter(a => a.status === 'assigned').length,
      inProgress: assignments.filter(a => a.status === 'in-progress').length,
      completedAssignments: assignments.filter(a => a.status === 'completed').length
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
