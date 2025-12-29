const mongoose = require('mongoose');
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

async function updateNGOLocations() {
  try {
    console.log('🔄 Updating NGO locations...');
    
    const ngos = await NGOProfile.find({});
    
    if (ngos.length === 0) {
      console.log('⚠️  No NGOs found in database. Please create NGO profiles first through the app.');
      console.log('💡 NGOs need to be created through user registration (they require a user account).');
      return;
    }
    
    let updated = 0;
    
    for (const ngo of ngos) {
      const location = getRandomLocation();
      const offset = addRandomOffset(location.coordinates[1], location.coordinates[0]);
      
      ngo.location = {
        type: 'Point',
        coordinates: [offset.lng, offset.lat] // [longitude, latitude]
      };
      
      // Update address
      ngo.address = {
        ...ngo.address,
        area: location.area,
        city: 'Dhaka',
        fullAddress: `${location.area}, Dhaka, Bangladesh`
      };
      
      // Make sure NGO is visible and accepting items
      ngo.isPubliclyVisible = true;
      ngo.isAcceptingItems = true;
      
      // Set valid capacity
      if (!ngo.currentCapacity || !['Low', 'Medium', 'Full'].includes(ngo.currentCapacity)) {
        ngo.currentCapacity = 'Medium';
      }
      
      await ngo.save();
      updated++;
      console.log(`✅ Updated: ${ngo.ngoName} - ${location.area} (${offset.lat.toFixed(4)}, ${offset.lng.toFixed(4)})`);
    }
    
    console.log(`\n✅ Successfully updated ${updated} NGOs with locations`);
  } catch (error) {
    console.error('❌ Error updating NGOs:', error);
  }
}

async function testQuery() {
  try {
    console.log('\n🔄 Testing geospatial query...');
    
    // Test with Gulshan coordinates
    const testLat = 23.7808;
    const testLng = 90.4125;
    
    // Test NGOs within 10km
    const nearbyNGOs = await NGOProfile.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [testLng, testLat]
          },
          $maxDistance: 10000 // 10km in meters
        }
      },
      isPubliclyVisible: true,
      isAcceptingItems: true
    }).limit(10);
    
    console.log(`\n✅ Found ${nearbyNGOs.length} NGOs within 10km of Gulshan (23.7808, 90.4125)`);
    
    if (nearbyNGOs.length > 0) {
      console.log('\nNearby NGOs:');
      nearbyNGOs.forEach((n, i) => {
        const coords = n.location.coordinates;
        console.log(`   ${i + 1}. ${n.ngoName}`);
        console.log(`      - Area: ${n.address?.area || 'N/A'}`);
        console.log(`      - Coordinates: (${coords[1].toFixed(4)}, ${coords[0].toFixed(4)})`);
        console.log(`      - Accepting: ${n.isAcceptingItems ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('\n⚠️  No NGOs found. This is expected if you have no NGO profiles in your database yet.');
    }
    
  } catch (error) {
    console.error('❌ Error testing query:', error);
  }
}

async function run() {
  try {
    console.log('🚀 Starting NGO location update script...\n');
    
    await updateNGOLocations();
    await testQuery();
    
    console.log('\n✅ Done!');
    console.log('📍 All NGOs now have proper geolocation data in Dhaka');
    console.log('🗺️ Try the nearby map feature now!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

run();
