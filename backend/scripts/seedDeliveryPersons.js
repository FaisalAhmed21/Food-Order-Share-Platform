require('dotenv').config();
const mongoose = require('mongoose');
const DeliveryPerson = require('../models/DeliveryPerson');

// Sample delivery persons around Dhaka
const deliveryPersons = [
  {
    name: 'Karim Rahman',
    email: 'karim.delivery@foodapp.com',
    phone: '+8801711111111',
    vehicleType: 'bike',
    vehicleNumber: 'DH-1234',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.4125, 23.8103] // Gulshan area
    }
  },
  {
    name: 'Rashed Mahmud',
    email: 'rashed.delivery@foodapp.com',
    phone: '+8801722222222',
    vehicleType: 'bike',
    vehicleNumber: 'DH-5678',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.3950, 23.7500] // Dhanmondi area
    }
  },
  {
    name: 'Rahim Uddin',
    email: 'rahim.delivery@foodapp.com',
    phone: '+8801733333333',
    vehicleType: 'bike',
    vehicleNumber: 'DH-9012',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.4200, 23.7900] // Banani area
    }
  },
  {
    name: 'Shakib Hassan',
    email: 'shakib.delivery@foodapp.com',
    phone: '+8801744444444',
    vehicleType: 'scooter',
    vehicleNumber: 'DH-3456',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.4300, 23.8200] // Baridhara area
    }
  },
  {
    name: 'Jahangir Alam',
    email: 'jahangir.delivery@foodapp.com',
    phone: '+8801755555555',
    vehicleType: 'bike',
    vehicleNumber: 'DH-7890',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.3800, 23.7800] // Mohammadpur area
    }
  },
  {
    name: 'Mizanur Rahman',
    email: 'mizan.delivery@foodapp.com',
    phone: '+8801766666666',
    vehicleType: 'bicycle',
    vehicleNumber: 'DH-1122',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.4100, 23.7600] // Shahbag area
    }
  },
  {
    name: 'Abdul Kadir',
    email: 'abdul.delivery@foodapp.com',
    phone: '+8801777777777',
    vehicleType: 'bike',
    vehicleNumber: 'DH-3344',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.3650, 23.8000] // Mirpur area
    }
  },
  {
    name: 'Nayeem Islam',
    email: 'nayeem.delivery@foodapp.com',
    phone: '+8801788888888',
    vehicleType: 'bike',
    vehicleNumber: 'DH-5566',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.4500, 23.7700] // Badda area
    }
  },
  {
    name: 'Faruk Ahmed',
    email: 'faruk.delivery@foodapp.com',
    phone: '+8801799999999',
    vehicleType: 'scooter',
    vehicleNumber: 'DH-7788',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.4000, 23.7200] // Elephant Road area
    }
  },
  {
    name: 'Habib Chowdhury',
    email: 'habib.delivery@foodapp.com',
    phone: '+8801700000000',
    vehicleType: 'bike',
    vehicleNumber: 'DH-9900',
    status: 'available',
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [90.4350, 23.7450] // Rampura area
    }
  }
];

async function seedDeliveryPersons() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing delivery persons
    await DeliveryPerson.deleteMany({});
    console.log('Cleared existing delivery persons');

    // Insert delivery persons
    const inserted = await DeliveryPerson.insertMany(deliveryPersons);
    console.log(`✅ Inserted ${inserted.length} delivery persons`);

    // Display created delivery persons
    console.log('\n📍 Created Delivery Persons:');
    inserted.forEach(dp => {
      console.log(`   - ${dp.name} (${dp.vehicleType}) at [${dp.currentLocation.coordinates[1]}, ${dp.currentLocation.coordinates[0]}]`);
    });

    console.log('\n✅ Delivery person seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding delivery persons:', error);
    process.exit(1);
  }
}

seedDeliveryPersons();
