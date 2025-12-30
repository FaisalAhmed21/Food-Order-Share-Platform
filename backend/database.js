const mongoose = require('mongoose');

// Use MONGODB_URI from .env file
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://shuvo:shuvo@cluster0.4yrmqjc.mongodb.net/food-order-platform?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB (food-order-platform)');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
})