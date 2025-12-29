const DeliveryPerson = require('../models/DeliveryPerson');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

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
    // Find all available delivery persons
    const availableDeliveryPersons = await DeliveryPerson.find({
      status: 'available',
      isOnline: true
    });

    if (availableDeliveryPersons.length === 0) {
      return null;
    }

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

    // Return the best match if within reasonable distance
    if (deliveryPersonsWithDistance.length > 0 && deliveryPersonsWithDistance[0].distanceToRestaurant <= searchRadius) {
      return deliveryPersonsWithDistance[0].deliveryPerson;
    }

    return null;
  } catch (error) {
    console.error('Error finding delivery person:', error);
    return null;
  }
}

// Assign delivery person to order
async function assignDeliveryPerson(orderId, maxAttempts = 3, searchRadius = 5) {
  try {
    const order = await Order.findById(orderId).populate('restaurant');
    
    if (!order) {
      throw new Error('Order not found');
    }

    // Get restaurant location
    const restaurant = await Restaurant.findById(order.restaurant);
    const restaurantLat = restaurant.location.coordinates[1];
    const restaurantLng = restaurant.location.coordinates[0];

    // Get customer delivery location
    const customerLat = order.deliveryAddress.coordinates.lat;
    const customerLng = order.deliveryAddress.coordinates.lng;

    if (!customerLat || !customerLng) {
      throw new Error('Customer delivery coordinates not provided');
    }

    // Increment assignment attempts
    order.deliveryAssignmentAttempts += 1;
    await order.save();

    // Find nearest delivery person
    const deliveryPerson = await findNearestDeliveryPerson(
      restaurantLat, 
      restaurantLng, 
      customerLat, 
      customerLng,
      searchRadius
    );

    if (deliveryPerson) {
      // Assign delivery person to order
      order.deliveryPerson = deliveryPerson._id;
      order.deliveryAssignmentStatus = 'assigned';
      order.deliveryAssignmentMessage = `Delivery person ${deliveryPerson.name} assigned and on the way!`;
      order.status = 'preparing';
      order.statusHistory.push({
        status: 'assigned',
        timestamp: new Date(),
        note: `Delivery person ${deliveryPerson.name} assigned`
      });
      await order.save();

      // Update delivery person status
      deliveryPerson.status = 'busy';
      deliveryPerson.currentOrder = order._id;
      deliveryPerson.lastActive = new Date();
      await deliveryPerson.save();

      console.log(`✅ Delivery person ${deliveryPerson.name} assigned to order ${order.orderNumber}`);

      return {
        success: true,
        deliveryPerson,
        message: 'Delivery person assigned successfully'
      };
    } else {
      // No delivery person found
      if (order.deliveryAssignmentAttempts >= maxAttempts) {
        // Cancel order after max attempts
        order.deliveryAssignmentStatus = 'no_delivery_person';
        order.status = 'cancelled';
        order.cancellationReason = 'No delivery person available in your area after 3 attempts';
        order.deliveryAssignmentMessage = '❌ Sorry, no delivery person available in your area. Order cancelled and refund will be processed.';
        order.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: 'Order cancelled - No delivery person available after 3 attempts'
        });
        await order.save();

        console.log(`❌ Order ${order.orderNumber} cancelled - No delivery person found after ${maxAttempts} attempts`);

        return {
          success: false,
          message: 'No delivery person available. Order has been cancelled.',
          orderCancelled: true,
          order: order
        };
      } else {
        // Update message and retry later
        order.deliveryAssignmentMessage = `🔍 Searching for delivery person... Attempt ${order.deliveryAssignmentAttempts}/${maxAttempts}`;
        await order.save();
        
        console.log(`⏳ No delivery person found for order ${order.orderNumber}. Attempt ${order.deliveryAssignmentAttempts}/${maxAttempts}`);
        
        return {
          success: false,
          message: `No delivery person found. Attempt ${order.deliveryAssignmentAttempts}/${maxAttempts}`,
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
async function retryAssignmentWithDelay(orderId, attempt = 1, maxAttempts = 3) {
  const delays = [30000, 60000, 90000]; // 30s, 1min, 1.5min
  const searchRadii = [5, 10, 15]; // Increase search radius with each attempt
  
  setTimeout(async () => {
    try {
      const result = await assignDeliveryPerson(orderId, maxAttempts, searchRadii[attempt - 1]);
      
      if (!result.success && result.willRetry && attempt < maxAttempts) {
        // Retry again
        retryAssignmentWithDelay(orderId, attempt + 1, maxAttempts);
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
