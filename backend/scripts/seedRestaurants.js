require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

async function seedRestaurants() {
  try {
    await mongoose.connect('mongodb+srv://shuvo:shuvo@cluster0.4yrmqjc.mongodb.net/food_donation_platform');
    console.log('Connected to MongoDB');

    // Find any restaurant owner user
    let restaurantOwner = await User.findOne({ role: 'Restaurant' });
    
    if (!restaurantOwner) {
      console.log('❌ No restaurant owner user found. Creating a default one...');
      
      // Create a default restaurant owner
      const newOwner = new User({
        email: 'owner@restaurant.com',
        password: 'password123',
        name: 'Restaurant Owner',
        phone: '+880 1711-000000',
        authProvider: 'local',
        role: 'Restaurant'
      });
      
      await newOwner.save();
      console.log('✅ Created default restaurant owner');
      restaurantOwner = newOwner;
    }

    console.log('✅ Using restaurant owner:', restaurantOwner.name, '(', restaurantOwner.email, ')');

    // Check if restaurants already exist
    const existingCount = await Restaurant.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing restaurants. Delete them first? (Y/n)`);
      // For now, just proceed
    }

    // Create sample restaurants
    const restaurants = [
      {
        name: 'Burger Lab',
        cuisine: ['Burgers', 'Fast Food', 'American'],
        description: 'Premium burgers with the finest ingredients. Home of the legendary beef patty.',
        rating: 4.5,
        deliveryTime: 30,
        deliveryFee: 50,
        minimumOrder: 200,
        priceRange: '৳৳',
        status: 'Open',
        image: '/uploads/restaurants/burger-lab.jpg',
        heroImage: '/uploads/restaurants/burger-lab.jpg',
        address: {
          street: 'House 45, Road 11',
          area: 'Dhanmondi',
          city: 'Dhaka',
          zipCode: '1209',
          fullAddress: 'House 45, Road 11, Dhanmondi, Dhaka 1209'
        },
        location: {
          type: 'Point',
          coordinates: [90.3752, 23.7461] // Dhanmondi coordinates
        },
        contact: {
          phone: '+880 1711-123456',
          email: 'info@burgerlab.com',
          website: 'https://burgerlab.com'
        },
        openingHours: {
          monday: { open: '11:00', close: '23:00' },
          tuesday: { open: '11:00', close: '23:00' },
          wednesday: { open: '11:00', close: '23:00' },
          thursday: { open: '11:00', close: '23:00' },
          friday: { open: '11:00', close: '23:00' },
          saturday: { open: '11:00', close: '23:00' },
          sunday: { open: '11:00', close: '23:00' }
        },
        owner: restaurantOwner._id,
        isVerified: false,
        verificationDocuments: [{
          tradeLicenseNumber: 'TRAD/DHAKA/2024/001',
          foodSafetyLicense: 'FSL/2024/001',
          businessRegistration: 'BRN-123456789',
          tinNumber: '123-456-789-000',
          uploadedAt: new Date()
        }],
        badges: ['Popular', 'Fast Delivery']
      },
      {
        name: 'BFC (Best Fried Chicken)',
        cuisine: ['Chicken', 'Fast Food', 'American'],
        description: 'Crispy fried chicken that melts in your mouth. The best in town!',
        rating: 4.3,
        deliveryTime: 35,
        deliveryFee: 40,
        minimumOrder: 150,
        priceRange: '৳',
        status: 'Open',
        image: '/uploads/restaurants/bfc.jpg',
        heroImage: '/uploads/restaurants/bfc.jpg',
        address: {
          street: 'Plot 23, Block C',
          area: 'Gulshan',
          city: 'Dhaka',
          zipCode: '1212',
          fullAddress: 'Plot 23, Block C, Gulshan, Dhaka 1212'
        },
        location: {
          type: 'Point',
          coordinates: [90.4125, 23.7925] // Gulshan coordinates
        },
        contact: {
          phone: '+880 1811-234567',
          email: 'contact@bfc.com.bd',
          website: 'https://bfc.com.bd'
        },
        openingHours: {
          monday: { open: '10:00', close: '22:00' },
          tuesday: { open: '10:00', close: '22:00' },
          wednesday: { open: '10:00', close: '22:00' },
          thursday: { open: '10:00', close: '22:00' },
          friday: { open: '10:00', close: '22:00' },
          saturday: { open: '10:00', close: '22:00' },
          sunday: { open: '10:00', close: '22:00' }
        },
        owner: restaurantOwner._id,
        isVerified: false,
        verificationDocuments: [{
          tradeLicenseNumber: 'TRAD/DHAKA/2024/002',
          foodSafetyLicense: 'FSL/2024/002',
          businessRegistration: 'BRN-987654321',
          tinNumber: '987-654-321-000',
          uploadedAt: new Date()
        }],
        badges: ['Budget Friendly']
      }
    ];

    // Insert restaurants
    const createdRestaurants = await Restaurant.insertMany(restaurants);
    console.log(`✅ Created ${createdRestaurants.length} restaurants:`);
    createdRestaurants.forEach(r => console.log(`   - ${r.name}`));

    console.log('\n🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding restaurants:', error);
    process.exit(1);
  }
}

seedRestaurants();
