require('dotenv').config();
const mongoose = require('mongoose');

async function addBranchesToBFC() {
  try {
    await mongoose.connect('mongodb+srv://shuvo:shuvo@cluster0.4yrmqjc.mongodb.net/food-order-platform');
    
    const Restaurant = require('../models/Restaurant');
    
    console.log('\n=== ADDING BRANCHES TO BFC ===');
    const bfc = await Restaurant.findOne({ name: /BFC/i });
    
    if (bfc) {
      // Add branches
      bfc.branches = [
        {
          name: 'Main Branch',
          address: bfc.address?.street || 'Main Location',
          phone: bfc.contact?.phone || '01234567890'
        },
        {
          name: 'Banasree Branch',
          address: 'Banasree, Dhaka',
          phone: '01987654321'
        }
      ];
      
      await bfc.save();
      
      console.log('\n✅ Branches added successfully!');
      console.log('Branches:', JSON.stringify(bfc.branches, null, 2));
    } else {
      console.log('❌ BFC restaurant not found');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

addBranchesToBFC();
