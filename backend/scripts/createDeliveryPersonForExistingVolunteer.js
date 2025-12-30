const mongoose = require('mongoose');
const User = require('../models/User');
const DeliveryPerson = require('../models/DeliveryPerson');

// MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/food-order-platform';

async function createDeliveryPersonForVolunteer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users with role 'Volunteer' who don't have a DeliveryPerson profile
    const volunteers = await User.find({ role: 'Volunteer' });
    console.log(`📋 Found ${volunteers.length} volunteer(s)`);

    for (const volunteer of volunteers) {
      // Check if DeliveryPerson profile already exists
      const existingProfile = await DeliveryPerson.findOne({ 
        $or: [
          { user: volunteer._id },
          { email: volunteer.email }
        ]
      });

      if (existingProfile) {
        console.log(`⏭️  DeliveryPerson profile already exists for ${volunteer.email}`);
        continue;
      }

      // Create DeliveryPerson profile
      const deliveryPerson = new DeliveryPerson({
        user: volunteer._id,
        name: volunteer.name || 'Volunteer',
        email: volunteer.email,
        phone: volunteer.phone || '0000000000',
        vehicleType: 'bike',
        status: 'available',
        isOnline: true,
        currentLocation: {
          type: 'Point',
          coordinates: [90.4125, 23.8103] // Default Dhaka coordinates [lng, lat]
        },
        serviceRadius: 10,
        rating: 5,
        totalRatings: 0,
        totalDeliveries: 0
      });

      await deliveryPerson.save();
      console.log(`✅ Created DeliveryPerson profile for ${volunteer.email} (ID: ${deliveryPerson._id})`);
    }

    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
createDeliveryPersonForVolunteer();

