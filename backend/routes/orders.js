const express = require('express');
const router = express.Router();

// In-memory storage for orders (in production, use database)
let orders = [];
let orderCounter = 1000;

// Create new order
router.post('/', (req, res) => {
  try {
    const {
      restaurant,
      items,
      deliveryAddress,
      contactNumber,
      orderMode,
      donateAmount,
      selectedNGO,
      deliveryTime,
      paymentMethod,
      totals
    } = req.body;

    const order = {
      _id: `order_${Date.now()}`,
      orderNumber: `ORD${orderCounter++}`,
      restaurant,
      items,
      deliveryAddress,
      contactNumber,
      orderMode,
      donateAmount,
      selectedNGO,
      deliveryTime,
      paymentMethod,
      totals,
      status: 'preparing',
      createdAt: new Date(),
      estimatedTime: 30,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ORDER_${orderCounter - 1}`,
      rider: null
    };

    orders.push(order);

    // Simulate assigning rider after 10 seconds
    setTimeout(() => {
      const orderIndex = orders.findIndex(o => o._id === order._id);
      if (orderIndex !== -1) {
        orders[orderIndex].rider = {
          name: 'John Doe',
          phone: '+8801712345678',
          vehicle: 'Motorcycle',
          vehicleNumber: 'DHA-1234',
          rating: 4.8,
          deliveries: 150,
          avatar: 'https://via.placeholder.com/80'
        };
        orders[orderIndex].riderLocation = {
          lat: 23.8103,
          lng: 90.4125
        };
      }
    }, 10000);

    res.json({ 
      success: true, 
      order,
      message: 'Order placed successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get order details
router.get('/:id', (req, res) => {
  try {
    const order = orders.find(o => o._id === req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm order delivery
router.post('/:id/confirm', (req, res) => {
  try {
    const orderIndex = orders.findIndex(o => o._id === req.params.id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    orders[orderIndex].status = 'delivered';
    orders[orderIndex].deliveredAt = new Date();

    res.json({ 
      success: true, 
      message: 'Order confirmed as delivered' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get order receipt
router.get('/:id/receipt', (req, res) => {
  try {
    const order = orders.find(o => o._id === req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // In production, generate PDF receipt
    res.json({ 
      success: true, 
      order,
      receipt: {
        orderNumber: order.orderNumber,
        date: order.createdAt,
        items: order.items,
        totals: order.totals
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Simulate order status updates (for testing)
router.post('/:id/update-status', (req, res) => {
  try {
    const { status } = req.body;
    const orderIndex = orders.findIndex(o => o._id === req.params.id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    orders[orderIndex].status = status;

    res.json({ 
      success: true, 
      message: 'Order status updated',
      order: orders[orderIndex]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
