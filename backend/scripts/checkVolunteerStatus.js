const mongoose = require('mongoose');
const User = require('../models/User');
const DeliveryPerson = require('../models/DeliveryPerson');

// MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/food-order-platform';

async function checkVolunteerStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the specific volunteer
    const volunteer = await User.findOne({ email: 'db@gmail.com' });
    
    if (!volunteer) {
      console.log('❌ Volunteer user not found');
      return;
    }

    console.log('👤 Volunteer User:');
    console.log(`   ID: ${volunteer._id}`);
    console.log(`   Name: ${volunteer.name}`);
    console.log(`   Email: ${volunteer.email}`);
    console.log(`   Role: ${volunteer.role}`);
    console.log(`   Phone: ${volunteer.phone || 'Not set'}\n`);

    // Find corresponding DeliveryPerson profile
    const deliveryPerson = await DeliveryPerson.findOne({ 
      $or: [
        { user: volunteer._id },
        { email: volunteer.email }
      ]
    });

    if (!deliveryPerson) {
      console.log('❌ DeliveryPerson profile not found for this volunteer');
      return;
    }

    console.log('🏍️ DeliveryPerson Profile:');
    console.log(`   ID: ${deliveryPerson._id}`);
    console.log(`   Name: ${deliveryPerson.name}`);
    console.log(`   Email: ${deliveryPerson.email}`);
    console.log(`   Phone: ${deliveryPerson.phone}`);
    console.log(`   Status: ${deliveryPerson.status}`);
    console.log(`   Is Online: ${deliveryPerson.isOnline}`);
    console.log(`   Vehicle Type: ${deliveryPerson.vehicleType}`);
    console.log(`   Service Radius: ${deliveryPerson.serviceRadius}km`);
    
    if (deliveryPerson.currentLocation && deliveryPerson.currentLocation.coordinates) {
      const [lng, lat] = deliveryPerson.currentLocation.coordinates;
      console.log(`   Location: [${lat}, ${lng}] (lat, lng)`);
    } else {
      console.log('   Location: Not set');
    }
    
    console.log(`   Last Active: ${deliveryPerson.lastActive || 'Never'}`);
    console.log(`   Rating: ${deliveryPerson.rating}/5 (${deliveryPerson.totalRatings} ratings)`);
    console.log(`   Total Deliveries: ${deliveryPerson.totalDeliveries}`);
    console.log(`   Current Order: ${deliveryPerson.currentOrder || 'None'}\n`);

    // Check if there are any available delivery persons
    const allAvailable = await DeliveryPerson.find({
      status: 'available',
      isOnline: true
    });

    console.log(`📊 Total Available Delivery Persons: ${allAvailable.length}`);
    allAvailable.forEach((dp, index) => {
      const [lng, lat] = dp.currentLocation.coordinates;
      console.log(`   ${index + 1}. ${dp.name} (${dp.email}) at [${lat}, ${lng}] - Status: ${dp.status}, Online: ${dp.isOnline}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the script
checkVolunteerStatus();

