const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get order analytics for a restaurant
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'Restaurant') {
      return res.status(403).json({ message: 'Only restaurants can access this endpoint' });
    }

    const { period = 'month' } = req.query; // day, week, month, year
    
    const orders = await Order.find({ restaurant: req.userId });

    // Calculate date ranges
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    const filteredOrders = orders.filter(order => new Date(order.createdAt) >= startDate);
    const completedOrders = filteredOrders.filter(o => o.status === 'delivered');

    // Calculate revenue
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = completedOrders.length > 0 
      ? totalRevenue / completedOrders.length 
      : 0;

    // Order type breakdown
    const orderForMe = completedOrders.filter(o => o.orderType === 'Order for Me').length;
    const donatedMeals = completedOrders.filter(o => o.orderType === 'Donate a Meal').length;

    // Status breakdown
    const statusCounts = {
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };

    // Calculate daily/weekly trends
    const trends = {};
    const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : period === 'year' ? 365 : 1;
    
    for (let i = daysInPeriod - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === dateKey;
      });
      
      const dayCompleted = dayOrders.filter(o => o.status === 'delivered');
      
      trends[dateKey] = {
        orders: dayOrders.length,
        revenue: dayCompleted.reduce((sum, o) => sum + o.totalAmount, 0),
        completed: dayCompleted.length
      };
    }

    // Customer feedback analysis
    const ordersWithFeedback = completedOrders.filter(o => o.customerFeedback && o.customerFeedback.rating);
    const averageRating = ordersWithFeedback.length > 0
      ? ordersWithFeedback.reduce((sum, o) => sum + o.customerFeedback.rating, 0) / ordersWithFeedback.length
      : 0;

    // Rating distribution
    const ratingDistribution = {
      5: ordersWithFeedback.filter(o => o.customerFeedback.rating === 5).length,
      4: ordersWithFeedback.filter(o => o.customerFeedback.rating === 4).length,
      3: ordersWithFeedback.filter(o => o.customerFeedback.rating === 3).length,
      2: ordersWithFeedback.filter(o => o.customerFeedback.rating === 2).length,
      1: ordersWithFeedback.filter(o => o.customerFeedback.rating === 1).length
    };

    // Most popular items
    const itemCounts = {};
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        if (itemCounts[item.name]) {
          itemCounts[item.name] += item.quantity;
        } else {
          itemCounts[item.name] = item.quantity;
        }
      });
    });

    const popularItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      success: true,
      analytics: {
        period,
        totalOrders: filteredOrders.length,
        completedOrders: completedOrders.length,
        totalRevenue,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        orderForMe,
        donatedMeals,
        statusCounts,
        trends,
        feedback: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalFeedbacks: ordersWithFeedback.length,
          ratingDistribution
        },
        popularItems
      }
    });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent customer feedbacks
router.get('/feedbacks', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'Restaurant') {
      return res.status(403).json({ message: 'Only restaurants can access this endpoint' });
    }

    const orders = await Order.find({ 
      restaurant: req.userId,
      'customerFeedback.rating': { $exists: true }
    })
    .populate('customer', 'name')
    .sort({ 'customerFeedback.addedAt': -1 })
    .limit(20);

    const feedbacks = orders.map(order => ({
      orderId: order._id,
      customerName: order.customerName,
      rating: order.customerFeedback.rating,
      comment: order.customerFeedback.comment,
      addedAt: order.customerFeedback.addedAt,
      orderDate: order.createdAt
    }));

    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new order (for testing purposes)
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, items, totalAmount, orderType, deliveryAddress } = req.body;

    const restaurant = await User.findById(restaurantId);
    const customer = await User.findById(req.userId);
    
    if (!restaurant || !customer) {
      return res.status(404).json({ message: 'User not found' });
    }

    const order = new Order({
      restaurant: restaurantId,
      restaurantName: restaurant.organizationName || restaurant.name,
      customer: req.userId,
      customerName: customer.name,
      items,
      totalAmount,
      orderType: orderType || 'Order for Me',
      deliveryAddress,
      paymentStatus: 'paid'
    });

    await order.save();

    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully',
      order 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add feedback to an order
router.patch('/:id/feedback', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to add feedback to this order' });
    }

    order.customerFeedback = {
      rating,
      comment,
      addedAt: new Date()
    };

    await order.save();

    res.json({ 
      success: true, 
      message: 'Feedback added successfully',
      order 
    });
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
