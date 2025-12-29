const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { assignDeliveryPerson, retryAssignmentWithDelay } = require('../library/deliveryService');

// Initialize Stripe only if key is available
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Exchange rate: 1 USD = 110 BDT (approximately)
const BDT_TO_USD_RATE = 110;

// Create payment intent
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to .env file.' });
    }

    const { restaurantId, items, deliveryAddress, contactPhone } = req.body;

    // Fetch restaurant details
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Calculate total
    let subtotal = 0;
    const orderItems = items.map(item => {
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;
      return {
        menuItem: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        customizations: item.customizations || {},
        subtotal: itemSubtotal
      };
    });

    const deliveryFee = restaurant.deliveryFee || 50;
    const tax = Math.round(subtotal * 0.05); // 5% tax
    const total = subtotal + deliveryFee + tax;

    // Convert BDT to USD for Stripe
    const amountInUSD = Math.round((total / BDT_TO_USD_RATE) * 100); // Amount in cents

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInUSD,
      currency: 'usd',
      description: `Order from ${restaurant.name}`,
      metadata: {
        restaurantId: restaurantId,
        customerId: req.user._id.toString(),
        amountInBDT: total,
        restaurantName: restaurant.name
      },
      // If restaurant has Stripe Connect account, transfer funds
      ...(restaurant.stripeAccountId && {
        transfer_data: {
          destination: restaurant.stripeAccountId,
        },
        application_fee_amount: Math.round(amountInUSD * 0.05), // 5% platform fee
      })
    });

    // Create order in database
    const order = new Order({
      customer: req.user._id,
      restaurant: restaurantId,
      items: orderItems,
      deliveryAddress,
      contactPhone,
      pricing: {
        subtotal,
        deliveryFee,
        tax,
        discount: 0,
        total
      },
      payment: {
        method: 'stripe',
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        amountInBDT: total,
        amountInUSD: amountInUSD / 100
      },
      status: 'pending'
    });

    await order.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret
      },
      order: {
        _id: order._id,
        orderNumber: order.orderNumber
      },
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: total,
      amountUSD: amountInUSD / 100
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm payment and update order
router.post('/confirm-payment', auth, async (req, res) => {
  try {
    const { orderId, paymentIntentId, testMode } = req.body;

    let paymentIntent;
    
    // If Stripe is not configured, return error
    if (!stripe) {
      return res.status(500).json({ 
        success: false, 
        message: 'Stripe is not configured properly' 
      });
    }

    // In test mode, simulate successful payment
    if (testMode) {
      console.log('⚠️ TEST MODE: Simulating successful payment');
      paymentIntent = { status: 'succeeded', id: paymentIntentId || `test_${Date.now()}` };
    } else {
      // REAL MODE: Verify payment with Stripe
      console.log('💳 REAL PAYMENT MODE: Verifying payment with Stripe');
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ 
          success: false, 
          message: 'Payment not completed. Status: ' + paymentIntent.status 
        });
      }
      
      console.log('✅ Real payment verified successfully');
    }

    // Update order
    const order = await Order.findById(orderId).populate('restaurant', 'name image address contact');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
    order.payment.transactionId = paymentIntent.id;
    order.status = 'confirmed';
    order.currentStage = 'To Restaurant';
    order.stageStartTime = new Date();
    order.statusTimestamps = {
      pending: order.createdAt,
      confirmed: new Date()
    };
    order.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: testMode ? 'Payment simulated (TEST MODE) and order confirmed' : 'Payment received and order confirmed'
    });

    await order.save();

    // Update restaurant total orders
    await Restaurant.findByIdAndUpdate(order.restaurant, {
      $inc: { totalOrders: 1 }
    });

    console.log(`✅ Payment confirmed for order ${order.orderNumber}`);
    console.log(`💰 Amount: ৳${order.pricing.total} (${order.payment.amountInUSD} USD)`);
    
    // Emit real-time notification to restaurant via Socket.io
    try {
      const io = req.app.get('io');
      if (io) {
        // Populate order with customer details for notification
        const populatedOrder = await Order.findById(order._id)
          .populate('customer', 'name email phone');
        
        io.to(`restaurant-${order.restaurant._id || order.restaurant}`).emit('new-order', {
          orderId: populatedOrder._id,
          orderNumber: populatedOrder.orderNumber,
          customer: populatedOrder.customer,
          items: populatedOrder.items,
          pricing: populatedOrder.pricing,
          status: populatedOrder.status,
          createdAt: populatedOrder.createdAt
        });
        console.log(`🔔 Real-time notification sent to restaurant ${order.restaurant._id || order.restaurant}`);
      }
    } catch (socketError) {
      console.error('Socket.io notification error:', socketError);
      // Don't fail the payment, just log the error
    }
    
    // Start delivery person assignment process
    console.log('🔍 Starting delivery person assignment...');
    try {
      const assignmentResult = await assignDeliveryPerson(order._id);
      
      if (assignmentResult.success) {
        console.log(`✅ Delivery person assigned: ${assignmentResult.deliveryPerson.name}`);
        // Start auto-progression after successful assignment
        setTimeout(() => {
          startOrderAutoProgression(order._id);
        }, 1000);
      } else if (assignmentResult.willRetry) {
        console.log(`⏳ No delivery person found, will retry...`);
        // Start retry process
        retryAssignmentWithDelay(order._id);
      } else if (assignmentResult.orderCancelled) {
        console.log(`❌ Order cancelled - no delivery person available`);
      }
    } catch (assignError) {
      console.error('Delivery assignment error:', assignError);
      // Don't fail the payment, just log the error
    }

    if (order.restaurant && order.restaurant.stripeAccountId) {
      console.log(`💸 Transfer to restaurant account: ${order.restaurant.stripeAccountId}`);
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      order: order,
      paymentDetails: {
        status: 'paid',
        amountBDT: order.pricing.total,
        amountUSD: order.payment.amountInUSD,
        transactionId: paymentIntent.id,
        paidAt: order.payment.paidAt
      }
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get customer orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('restaurant', 'name image address')
      .populate('deliveryPerson', 'name phone profilePicture rating totalRatings totalDeliveries vehicleType vehicleNumber')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get restaurant orders (for restaurant owners)
router.get('/restaurant-orders/:restaurantId', auth, async (req, res) => {
  try {
    const Restaurant = require('../models/Restaurant');
    
    // Verify the restaurant belongs to the logged-in user
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    
    if (restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view these orders' });
    }
    
    // Fetch orders for this restaurant only
    const orders = await Order.find({ restaurant: req.params.restaurantId })
      .populate('customer', 'name email phone')
      .populate('deliveryPerson', 'name phone profilePicture rating')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Fetch restaurant orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get new restaurant orders since timestamp (for real-time notifications)
router.get('/restaurant-new-orders/:restaurantId', auth, async (req, res) => {
  try {
    const Restaurant = require('../models/Restaurant');
    const { since } = req.query;
    
    // Verify the restaurant belongs to the logged-in user
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    
    if (restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view these orders' });
    }
    
    // Build query for new orders since the given timestamp
    const query = { 
      restaurant: req.params.restaurantId,
      status: { $in: ['confirmed', 'preparing', 'ready', 'picked_up', 'delivering', 'delivered'] }
    };
    
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }
    
    // Fetch new orders
    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Fetch new restaurant orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single order details
router.get('/orders/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('restaurant', 'name image address contact')
      .populate('customer', 'name email phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if user is authorized to view this order
    if (order.customer._id.toString() !== req.user._id.toString() && 
        order.restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Fetch order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment successful:', paymentIntent.id);
      
      // Update order status
      await Order.findOneAndUpdate(
        { 'payment.stripePaymentIntentId': paymentIntent.id },
        {
          'payment.status': 'paid',
          'payment.paidAt': new Date(),
          status: 'confirmed'
        }
      );
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      
      await Order.findOneAndUpdate(
        { 'payment.stripePaymentIntentId': failedPayment.id },
        {
          'payment.status': 'failed',
          status: 'cancelled',
          cancellationReason: 'Payment failed'
        }
      );
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Auto-progression function for orders (10 seconds per stage)
async function startOrderAutoProgression(orderId) {
  const STAGE_DURATION = 10000; // 10 seconds
  const stages = ['To Restaurant', 'Preparing', 'Ready to Pickup', 'Rider En Route', 'Reached'];
  const DeliveryPerson = require('../models/DeliveryPerson');
  
  for (let i = 0; i < stages.length; i++) {
    await new Promise(resolve => setTimeout(resolve, STAGE_DURATION));
    
    try {
      const order = await Order.findById(orderId);
      
      if (!order || order.status === 'cancelled' || order.status === 'delivered') {
        console.log(`Auto-progression stopped for order ${orderId}`);
        break;
      }

      const currentIndex = stages.indexOf(order.currentStage);
      if (currentIndex < stages.length - 1) {
        const nextStage = stages[currentIndex + 1];
        order.currentStage = nextStage;
        order.stageStartTime = new Date();

        // Update status
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
        console.log(`✅ Order ${order.orderNumber} auto-advanced to ${nextStage}`);
      } else {
        // Final stage - mark as delivered
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

        console.log(`✅ Order ${order.orderNumber} completed and delivered`);
        break;
      }
    } catch (error) {
      console.error(`Error in auto-progression for order ${orderId}:`, error);
      break;
    }
  }
}

// Get user's orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('restaurant', 'name address contactNumber')
      .populate('deliveryPerson', 'name phone vehicleType')
      .sort({ createdAt: -1 }); // Most recent first

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

module.exports = router;
