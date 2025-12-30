require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');

async function checkBFC() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const bfc = await Restaurant.findOne({ name: /BFC/i });
    
    if (!bfc) {
      console.log('BFC restaurant not found');
      return;
    }
    
    console.log('\n=== BFC RESTAURANT STATUS ===');
    console.log('Name:', bfc.name);
    console.log('ID:', bfc._id);
    console.log('isActive:', bfc.isActive);
    console.log('status:', bfc.status);
    console.log('owner:', bfc.owner);
    console.log('verificationMark:', bfc.verificationMark);
    console.log('branches:', bfc.branches ? bfc.branches.length : 0);
    console.log('image:', bfc.image);
    console.log('cuisine:', bfc.cuisine);
    console.log('description:', bfc.description);
    
    // Check if it would be returned by the query
    const query = { isActive: true, _id: bfc._id };
    const wouldBeReturned = await Restaurant.findOne(query);
    console.log('\nWould be returned in /api/all query:', wouldBeReturned ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkBFC();
