/**
 * Test Script: Campaign Badge System
 * 
 * This script tests the automatic badge assignment when a campaign ends
 */

const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const User = require('../models/User');

// MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/food_donation_platform';

async function testBadgeSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a campaign to test (or create one)
    const campaign = await Campaign.findOne({ status: 'Completed' });
    
    if (!campaign) {
      console.log('⚠️ No completed campaigns found. Creating test campaign...');
      
      // Find an NGO user
      const ngoUser = await User.findOne({ role: 'ngo' });
      if (!ngoUser) {
        console.error('❌ No NGO user found. Please create an NGO account first.');
        return;
      }

      // Create test campaign
      const testCampaign = new Campaign({
        name: 'Test Badge Campaign',
        description: 'Testing automatic badge assignment',
        type: 'Custom',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (ended)
        createdBy: ngoUser._id,
        status: 'Active',
        participants: {
          donors: [
            {
              user: mongoose.Types.ObjectId(),
              contributionStats: {
                totalDonationValue: 500,
                mealsDonated: 50
              }
            },
            {
              user: mongoose.Types.ObjectId(),
              contributionStats: {
                totalDonationValue: 300,
                mealsDonated: 30
              }
            },
            {
              user: mongoose.Types.ObjectId(),
              contributionStats: {
                totalDonationValue: 150,
                mealsDonated: 15
              }
            }
          ]
        }
      });

      await testCampaign.save();
      console.log('✅ Test campaign created');

      // Test updateStatus (should trigger badge assignment)
      console.log('\n🔄 Testing automatic status update...');
      await testCampaign.updateStatus();
      await testCampaign.save();

      console.log(`\n📊 Campaign Status: ${testCampaign.status}`);
      console.log('✅ Badge assignment triggered automatically!');

      // Clean up test campaign
      await Campaign.findByIdAndDelete(testCampaign._id);
      console.log('\n🧹 Test campaign cleaned up');

    } else {
      console.log(`\n✅ Found campaign: ${campaign.name}`);
      console.log(`Status: ${campaign.status}`);
      console.log(`Donors: ${campaign.participants.donors.length}`);

      // Check if badges already assigned
      const badgesAssigned = campaign.participants.donors.filter(d => d.badge).length;
      console.log(`Badges already assigned: ${badgesAssigned}`);

      if (badgesAssigned === 0 && campaign.participants.donors.length > 0) {
        console.log('\n🏆 Testing badge assignment...');
        const assignments = await campaign.assignBadges();
        await campaign.save();

        console.log(`\n✅ Badges assigned to ${assignments.length} donors:`);
        assignments.forEach(a => {
          console.log(`  - ${a.badge}: $${a.donationAmount.toFixed(2)}`);
        });
      } else {
        console.log('\n✅ Badges already assigned or no donors to assign');
      }
    }

    // Test badge display by finding users with badges
    console.log('\n🔍 Finding users with badges...');
    const usersWithBadges = await User.find({ 'campaignBadges.0': { $exists: true } })
      .select('name email campaignBadges')
      .limit(5);

    if (usersWithBadges.length > 0) {
      console.log(`\n✅ Found ${usersWithBadges.length} users with badges:`);
      usersWithBadges.forEach(user => {
        console.log(`\n👤 ${user.name} (${user.email})`);
        user.campaignBadges.forEach(badge => {
          console.log(`   🏆 ${badge.badge} - ${badge.campaignName} - $${badge.donationAmount?.toFixed(2) || '0.00'}`);
        });
      });
    } else {
      console.log('ℹ️ No users with badges found yet');
    }

    console.log('\n✅ Badge system test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run test
testBadgeSystem();
