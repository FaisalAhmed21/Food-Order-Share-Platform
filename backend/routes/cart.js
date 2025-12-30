const express = require('express');
const router = express.Router();

// In-memory storage for carts (in production, use database)
let carts = {};

// Save cart
router.post('/save', (req, res) => {
  try {
    const { cart, restaurantId } = req.body;
    const userId = req.user?.id || 'guest'; // Get from auth token in production

    carts[userId] = {
      cart,
      restaurantId,
      updatedAt: new Date()
    };

    res.json({ 
      success: true, 
      message: 'Cart saved successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get cart
router.get('/', (req, res) => {
  try {
    const userId = req.user?.id || 'guest';
    const cartData = carts[userId] || { cart: [], restaurantId: null };

    res.json({ 
      success: true, 
      cart: cartData.cart,
      restaurantId: cartData.restaurantId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear cart
router.post('/clear', (req, res) => {
  try {
    const userId = req.user?.id || 'guest';
    delete carts[userId];

    res.json({ 
      success: true, 
      message: 'Cart cleared successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
