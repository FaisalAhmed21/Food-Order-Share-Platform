require('dotenv').config();
const mongoose = require('mongoose');

async function deleteDonationDatabase() {
  try {
    const conn = await mongoose.createConnection('mongodb+srv://shuvo:shuvo@cluster0.4yrmqjc.mongodb.net/food_donation_platform').asPromise();
    console.log('Connected to food_donation_platform database');
    
    console.log('Dropping food_donation_platform database...');
    await conn.db.dropDatabase();
    console.log('✅ Successfully deleted food_donation_platform database!');
    
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

deleteDonationDatabase();
