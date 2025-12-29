const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');

// Get reviews for a menu item
router.get('/menu-item/:menuItemId', async (req, res) => {
  try {
    const reviews = await Review.find({ menuItem: req.params.menuItemId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Error fetching reviews' });
  }
});

// Get user's reviews
router.get('/my-reviews', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('menuItem', 'name image restaurant')
      .populate({
        path: 'menuItem',
        populate: { path: 'restaurant', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ success: false, message: 'Error fetching reviews' });
  }
});

// Get reviewable items (from completed orders that haven't been reviewed)
router.get('/reviewable-items', auth, async (req, res) => {
  try {
    // Find completed/delivered orders
    const orders = await Order.find({
      customer: req.user._id,
      status: { $in: ['Delivered', 'Completed'] }
    }).populate('items.menuItem').sort({ createdAt: -1 });

    // Get all reviewed items
    const reviews = await Review.find({ user: req.user._id });
    const reviewedItems = new Set(
      reviews.map(r => `${r.menuItem.toString()}_${r.order.toString()}`)
    );

    // Filter out already reviewed items
    const reviewableItems = [];
    for (const order of orders) {
      for (const item of order.items) {
        const key = `${item.menuItem._id.toString()}_${order._id.toString()}`;
        if (!reviewedItems.has(key) && item.menuItem) {
          reviewableItems.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderDate: order.createdAt,
            menuItem: item.menuItem,
            quantity: item.quantity
          });
        }
      }
    }

    res.json({ success: true, reviewableItems });
  } catch (error) {
    console.error('Error fetching reviewable items:', error);
    res.status(500).json({ success: false, message: 'Error fetching reviewable items' });
  }
});

// Create a review
router.post('/', auth, async (req, res) => {
  try {
    const { menuItemId, orderId, rating, comment, images } = req.body;

    // Verify user ordered this item
    const order = await Order.findOne({
      _id: orderId,
      customer: req.user._id,
      'items.menuItem': menuItemId,
      status: { $in: ['Delivered', 'Completed'] }
    });

    if (!order) {
      return res.status(403).json({
        success: false,
        message: 'You can only review items from your completed orders'
      });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      user: req.user._id,
      menuItem: menuItemId,
      order: orderId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this item from this order'
      });
    }

    // Create review
    const review = new Review({
      user: req.user._id,
      menuItem: menuItemId,
      order: orderId,
      rating: parseInt(rating),
      comment,
      images: images || []
    });

    await review.save();

    // Update menu item rating
    const reviews = await Review.find({ menuItem: menuItemId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await MenuItem.findByIdAndUpdate(menuItemId, {
      rating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length
    });

    // Populate user info before returning
    await review.populate('user', 'name email');

    res.json({
      success: true,
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Error creating review' });
  }
});

// Update a review
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;

    const review = await Review.findOne({
      _id: req.params.reviewId,
      user: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.rating = parseInt(rating);
    review.comment = comment;
    if (images) review.images = images;

    await review.save();

    // Update menu item rating
    const reviews = await Review.find({ menuItem: review.menuItem });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await MenuItem.findByIdAndUpdate(review.menuItem, {
      rating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length
    });

    await review.populate('user', 'name email');

    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ success: false, message: 'Error updating review' });
  }
});

// Delete a review
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.reviewId,
      user: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const menuItemId = review.menuItem;
    await review.deleteOne();

    // Update menu item rating
    const reviews = await Review.find({ menuItem: menuItemId });
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    
    await MenuItem.findByIdAndUpdate(menuItemId, {
      rating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Error deleting review' });
  }
});

// Mark review as helpful
router.post('/:reviewId/helpful', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const userId = req.user._id.toString();
    const helpfulIndex = review.helpful.findIndex(id => id.toString() === userId);

    if (helpfulIndex > -1) {
      // Remove helpful
      review.helpful.splice(helpfulIndex, 1);
    } else {
      // Add helpful
      review.helpful.push(req.user._id);
    }

    review.helpfulCount = review.helpful.length;
    await review.save();

    res.json({
      success: true,
      helpful: helpfulIndex === -1,
      helpfulCount: review.helpfulCount
    });
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({ success: false, message: 'Error updating review' });
  }
});

module.exports = router;
