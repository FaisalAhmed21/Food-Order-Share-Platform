const DeliveryPerson = require('../models/DeliveryPerson');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const FoodDonation = require('../models/FoodDonation');

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Find nearest available delivery person
async function findNearestDeliveryPerson(restaurantLat, restaurantLng, customerLat, customerLng, searchRadius = 5) {
  try {
    console.log(`🔍 Searching for delivery person near pickup [${restaurantLat}, ${restaurantLng}] within ${searchRadius}km`);
    console.log(`   Delivery destination: [${customerLat}, ${customerLng}]`);
    
    // Find all available delivery persons
    const availableDeliveryPersons = await DeliveryPerson.find({
      status: 'available',
      isOnline: true
    });

    console.log(`📋 Found ${availableDeliveryPersons.length} available delivery persons`);
    
    if (availableDeliveryPersons.length === 0) {
      console.log('❌ No available delivery persons found');
      return null;
    }
    
    // Log each delivery person's location
    availableDeliveryPersons.forEach((dp, index) => {
      const dpLng = dp.currentLocation.coordinates[0];
      const dpLat = dp.currentLocation.coordinates[1];
      console.log(`   ${index + 1}. ${dp.name} (${dp.email}) at [${dpLat}, ${dpLng}]`);
    });

    // Calculate distance for each delivery person
    const deliveryPersonsWithDistance = availableDeliveryPersons.map(dp => {
      const dpLng = dp.currentLocation.coordinates[0];
      const dpLat = dp.currentLocation.coordinates[1];
      
      // Calculate distance from delivery person to restaurant
      const distanceToRestaurant = calculateDistance(dpLat, dpLng, restaurantLat, restaurantLng);
      
      // Calculate distance from delivery person to customer
      const distanceToCustomer = calculateDistance(dpLat, dpLng, customerLat, customerLng);
      
      // Calculate total distance (DP -> Restaurant -> Customer)
      const totalDistance = distanceToRestaurant + calculateDistance(restaurantLat, restaurantLng, customerLat, customerLng);
      
      // Check if delivery person is roughly between restaurant and customer
      // A good delivery person should be within reasonable distance to restaurant
      const isBetween = distanceToRestaurant <= searchRadius;
      
      return {
        deliveryPerson: dp,
        distanceToRestaurant,
        distanceToCustomer,
        totalDistance,
        isBetween,
        score: isBetween ? distanceToRestaurant : distanceToRestaurant + 10 // Penalize if not between
      };
    });

    // Sort by score (lowest is best)
    deliveryPersonsWithDistance.sort((a, b) => a.score - b.score);

    // Log the best matches
    console.log('🎯 Top 3 candidates:');
    deliveryPersonsWithDistance.slice(0, 3).forEach((dp, index) => {
      console.log(`   ${index + 1}. ${dp.deliveryPerson.name} - Distance to pickup: ${dp.distanceToRestaurant.toFixed(2)}km, Score: ${dp.score.toFixed(2)}`);
    });

    // Return the best match if within reasonable distance
    if (deliveryPersonsWithDistance.length > 0 && deliveryPersonsWithDistance[0].distanceToRestaurant <= searchRadius) {
      console.log(`✅ Selected: ${deliveryPersonsWithDistance[0].deliveryPerson.name}`);
      return deliveryPersonsWithDistance[0].deliveryPerson;
    }

    console.log(`❌ No delivery person within ${searchRadius}km radius`);
    return null;
  } catch (error) {
    console.error('Error finding delivery person:', error);
    return null;
  }
}

// Assign delivery person to order
async function assignDeliveryPerson(orderId, maxAttempts = 3, searchRadius = 5, onSuccessCallback = null, type = 'order') {
  try {
    let item, pickupLat, pickupLng, deliveryLat, deliveryLng;
    
    if (type === 'donation') {
      // Handle food donation
      item = await FoodDonation.findById(orderId);
      if (!item) {
        throw new Error('Donation not found');
      }
      
      console.log('🍽️ Donation pickup address:', JSON.stringify(item.pickupAddress, null, 2));
      console.log('🏢 Donation delivery address:', JSON.stringify(item.deliveryAddress, null, 2));
      
      // Get pickup location (donor's address) - handle GeoJSON format
      if (item.pickupAddress?.coordinates) {
        if (item.pickupAddress.coordinates.type === 'Point' && Array.isArray(item.pickupAddress.coordinates.coordinates)) {
          // GeoJSON format: { type: 'Point', coordinates: [lng, lat] }
          pickupLng = item.pickupAddress.coordinates.coordinates[0];
          pickupLat = item.pickupAddress.coordinates.coordinates[1];
        } else if (item.pickupAddress.coordinates.lat && item.pickupAddress.coordinates.lng) {
          // Simple format (fallback)
          pickupLat = item.pickupAddress.coordinates.lat;
          pickupLng = item.pickupAddress.coordinates.lng;
        }
      }
      
      // Get delivery location (NGO's address) - handle GeoJSON format
      if (item.deliveryAddress?.coordinates) {
        if (item.deliveryAddress.coordinates.type === 'Point' && Array.isArray(item.deliveryAddress.coordinates.coordinates)) {
          // GeoJSON format: { type: 'Point', coordinates: [lng, lat] }
          deliveryLng = item.deliveryAddress.coordinates.coordinates[0];
          deliveryLat = item.deliveryAddress.coordinates.coordinates[1];
        } else if (item.deliveryAddress.coordinates.lat && item.deliveryAddress.coordinates.lng) {
          // Simple format (fallback)
          deliveryLat = item.deliveryAddress.coordinates.lat;
          deliveryLng = item.deliveryAddress.coordinates.lng;
        }
      }
      
      console.log('📍 Parsed coordinates - Pickup:', { pickupLat, pickupLng }, 'Delivery:', { deliveryLat, deliveryLng });
    } else {
      // Handle regular order
      item = await Order.findById(orderId).populate('restaurant');
      if (!item) {
        throw new Error('Order not found');
      }
      
      // Get restaurant location
      const restaurant = await Restaurant.findById(item.restaurant);
      pickupLat = restaurant.location.coordinates[1];
      pickupLng = restaurant.location.coordinates[0];
      
      // Get customer delivery location
      deliveryLat = item.deliveryAddress.coordinates.lat;
      deliveryLng = item.deliveryAddress.coordinates.lng;
    }

    if (!deliveryLat || !deliveryLng) {
      throw new Error('Delivery coordinates not provided');
    }

    // Increment assignment attempts (if field exists)
    if (item.deliveryAssignmentAttempts !== undefined) {
      item.deliveryAssignmentAttempts += 1;
    }
    await item.save();

    // Find nearest delivery person
    const deliveryPerson = await findNearestDeliveryPerson(
      pickupLat, 
      pickupLng, 
      deliveryLat, 
      deliveryLng,
      searchRadius
    );

    if (deliveryPerson) {
      // Assign delivery person
      item.deliveryPerson = deliveryPerson._id;
      item.deliveryAssignmentStatus = 'assigned';
      item.deliveryAssignmentMessage = `Delivery person ${deliveryPerson.name} assigned and on the way!`;
      
      if (type === 'donation') {
        item.status = 'picking_up';
      } else {
        item.status = 'preparing';
      }
      
      // Set stageStartTime now that delivery person is assigned - counter starts!
      item.stageStartTime = new Date();
      item.statusHistory.push({
        status: 'assigned',
        timestamp: new Date(),
        note: `Delivery person ${deliveryPerson.name} assigned`
      });
      await item.save();

      // Update delivery person status
      deliveryPerson.status = 'busy';
      deliveryPerson.currentOrder = item._id;
      deliveryPerson.lastActive = new Date();
      await deliveryPerson.save();

      const itemNumber = type === 'donation' ? item.donationNumber : item.orderNumber;
      console.log(`✅ Delivery person ${deliveryPerson.name} assigned to ${type} ${itemNumber}`);

      // Call success callback if provided
      if (onSuccessCallback) {
        onSuccessCallback(item);
      }

      return {
        success: true,
        deliveryPerson,
        message: 'Delivery person assigned successfully'
      };
    } else {
      // No delivery person found
      const attempts = item.deliveryAssignmentAttempts || 0;
      if (attempts >= maxAttempts) {
        // Cancel after max attempts
        item.deliveryAssignmentStatus = 'no_delivery_person';
        item.status = 'cancelled';
        item.cancellationReason = 'No delivery person available in your area after 3 attempts';
        item.deliveryAssignmentMessage = '❌ Sorry, no delivery person available in your area. Cancelled and refund will be processed.';
        item.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: `${type === 'donation' ? 'Donation' : 'Order'} cancelled - No delivery person available after 3 attempts`
        });
        await item.save();

        const itemNumber = type === 'donation' ? item.donationNumber : item.orderNumber;
        console.log(`❌ ${type} ${itemNumber} cancelled - No delivery person found after ${maxAttempts} attempts`);

        return {
          success: false,
          message: `No delivery person available. ${type === 'donation' ? 'Donation' : 'Order'} has been cancelled.`,
          cancelled: true,
          item: item
        };
      } else {
        // Update message and retry later
        item.deliveryAssignmentMessage = `🔍 Searching for delivery person... Attempt ${attempts}/${maxAttempts}`;
        await item.save();
        
        const itemNumber = type === 'donation' ? item.donationNumber : item.orderNumber;
        console.log(`⏳ No delivery person found for ${type} ${itemNumber}. Attempt ${attempts}/${maxAttempts}`);
        
        return {
          success: false,
          message: `No delivery person found. Attempt ${attempts}/${maxAttempts}`,
          willRetry: true
        };
      }
    }
  } catch (error) {
    console.error('Error assigning delivery person:', error);
    throw error;
  }
}

// Retry assignment with increasing search radius
async function retryAssignmentWithDelay(orderId, attempt = 1, maxAttempts = 3, autoProgressionCallback = null, type = 'order') {
  const delays = [30000, 60000, 90000]; // 30s, 1min, 1.5min
  const searchRadii = [5, 10, 15]; // Increase search radius with each attempt
  
  setTimeout(async () => {
    try {
      const result = await assignDeliveryPerson(orderId, maxAttempts, searchRadii[attempt - 1], autoProgressionCallback, type);
      
      if (result.success && autoProgressionCallback) {
        // Delivery person assigned successfully, start auto-progression
        console.log(`✅ Delivery person assigned on retry attempt ${attempt}`);
        autoProgressionCallback(orderId);
      } else if (!result.success && result.willRetry && attempt < maxAttempts) {
        // Retry again
        retryAssignmentWithDelay(orderId, attempt + 1, maxAttempts, autoProgressionCallback, type);
      }
    } catch (error) {
      console.error('Error in retry assignment:', error);
    }
  }, delays[attempt - 1] || 30000);
}

module.exports = {
  findNearestDeliveryPerson,
  assignDeliveryPerson,
  retryAssignmentWithDelay,
  calculateDistance
};
