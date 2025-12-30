require('dotenv').config();
const mongoose = require('mongoose');

async function checkBFCBranches() {
  try {
    await mongoose.connect('mongodb+srv://shuvo:shuvo@cluster0.4yrmqjc.mongodb.net/food-order-platform');
    
    const Restaurant = require('../models/Restaurant');
    const MenuItem = require('../models/MenuItem');
    
    console.log('\n=== BFC RESTAURANT DATA ===');
    const bfc = await Restaurant.findOne({ name: /BFC/i });
    
    if (bfc) {
      console.log(`\nRestaurant: ${bfc.name}`);
      console.log(`ID: ${bfc._id}`);
      console.log(`\nBranches field:`, JSON.stringify(bfc.branches, null, 2));
      
      // Check menu items
      const menuItems = await MenuItem.find({ restaurant: bfc._id });
      console.log(`\n=== MENU ITEMS (${menuItems.length} total) ===`);
      
      const branchGroups = {};
      menuItems.forEach(item => {
        const branch = item.branch || 'No Branch';
        if (!branchGroups[branch]) {
          branchGroups[branch] = [];
        }
        branchGroups[branch].push(item.name);
      });
      
      Object.keys(branchGroups).forEach(branch => {
        console.log(`\n${branch}: ${branchGroups[branch].length} items`);
        branchGroups[branch].forEach(item => console.log(`  - ${item}`));
      });
    } else {
      console.log('BFC restaurant not found');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

checkBFCBranches();
