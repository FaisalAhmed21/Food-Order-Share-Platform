require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');

async function testBranchUpdate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find BFC restaurant
    const bfc = await Restaurant.findOne({ name: /BFC/i });
    
    if (!bfc) {
      console.log('BFC restaurant not found');
      return;
    }
    
    console.log('\n=== BEFORE UPDATE ===');
    console.log('Restaurant:', bfc.name);
    console.log('ID:', bfc._id);
    console.log('Branches:', JSON.stringify(bfc.branches, null, 2));
    
    // Add test branches
    bfc.branches = [
      {
        name: 'Main Branch',
        address: bfc.address?.street || 'Main Location, Dhaka',
        phone: bfc.contact?.phone || '01234567890'
      },
      {
        name: 'Banasree Branch',
        address: 'Banasree, Dhaka',
        phone: '01987654321'
      }
    ];
    
    await bfc.save();
    console.log('\n=== AFTER UPDATE ===');
    console.log('Branches saved successfully:');
    console.log(JSON.stringify(bfc.branches, null, 2));
    
    // Verify by re-fetching
    const updated = await Restaurant.findById(bfc._id);
    console.log('\n=== VERIFICATION (Re-fetched) ===');
    console.log('Branches:', JSON.stringify(updated.branches, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testBranchUpdate();
