require('dotenv').config();
const mongoose = require('mongoose');

async function checkBranches() {
  try {
    await mongoose.connect('mongodb+srv://shuvo:shuvo@cluster0.4yrmqjc.mongodb.net/food-order-platform');
    
    const Restaurant = require('../models/Restaurant');
    const MenuItem = require('../models/MenuItem');
    
    console.log('\n=== RESTAURANTS WITH BRANCHES ===');
    const restaurants = await Restaurant.find({});
    
    for (const r of restaurants) {
      console.log(`\nRestaurant: ${r.name} (ID: ${r._id})`);
      console.log(`Branches:`, JSON.stringify(r.branches, null, 2));
      
      // Check menu items for this restaurant
      const menuItems = await MenuItem.find({ restaurant: r._id });
      console.log(`\nMenu Items (${menuItems.length} total):`);
      
      const branchGroups = {};
      menuItems.forEach(item => {
        const branch = item.branch || 'No Branch';
        if (!branchGroups[branch]) {
          branchGroups[branch] = [];
        }
        branchGroups[branch].push(item.name);
      });
      
      Object.keys(branchGroups).forEach(branch => {
        console.log(`  ${branch}: ${branchGroups[branch].length} items`);
        console.log(`    Items: ${branchGroups[branch].slice(0, 3).join(', ')}${branchGroups[branch].length > 3 ? '...' : ''}`);
      });
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

checkBranches();
