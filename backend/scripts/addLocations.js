const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const NGOProfile = require('../models/NGOProfile');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Dhaka area coordinates (spread across different areas)
const dhakaLocations = [
  // Gulshan area
  { area: 'Gulshan', coordinates: [90.4125, 23.7808] },
  { area: 'Gulshan-1', coordinates: [90.4152, 23.7794] },
  { area: 'Gulshan-2', coordinates: [90.4173, 23.7925] },
  
  // Banani area
  { area: 'Banani', coordinates: [90.4037, 23.7937] },
  { area: 'Banani DOHS', coordinates: [90.4001, 23.7985] },
  
  // Dhanmondi area
  { area: 'Dhanmondi', coordinates: [90.3742, 23.7465] },
  { area: 'Dhanmondi-27', coordinates: [90.3688, 23.7543] },
  { area: 'Dhanmondi-32', coordinates: [90.3712, 23.7489] },
  
  // Uttara area
  { area: 'Uttara', coordinates: [90.3973, 23.8759] },
  { area: 'Uttara Sector-3', coordinates: [90.3912, 23.8689] },
  { area: 'Uttara Sector-7', coordinates: [90.4023, 23.8812] },
  
  // Mirpur area
  { area: 'Mirpur', coordinates: [90.3696, 23.8223] },
  { area: 'Mirpur-1', coordinates: [90.3567, 23.8056] },
  { area: 'Mirpur-10', coordinates: [90.3688, 23.8067] },
  
  // Mohammadpur area
  { area: 'Mohammadpur', coordinates: [90.3563, 23.7656] },
  
  // Old Dhaka area
  { area: 'Old Dhaka', coordinates: [90.4089, 23.7104] },
  { area: 'Lalbagh', coordinates: [90.3889, 23.7178] },
  
  // Motijheel area
  { area: 'Motijheel', coordinates: [90.4177, 23.7334] },
  
  // Bashundhara area
  { area: 'Bashundhara', coordinates: [90.4276, 23.8108] },
  
  // Bailey Road area
  { area: 'Bailey Road', coordinates: [90.4012, 23.7467] },
  
  // Farmgate area
  { area: 'Farmgate', coordinates: [90.3889, 23.7556] },
  
  // Kawran Bazar area
  { area: 'Kawran Bazar', coordinates: [90.3923, 23.7512] },
  
  // Rampura area
  { area: 'Rampura', coordinates: [90.4256, 23.7634] },
  
  // Badda area
  { area: 'Badda', coordinates: [90.4234, 23.7789] },
  
  // Moghbazar area
  { area: 'Moghbazar', coordinates: [90.4034, 23.7512] },
  
  // Khilgaon area
  { area: 'Khilgaon', coordinates: [90.4289, 23.7523] },
  
  // Shantinagar area
  { area: 'Shantinagar', coordinates: [90.4145, 23.7389] },
  
  // Tejgaon area
  { area: 'Tejgaon', coordinates: [90.3978, 23.7578] },
  
  // Baridhara area
  { area: 'Baridhara', coordinates: [90.4234, 23.8012] },
  
  // Niketan area
  { area: 'Niketan', coordinates: [90.4189, 23.7889] }
];

// Helper function to get random location
function getRandomLocation() {
  return dhakaLocations[Math.floor(Math.random() * dhakaLocations.length)];
}

// Helper function to add small random offset to coordinates (within ~500m)
function addRandomOffset(lat, lng) {
  // 0.005 degrees ~ 500 meters
  const latOffset = (Math.random() - 0.5) * 0.01;
  const lngOffset = (Math.random() - 0.5) * 0.01;
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset
  };
}

async function updateRestaurantLocations() {
  try {
    console.log('🔄 Updating restaurant locations...');
    
    const restaurants = await Restaurant.find({});
    let updated = 0;
    
    for (const restaurant of restaurants) {
      const location = getRandomLocation();
      const offset = addRandomOffset(location.coordinates[1], location.coordinates[0]);
      
      restaurant.location = {
        type: 'Point',
        coordinates: [offset.lng, offset.lat] // [longitude, latitude]
      };
      
      // Update address if not set
      if (!restaurant.address || !restaurant.address.area) {
        restaurant.address = {
          ...restaurant.address,
          area: location.area,
          city: 'Dhaka',
          fullAddress: `${location.area}, Dhaka, Bangladesh`
        };
      }
      
      await restaurant.save();
      updated++;
      console.log(`✅ Updated: ${restaurant.name} - ${location.area} (${offset.lat.toFixed(4)}, ${offset.lng.toFixed(4)})`);
    }
    
    console.log(`\n✅ Successfully updated ${updated} restaurants with locations`);
  } catch (error) {
    console.error('❌ Error updating restaurants:', error);
  }
}

async function updateNGOLocations() {
  try {
    console.log('\n🔄 Updating NGO locations...');
    
    const ngos = await NGOProfile.find({});
    let updated = 0;
    
    for (const ngo of ngos) {
      const location = getRandomLocation();
      const offset = addRandomOffset(location.coordinates[1], location.coordinates[0]);
      
      ngo.location = {
        type: 'Point',
        coordinates: [offset.lng, offset.lat] // [longitude, latitude]
      };
      
      // Update address if not set
      if (!ngo.address || !ngo.address.area) {
        ngo.address = {
          ...ngo.address,
          area: location.area,
          city: 'Dhaka',
          fullAddress: `${location.area}, Dhaka, Bangladesh`
        };
      }
      
      // Make sure NGO is visible and accepting items
      ngo.isPubliclyVisible = true;
      ngo.isAcceptingItems = true;
      
      await ngo.save();
      updated++;
      console.log(`✅ Updated: ${ngo.ngoName} - ${location.area} (${offset.lat.toFixed(4)}, ${offset.lng.toFixed(4)})`);
    }
    
    console.log(`\n✅ Successfully updated ${updated} NGOs with locations`);
  } catch (error) {
    console.error('❌ Error updating NGOs:', error);
  }
}

async function createSampleNGOsIfNeeded() {
  try {
    const ngoCount = await NGOProfile.countDocuments();
    
    if (ngoCount < 5) {
      console.log('\n🔄 Creating sample NGOs...');
      
      const sampleNGOs = [
        {
          ngoName: 'Food for All Foundation',
          description: 'Dedicated to fighting hunger in Bangladesh',
          acceptedItems: ['Cooked Food', 'Packaged Food', 'Fresh Produce'],
          serviceRadius: 10,
          currentCapacity: 'High',
          isVerified: true,
          isPubliclyVisible: true,
          isAcceptingItems: true,
          operatingHours: { open: '08:00', close: '20:00' },
          contactPhone: '01711111111',
          stats: { trustScore: 95, totalPickups: 120, successfulPickups: 115 }
        },
        {
          ngoName: 'Dhaka Food Bank',
          description: 'Collecting and distributing surplus food to those in need',
          acceptedItems: ['Cooked Food', 'Packaged Food', 'Bakery Items'],
          serviceRadius: 8,
          currentCapacity: 'Medium',
          isVerified: true,
          isPubliclyVisible: true,
          isAcceptingItems: true,
          operatingHours: { open: '09:00', close: '19:00' },
          contactPhone: '01722222222',
          stats: { trustScore: 88, totalPickups: 85, successfulPickups: 80 }
        },
        {
          ngoName: 'Hunger Relief Network',
          description: 'Emergency food assistance for vulnerable communities',
          acceptedItems: ['Cooked Food', 'Raw Food', 'Canned Goods'],
          serviceRadius: 12,
          currentCapacity: 'High',
          isVerified: true,
          isPubliclyVisible: true,
          isAcceptingItems: true,
          operatingHours: { open: '07:00', close: '21:00' },
          contactPhone: '01733333333',
          stats: { trustScore: 92, totalPickups: 150, successfulPickups: 145 }
        },
        {
          ngoName: 'Community Kitchen Initiative',
          description: 'Operating community kitchens for the homeless',
          acceptedItems: ['Cooked Food', 'Fresh Produce', 'Dairy Products'],
          serviceRadius: 7,
          currentCapacity: 'Medium',
          isVerified: true,
          isPubliclyVisible: true,
          isAcceptingItems: true,
          operatingHours: { open: '10:00', close: '18:00' },
          contactPhone: '01744444444',
          stats: { trustScore: 90, totalPickups: 95, successfulPickups: 92 }
        },
        {
          ngoName: 'Share Your Meal BD',
          description: 'Connecting food donors with distribution centers',
          acceptedItems: ['All Food Types'],
          serviceRadius: 15,
          currentCapacity: 'High',
          isVerified: true,
          isPubliclyVisible: true,
          isAcceptingItems: true,
          operatingHours: { open: '06:00', close: '22:00' },
          contactPhone: '01755555555',
          stats: { trustScore: 96, totalPickups: 200, successfulPickups: 195 }
        },
        {
          ngoName: 'Zero Hunger Dhaka',
          description: 'Working towards zero hunger in Dhaka city',
          acceptedItems: ['Cooked Food', 'Packaged Food'],
          serviceRadius: 10,
          currentCapacity: 'Medium',
          isVerified: true,
          isPubliclyVisible: true,
          isAcceptingItems: true,
          operatingHours: { open: '08:00', close: '20:00' },
          contactPhone: '01766666666',
          stats: { trustScore: 89, totalPickups: 110, successfulPickups: 105 }
        },
        {
          ngoName: 'Meal Share Initiative',
          description: 'Redistributing excess food to shelters and orphanages',
          acceptedItems: ['Cooked Food', 'Bakery Items', 'Beverages'],
          serviceRadius: 9,
          currentCapacity: 'High',
          isVerified: true,
          isPubliclyVisible: true,
          isAcceptingItems: true,
          operatingHours: { open: '09:00', close: '19:00' },
          contactPhone: '01777777777',
          stats: { trustScore: 93, totalPickups: 130, successfulPickups: 128 }
        },
        {
          ngoName: 'Food Rescue Bangladesh',
          description: 'Rescuing food from going to waste',
          acceptedItems: ['All Food Types'],
          serviceRadius: 14,
          currentCapacity: 'High',
          isVerified: true,
          isPubliclyVisible: true,
          isAcceptingItems: true,
          operatingHours: { open: '24/7', close: '24/7' },
          contactPhone: '01788888888',
          stats: { trustScore: 97, totalPickups: 180, successfulPickups: 178 }
        }
      ];
      
      for (const ngoData of sampleNGOs) {
        const location = getRandomLocation();
        const offset = addRandomOffset(location.coordinates[1], location.coordinates[0]);
        
        ngoData.location = {
          type: 'Point',
          coordinates: [offset.lng, offset.lat]
        };
        
        ngoData.address = {
          area: location.area,
          city: 'Dhaka',
          fullAddress: `${location.area}, Dhaka, Bangladesh`
        };
        
        const ngo = new NGOProfile(ngoData);
        await ngo.save();
        console.log(`✅ Created: ${ngoData.ngoName} - ${location.area}`);
      }
      
      console.log(`\n✅ Created ${sampleNGOs.length} sample NGOs`);
    }
  } catch (error) {
    console.error('❌ Error creating sample NGOs:', error);
  }
}

async function verifyIndexes() {
  try {
    console.log('\n🔄 Verifying geospatial indexes...');
    
    // Check Restaurant indexes
    const restaurantIndexes = await Restaurant.collection.getIndexes();
    console.log('Restaurant indexes:', Object.keys(restaurantIndexes));
    
    // Check NGO indexes
    const ngoIndexes = await NGOProfile.collection.getIndexes();
    console.log('NGO indexes:', Object.keys(ngoIndexes));
    
    // Recreate indexes if needed
    await Restaurant.collection.createIndex({ location: '2dsphere' });
    await NGOProfile.collection.createIndex({ location: '2dsphere' });
    
    console.log('✅ Geospatial indexes verified and created');
  } catch (error) {
    console.error('❌ Error verifying indexes:', error);
  }
}

async function testQueries() {
  try {
    console.log('\n🔄 Testing geospatial queries...');
    
    // Test with Gulshan coordinates
    const testLat = 23.7808;
    const testLng = 90.4125;
    
    // Test restaurants within 5km
    const nearbyRestaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [testLng, testLat]
          },
          $maxDistance: 5000 // 5km in meters
        }
      }
    }).limit(5);
    
    console.log(`\n✅ Found ${nearbyRestaurants.length} restaurants within 5km of Gulshan`);
    nearbyRestaurants.forEach(r => {
      console.log(`   - ${r.name} at ${r.address?.area || 'N/A'}`);
    });
    
    // Test NGOs within 5km
    const nearbyNGOs = await NGOProfile.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [testLng, testLat]
          },
          $maxDistance: 5000
        }
      }
    }).limit(5);
    
    console.log(`\n✅ Found ${nearbyNGOs.length} NGOs within 5km of Gulshan`);
    nearbyNGOs.forEach(n => {
      console.log(`   - ${n.ngoName} at ${n.address?.area || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing queries:', error);
  }
}

async function run() {
  try {
    console.log('🚀 Starting location update script...\n');
    
    await verifyIndexes();
    await updateRestaurantLocations();
    await createSampleNGOsIfNeeded();
    await updateNGOLocations();
    await testQueries();
    
    console.log('\n✅ All done! Your database now has proper geolocation data.');
    console.log('📍 All locations are spread across Dhaka city');
    console.log('🗺️ Try the nearby map feature now!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

run();
