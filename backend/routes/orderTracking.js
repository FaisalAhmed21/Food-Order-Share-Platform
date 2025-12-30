const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');
const DeliveryPerson = require('../models/DeliveryPerson');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

// Get order tracking details with delivery person info
router.get('/:orderId/tracking', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('restaurant', 'name image address contact location')
      .populate('customer', 'name phone')
      .populate({
        path: 'deliveryPerson',
        select: 'name phone profilePicture rating totalRatings totalDeliveries currentLocation vehicleType vehicleNumber user',
        populate: {
          path: 'user',
          select: '_id'
        }
      })
      .populate('donation.ngo', 'name organizationName email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization - allow customer, delivery person, or volunteer (via deliveryPerson.user)
    const userId = req.user._id.toString();
    const customerId = order.customer._id.toString();
    const deliveryPersonId = order.deliveryPerson?._id?.toString();
    const deliveryPersonUserId = order.deliveryPerson?.user?._id?.toString();
    
    const isAuthorized = 
      userId === customerId || 
      userId === deliveryPersonId || 
      userId === deliveryPersonUserId;
    
    if (!isAuthorized) {
      console.log('Authorization failed:', { userId, customerId, deliveryPersonId, deliveryPersonUserId });
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const response = {
      success: true,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        currentStage: order.currentStage,
        stageStartTime: order.stageStartTime,
        createdAt: order.createdAt,
        deliveryAddress: order.deliveryAddress,
        pricing: order.pricing,
        items: order.items,
        deliveryPersonRating: order.deliveryPersonRating,
        deliveryPersonReview: order.deliveryPersonReview,
        deliveryPersonReviewedAt: order.deliveryPersonReviewedAt,
        itemReviews: order.itemReviews
      },
      restaurant: {
        name: order.restaurant.name,
        image: order.restaurant.image,
        address: order.restaurant.address,
        phone: order.restaurant.contact?.phone,
        location: order.restaurant.location
      },
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        location: order.deliveryAddress.coordinates
      }
    };

    if (order.deliveryPerson) {
      response.deliveryPerson = {
        _id: order.deliveryPerson._id,
        name: order.deliveryPerson.name,
        phone: order.deliveryPerson.phone,
        profilePicture: order.deliveryPerson.profilePicture,
        rating: order.deliveryPerson.rating,
        totalRatings: order.deliveryPerson.totalRatings,
        totalDeliveries: order.deliveryPerson.totalDeliveries,
        currentLocation: order.deliveryPerson.currentLocation,
        vehicleType: order.deliveryPerson.vehicleType,
        vehicleNumber: order.deliveryPerson.vehicleNumber
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start order stage progression (called after order confirmation)
router.post('/:orderId/start-progression', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'confirmed' && order.status !== 'preparing') {
      return res.status(400).json({ success: false, message: 'Order must be confirmed to start progression' });
    }

    // Initialize stage progression
    order.currentStage = 'To Restaurant';
    order.stageStartTime = new Date();
    order.statusTimestamps = {
      pending: order.createdAt,
      confirmed: new Date()
    };

    await order.save();

    // Start auto-progression
    startAutoProgression(order._id);

    res.json({ 
      success: true, 
      message: 'Order progression started',
      currentStage: order.currentStage,
      stageStartTime: order.stageStartTime
    });
  } catch (error) {
    console.error('Error starting progression:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Manual stage progression (for testing or manual control)
router.post('/:orderId/advance-stage', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const stages = ['To Restaurant', 'Preparing', 'Ready to Pickup', 'Rider En Route', 'Reached'];
    const currentIndex = stages.indexOf(order.currentStage);
    
    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      // Order is complete
      order.status = 'delivered';
      order.actualDeliveryTime = new Date();
      order.statusTimestamps.delivered = new Date();
      order.statusHistory.push({
        status: 'delivered',
        timestamp: new Date(),
        note: 'Order delivered successfully'
      });
      await order.save();

      // Update delivery person status
      if (order.deliveryPerson) {
        await DeliveryPerson.findByIdAndUpdate(order.deliveryPerson, {
          status: 'available',
          currentOrder: null,
          $inc: { totalDeliveries: 1 }
        });
      }

      return res.json({ 
        success: true, 
        message: 'Order completed',
        status: 'delivered',
        currentStage: 'Reached'
      });
    }

    // Move to next stage
    const nextStage = stages[currentIndex + 1];
    order.currentStage = nextStage;
    order.stageStartTime = new Date();

    // Update status based on stage
    const stageToStatus = {
      'To Restaurant': 'preparing',
      'Preparing': 'preparing',
      'Ready to Pickup': 'ready',
      'Rider En Route': 'out_for_delivery',
      'Reached': 'delivered'
    };

    const newStatus = stageToStatus[nextStage];
    if (newStatus && newStatus !== order.status) {
      order.status = newStatus;
      order.statusTimestamps[newStatus] = new Date();
      order.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note: `Stage: ${nextStage}`
      });
    }

    await order.save();

    res.json({ 
      success: true, 
      message: `Advanced to ${nextStage}`,
      currentStage: nextStage,
      status: newStatus,
      stageStartTime: order.stageStartTime
    });
  } catch (error) {
    console.error('Error advancing stage:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-progression function (10 seconds per stage for consistency)
async function startAutoProgression(orderId) {
  const STAGE_DURATION = 10000; // 10 seconds (changed from 30 for consistency)
  const stages = ['To Restaurant', 'Preparing', 'Ready to Pickup', 'Rider En Route', 'Reached'];
  const DeliveryPerson = require('../models/DeliveryPerson');
  
  console.log(`🚀 Starting auto-progression for order ${orderId}`);
  
  // Loop through stages, advancing every 10 seconds
  for (let i = 0; i < stages.length - 1; i++) {
    // Wait for stage duration
    await new Promise(resolve => setTimeout(resolve, STAGE_DURATION));
    
    try {
      const order = await Order.findById(orderId);
      
      if (!order || order.status === 'cancelled' || order.status === 'delivered') {
        console.log(`⏹️ Auto-progression stopped for order ${orderId} - Status: ${order?.status || 'not found'}`);
        break;
      }

      const currentIndex = stages.indexOf(order.currentStage);
      
      // Move to next stage
      if (currentIndex < stages.length - 1) {
        const nextStage = stages[currentIndex + 1];
        order.currentStage = nextStage;
        order.stageStartTime = new Date();

        // Update status based on stage
        const stageToStatus = {
          'To Restaurant': 'preparing',
          'Preparing': 'preparing',
          'Ready to Pickup': 'ready',
          'Rider En Route': 'out_for_delivery',
          'Reached': 'delivered'
        };

        const newStatus = stageToStatus[nextStage];
        if (newStatus && newStatus !== order.status) {
          order.status = newStatus;
          if (!order.statusTimestamps) order.statusTimestamps = {};
          order.statusTimestamps[newStatus] = new Date();
          order.statusHistory.push({
            status: newStatus,
            timestamp: new Date(),
            note: `Auto-advanced to stage: ${nextStage}`
          });
        }

        await order.save();
        console.log(`✅ Order ${order.orderNumber} auto-advanced from "${stages[currentIndex]}" to "${nextStage}"`);
        
        // If reached final stage, mark as delivered
        if (nextStage === 'Reached') {
          order.status = 'delivered';
          order.actualDeliveryTime = new Date();
          if (!order.statusTimestamps) order.statusTimestamps = {};
          order.statusTimestamps.delivered = new Date();
          order.statusHistory.push({
            status: 'delivered',
            timestamp: new Date(),
            note: 'Order delivered successfully (auto-completed)'
          });
          await order.save();

          // Update delivery person
          if (order.deliveryPerson) {
            await DeliveryPerson.findByIdAndUpdate(order.deliveryPerson, {
              status: 'available',
              currentOrder: null,
              $inc: { totalDeliveries: 1 }
            });
          }

          console.log(`🎉 Order ${order.orderNumber} completed and delivered`);
          break;
        }
      }
    } catch (error) {
      console.error(`❌ Error in auto-progression for order ${orderId}:`, error);
      break;
    }
  }
}

// Submit delivery person rating
router.post('/:orderId/rate-delivery', auth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Can only rate after delivery' });
    }

    if (order.deliveryPersonRating) {
      return res.status(400).json({ success: false, message: 'Already rated this delivery. Use update endpoint to edit.' });
    }

    // Update order with rating
    order.deliveryPersonRating = rating;
    order.deliveryPersonReview = review;
    order.deliveryPersonReviewedAt = new Date();
    await order.save();

    // Update delivery person rating
    if (order.deliveryPerson) {
      const deliveryPerson = await DeliveryPerson.findById(order.deliveryPerson);
      if (deliveryPerson) {
        deliveryPerson.ratingSum = (deliveryPerson.ratingSum || 0) + rating;
        deliveryPerson.totalRatings = (deliveryPerson.totalRatings || 0) + 1;
        deliveryPerson.rating = deliveryPerson.ratingSum / deliveryPerson.totalRatings;
        await deliveryPerson.save();
      }
    }

    res.json({ 
      success: true, 
      message: 'Rating submitted successfully',
      deliveryPersonRating: rating
    });
  } catch (error) {
    console.error('Error rating delivery person:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update existing delivery person rating
router.post('/:orderId/update-delivery-rating', auth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!order.deliveryPersonRating) {
      return res.status(400).json({ success: false, message: 'No existing rating to update' });
    }

    const oldRating = order.deliveryPersonRating;

    // Update order with new rating
    order.deliveryPersonRating = rating;
    order.deliveryPersonReview = review;
    order.deliveryPersonReviewedAt = new Date();
    await order.save();

    // Update delivery person rating (remove old, add new)
    if (order.deliveryPerson) {
      const deliveryPerson = await DeliveryPerson.findById(order.deliveryPerson);
      if (deliveryPerson) {
        deliveryPerson.ratingSum = (deliveryPerson.ratingSum || 0) - oldRating + rating;
        deliveryPerson.rating = deliveryPerson.ratingSum / deliveryPerson.totalRatings;
        await deliveryPerson.save();
      }
    }

    res.json({ 
      success: true, 
      message: 'Rating updated successfully',
      deliveryPersonRating: rating
    });
  } catch (error) {
    console.error('Error updating delivery rating:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit menu item reviews
router.post('/:orderId/rate-items', auth, async (req, res) => {
  try {
    const { itemReviews } = req.body; // Array of { menuItemId, rating, review }
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Can only review after delivery' });
    }

    if (order.itemReviews && order.itemReviews.length > 0) {
      return res.status(400).json({ success: false, message: 'Already reviewed items. Use update endpoint to edit.' });
    }

    // Add reviews to order
    const reviewsToAdd = itemReviews.map(review => ({
      menuItem: review.menuItemId,
      rating: review.rating,
      review: review.review,
      reviewedAt: new Date()
    }));

    order.itemReviews = order.itemReviews || [];
    order.itemReviews.push(...reviewsToAdd);
    await order.save();

    // Update menu items ratings
    for (const review of itemReviews) {
      const menuItem = await MenuItem.findById(review.menuItemId);
      if (menuItem) {
        menuItem.ratingSum = (menuItem.ratingSum || 0) + review.rating;
        menuItem.totalReviews = (menuItem.totalReviews || 0) + 1;
        menuItem.rating = menuItem.ratingSum / menuItem.totalReviews;
        await menuItem.save();
      }
    }

    res.json({ 
      success: true, 
      message: 'Reviews submitted successfully',
      reviewCount: itemReviews.length
    });
  } catch (error) {
    console.error('Error rating items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update existing menu item reviews
router.post('/:orderId/update-item-ratings', auth, async (req, res) => {
  try {
    const { itemReviews } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!order.itemReviews || order.itemReviews.length === 0) {
      return res.status(400).json({ success: false, message: 'No existing reviews to update' });
    }

    // Update each item review
    for (const newReview of itemReviews) {
      const existingReviewIndex = order.itemReviews.findIndex(
        r => r.menuItem.toString() === newReview.menuItemId
      );

      if (existingReviewIndex !== -1) {
        const oldRating = order.itemReviews[existingReviewIndex].rating;
        
        // Update order review
        order.itemReviews[existingReviewIndex].rating = newReview.rating;
        order.itemReviews[existingReviewIndex].review = newReview.review;
        order.itemReviews[existingReviewIndex].reviewedAt = new Date();

        // Update menu item rating (remove old, add new)
        const menuItem = await MenuItem.findById(newReview.menuItemId);
        if (menuItem) {
          menuItem.ratingSum = (menuItem.ratingSum || 0) - oldRating + newReview.rating;
          menuItem.rating = menuItem.ratingSum / menuItem.totalReviews;
          await menuItem.save();
        }
      } else {
        // Add new review if not exists
        order.itemReviews.push({
          menuItem: newReview.menuItemId,
          rating: newReview.rating,
          review: newReview.review,
          reviewedAt: new Date()
        });

        // Add to menu item rating
        const menuItem = await MenuItem.findById(newReview.menuItemId);
        if (menuItem) {
          menuItem.ratingSum = (menuItem.ratingSum || 0) + newReview.rating;
          menuItem.totalReviews = (menuItem.totalReviews || 0) + 1;
          menuItem.rating = menuItem.ratingSum / menuItem.totalReviews;
          await menuItem.save();
        }
      }
    }

    await order.save();

    res.json({ 
      success: true, 
      message: 'Reviews updated successfully',
      reviewCount: itemReviews.length
    });
  } catch (error) {
    console.error('Error updating item ratings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get menu item reviews
router.get('/menu-item/:menuItemId/reviews', async (req, res) => {
  try {
    const orders = await Order.find({
      'itemReviews.menuItem': req.params.menuItemId,
      status: 'delivered'
    })
    .populate('customer', 'name')
    .select('itemReviews customer createdAt');

    const reviews = [];
    orders.forEach(order => {
      const itemReview = order.itemReviews.find(
        r => r.menuItem.toString() === req.params.menuItemId
      );
      if (itemReview) {
        reviews.push({
          rating: itemReview.rating,
          review: itemReview.review,
          reviewedAt: itemReview.reviewedAt,
          customerName: order.customer.name,
          orderDate: order.createdAt
        });
      }
    });

    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
