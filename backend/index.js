const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Import passport configuration
require('./config/passport');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder as static files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_change_this_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// CORS middleware - Allow credentials for OAuth
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add COOP headers for Google OAuth (but allow images)
app.use((req, res, next) => {
  // Don't apply restrictive COEP to uploads
  if (!req.path.startsWith('/uploads')) {
    res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-order-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  console.log('Connection state:', mongoose.connection.readyState); // 1 = connected
})
.catch(err => {
  console.log('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
try {
  console.log('Loading routes...');
  const authRoutes = require('./routes/auth');
  console.log('Auth routes loaded');
  const profileRoutes = require('./routes/profile');
  console.log('Profile routes loaded');
  const restaurantRoutes = require('./routes/restaurants');
  console.log('Restaurant routes loaded');
  const orderRoutes = require('./routes/orders');
  console.log('Order routes loaded');
  const cartRoutes = require('./routes/cart');
  console.log('Cart routes loaded');
  const ownerRoutes = require('./routes/owner');
  console.log('Owner routes loaded');
  const paymentRoutes = require('./routes/payments');
  console.log('Payment routes loaded');
  const donationRoutes = require('./routes/donations');
  console.log('Donation routes loaded');
  const foodDonationRoutes = require('./routes/foodDonations');
  console.log('Food donation routes loaded');
  const ngoRoutes = require('./routes/ngo');
  console.log('NGO routes loaded');
  const volunteerRoutes = require('./routes/volunteers');
  console.log('Volunteer routes loaded');
  const scheduledPickupRoutes = require('./routes/scheduled-pickups');
  console.log('Scheduled pickup routes loaded');
  const campaignRoutes = require('./routes/campaigns');
  console.log('Campaign routes loaded');
  const partnersRoutes = require('./routes/partners');
  console.log('Partners routes loaded');
  const reviewRoutes = require('./routes/reviews');
  console.log('Review routes loaded');
  const orderTrackingRoutes = require('./routes/orderTracking');
  console.log('Order tracking routes loaded');
  const adminRoutes = require('./routes/admin');
  console.log('Admin routes loaded');
  const chatbotRoutes = require('./routes/chatbot');
  console.log('Chatbot routes loaded');

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/restaurants/owner', ownerRoutes); // Owner routes must be before general restaurant routes
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/donations', donationRoutes);
  app.use('/api/food-donations', foodDonationRoutes);
  app.use('/api/ngo', ngoRoutes);
  app.use('/api/volunteers', volunteerRoutes);
  app.use('/api/scheduled-pickups', scheduledPickupRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/partners', partnersRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/tracking', orderTrackingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/chatbot', chatbotRoutes);
  console.log('All routes registered successfully');
} catch (error) {
  console.error('ERROR loading routes:', error);
  process.exit(1);
}

// User address routes
app.get('/api/user/addresses', (req, res) => {
  // Mock addresses - in production, fetch from database
  res.json({
    success: true,
    addresses: [
      {
        _id: 'addr1',
        address: '123 Main Street, Gulshan, Dhaka 1212',
        isDefault: true
      },
      {
        _id: 'addr2',
        address: '456 Park Avenue, Banani, Dhaka 1213',
        isDefault: false
      }
    ]
  });
});

app.post('/api/user/addresses', (req, res) => {
  const { address } = req.body;
  res.json({
    success: true,
    address: {
      _id: `addr_${Date.now()}`,
      address,
      isDefault: false
    }
  });
});

app.get('/api/user/profile', (req, res) => {
  // Mock user profile - in production, fetch from database
  res.json({
    success: true,
    user: {
      phone: '+8801712345678',
      email: 'user@example.com'
    }
  });
});

app.get('/', (req, res) => {
  res.send('Food Order and Share Platform API');
});

const server = app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log(`Backend server is running on http://localhost:${process.env.PORT || 5000}`);
  console.log('Server listening state:', server.listening);
  console.log('Server address:', server.address());
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

console.log('After app.listen(), server object created:', !!server);

// Debug: Check if process is exiting unexpectedly
process.on('beforeExit', (code) => {
  console.log('Process beforeExit event with code:', code);
});

process.on('exit', (code) => {
  console.log('Process exit event with code:', code);
});

// Socket.io setup for real-time notifications
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Store Socket.io instance in app for access in routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Restaurant joins their own room to receive order notifications
  socket.on('join-restaurant', (restaurantId) => {
    socket.join(`restaurant-${restaurantId}`);
    console.log(`Restaurant ${restaurantId} joined room for notifications`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

console.log('Socket.io server initialized');

// WebSocket setup for real-time order tracking (legacy - keeping for compatibility)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

// Store WebSocket server instance in app for access in routes
app.set('wss', wss);

const orderSubscriptions = new Map();
// donationSubscriptions: ws -> donationId
const donationSubscriptions = new Map();
// volunteerWatchers: volunteerId -> Set of ws
const volunteerWatchers = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'SUBSCRIBE_ORDER') {
        orderSubscriptions.set(ws, data.orderId);
        console.log(`Client subscribed to order: ${data.orderId}`);
        return;
      }

      // Clients (donors) subscribe to donation tracking to watch assigned volunteer
      if (data.type === 'SUBSCRIBE_DONATION') {
        const donationId = data.donationId;
        donationSubscriptions.set(ws, donationId);
        console.log(`Client subscribed to donation: ${donationId}`);

        // Lookup donation to determine assigned volunteer and add ws to volunteer watchers
        try {
          const FoodDonation = require('./models/FoodDonation');
          const VolunteerProfile = require('./models/VolunteerProfile');
          (async () => {
            const donation = await FoodDonation.findById(donationId);
            if (donation && donation.assignedVolunteer) {
              const volId = donation.assignedVolunteer.toString();
              if (!volunteerWatchers.has(volId)) volunteerWatchers.set(volId, new Set());
              volunteerWatchers.get(volId).add(ws);

              // send initial volunteer info (if available)
              const volunteer = await VolunteerProfile.findOne({ user: donation.assignedVolunteer }).populate('user', 'name phone');
              if (volunteer && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ASSIGNED_VOLUNTEER', volunteer: { id: volunteer.user._id, name: volunteer.user.name, phone: volunteer.user.phone }, currentLocation: { lat: volunteer.currentLocation.coordinates[1], lng: volunteer.currentLocation.coordinates[0] } }));
              }
            }
          })();
        } catch (err) {
          console.error('Error while subscribing to donation:', err);
        }

        return;
      }

      // Volunteers send their live location updates to server
      if (data.type === 'VOLUNTEER_LOCATION') {
        // data: { volunteerId, location: { lat, lng } }
        const { volunteerId, location } = data;
        try {
          const VolunteerProfile = require('./models/VolunteerProfile');
          (async () => {
            const vol = await VolunteerProfile.findOne({ user: volunteerId }).populate('user', 'name phone');
            if (vol) {
              // update volunteer currentLocation in DB (non-blocking)
              vol.currentLocation = { type: 'Point', coordinates: [location.lng, location.lat] };
              vol.lastLocationUpdate = new Date();
              await vol.save();
            }

            // Broadcast to watchers
            const watchers = volunteerWatchers.get(volunteerId);
            if (watchers) {
              for (let clientWs of watchers) {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'VOLUNTEER_LOCATION', volunteerId, location }));
                }
              }
            }
          })();
        } catch (err) {
          console.error('Error processing volunteer location:', err);
        }

        return;
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error (non-fatal):', error.message);
    // Don't crash the server, just log the error
    try {
      ws.terminate();
    } catch (e) {
      // Ignore termination errors
    }
  });

  ws.on('close', () => {
    orderSubscriptions.delete(ws);
    // cleanup donation subscription mapping
    const donationId = donationSubscriptions.get(ws);
    if (donationId) donationSubscriptions.delete(ws);

    // remove ws from any volunteerWatchers sets
    for (let [volId, set] of volunteerWatchers.entries()) {
      if (set.has(ws)) {
        set.delete(ws);
        if (set.size === 0) volunteerWatchers.delete(volId);
      }
    }
    console.log('WebSocket connection closed');
  });
});

// Add global error handler for WebSocket server
wss.on('error', (error) => {
  console.error('WebSocket Server error (non-fatal):', error.message);
});

// Simulate real-time order updates (for testing)
setInterval(() => {
  orderSubscriptions.forEach((orderId, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      // Simulate random rider location updates
      const mockLocation = {
        lat: 23.8103 + (Math.random() - 0.5) * 0.01,
        lng: 90.4125 + (Math.random() - 0.5) * 0.01
      };

      ws.send(JSON.stringify({
        type: 'RIDER_LOCATION',
        orderId,
        location: mockLocation
      }));
    }
  });
}, 5000); // Update every 5 seconds

// Function to broadcast order status updates
global.broadcastOrderUpdate = (orderId, status) => {
  orderSubscriptions.forEach((subOrderId, ws) => {
    if (subOrderId === orderId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ORDER_UPDATE',
        orderId,
        status
      }));
    }
  });
};

console.log('WebSocket server initialized');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Keep process alive
setInterval(() => {
  // Do nothing, just keep the event loop running
}, 1000000);