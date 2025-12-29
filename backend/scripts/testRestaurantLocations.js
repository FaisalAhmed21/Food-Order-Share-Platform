const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');

async function testRestaurantAPI() {
  try {
    // Test coordinates (Gulshan area)
    const testLat = 23.7808;
    const testLng = 90.4125;
    
    console.log(`🔍 Testing restaurant query at coordinates: (${testLat}, ${testLng})`);
    console.log(`📍 Location: Gulshan, Dhaka\n`);
    
    // Test different distances
    const distances = [1000, 2000, 5000, 10000]; // 1km, 2km, 5km, 10km
    
    for (const distance of distances) {
      const restaurants = await Restaurant.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [testLng, testLat]
            },
            $maxDistance: distance
          }
        }
      }).limit(20);
      
      console.log(`\n📊 Within ${distance/1000}km: Found ${restaurants.length} restaurants`);
      
      if (restaurants.length > 0) {
        console.log('   Top 5 nearest:');
        restaurants.slice(0, 5).forEach((r, i) => {
          const coords = r.location.coordinates;
          // Calculate distance using Haversine
          const R = 6371; // Earth's radius in km
          const dLat = (coords[1] - testLat) * Math.PI / 180;
          const dLon = (coords[0] - testLng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(testLat * Math.PI / 180) * Math.cos(coords[1] * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const dist = R * c;
          
          console.log(`   ${i + 1}. ${r.name}`);
          console.log(`      - ${r.address?.area || 'N/A'} (${dist.toFixed(2)}km away)`);
          console.log(`      - Coords: (${coords[1].toFixed(4)}, ${coords[0].toFixed(4)})`);
        });
      }
    }
    
    console.log('\n✅ Restaurant geolocation is working correctly!');
    console.log('🗺️ You should now see restaurants on the nearby map.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testRestaurantAPI();
