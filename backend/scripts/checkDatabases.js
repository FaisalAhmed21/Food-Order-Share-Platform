require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabases() {
  try {
    // Connect to food-order-platform
    await mongoose.connect('mongodb+srv://shuvo:shuvo@cluster0.4yrmqjc.mongodb.net/food-order-platform');
    console.log('\n=== FOOD-ORDER-PLATFORM (MAIN) ===');
    const mainDb = mongoose.connection.db;
    const mainCols = await mainDb.listCollections().toArray();
    console.log('Collections:', mainCols.map(c => c.name).join(', '));
    
    const mainStats = {};
    for (const col of mainCols) {
      const count = await mainDb.collection(col.name).countDocuments();
      mainStats[col.name] = count;
    }
    console.log('\nDocument counts:');
    Object.keys(mainStats).sort().forEach(k => console.log(`  ${k}: ${mainStats[k]}`));
    
    await mongoose.disconnect();
    
    // Connect to food_donation_platform
    const donationConn = await mongoose.createConnection('mongodb+srv://shuvo:shuvo@cluster0.4yrmqjc.mongodb.net/food_donation_platform').asPromise();
    console.log('\n=== FOOD_DONATION_PLATFORM (OLD) ===');
    const donationDb = donationConn.db;
    const donationCols = await donationDb.listCollections().toArray();
    console.log('Collections:', donationCols.map(c => c.name).join(', '));
    
    const donationStats = {};
    for (const col of donationCols) {
      const count = await donationDb.collection(col.name).countDocuments();
      donationStats[col.name] = count;
    }
    console.log('\nDocument counts:');
    Object.keys(donationStats).sort().forEach(k => console.log(`  ${k}: ${donationStats[k]}`));
    
    await donationConn.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

checkDatabases();
