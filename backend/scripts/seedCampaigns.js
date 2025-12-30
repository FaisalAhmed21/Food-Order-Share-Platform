const mongoose = require('mongoose');
require('dotenv').config();

const Campaign = require('../models/Campaign');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-order-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const campaigns = [
  {
    name: 'Ramadan Food Drive 2025',
    description: 'Support those fasting during the holy month of Ramadan by donating surplus food for iftar meals.',
    type: 'Ramadan',
    startDate: new Date('2025-03-01'),
    endDate: new Date('2025-04-01'),
    isRecurring: true,
    recurrencePattern: 'Yearly',
    goals: {
      targetMeals: 5000,
      targetDonors: 200,
      targetNGOs: 20
    },
    badges: [
      {
        name: 'Ramadan Hero',
        icon: '🌙',
        criteria: 'Donated 10+ meals during Ramadan',
        color: '#FFD700'
      },
      {
        name: 'Iftar Champion',
        icon: '🍽️',
        criteria: 'Donated 50+ meals during Ramadan',
        color: '#FF6B35'
      }
    ],
    status: 'Upcoming'
  },
  {
    name: 'Winter Warmth Campaign',
    description: 'Help feed the homeless during cold winter months with warm meals and comfort food.',
    type: 'Winter',
    startDate: new Date('2024-12-01'),
    endDate: new Date('2025-02-28'),
    isRecurring: true,
    recurrencePattern: 'Yearly',
    goals: {
      targetMeals: 3000,
      targetDonors: 150,
      targetNGOs: 15
    },
    badges: [
      {
        name: 'Winter Warrior',
        icon: '❄️',
        criteria: 'Donated 10+ meals during winter',
        color: '#4A90E2'
      },
      {
        name: 'Cold Season Champion',
        icon: '🧤',
        criteria: 'Donated 50+ meals during winter',
        color: '#5DADE2'
      }
    ],
    status: 'Active'
  },
  {
    name: 'Zero Waste Week',
    description: 'Join the fight against food waste! Share surplus food instead of throwing it away.',
    type: 'Zero Waste',
    startDate: new Date('2025-03-15'),
    endDate: new Date('2025-03-22'),
    isRecurring: true,
    recurrencePattern: 'Yearly',
    goals: {
      targetMeals: 1000,
      targetDonors: 100,
      targetNGOs: 10
    },
    badges: [
      {
        name: 'Eco Warrior',
        icon: '♻️',
        criteria: 'Prevented 10+ meals from being wasted',
        color: '#27AE60'
      },
      {
        name: 'Sustainability Star',
        icon: '🌱',
        criteria: 'Prevented 30+ meals from being wasted',
        color: '#2ECC71'
      }
    ],
    status: 'Upcoming'
  },
  {
    name: 'Eid Celebration Food Share',
    description: 'Spread the joy of Eid by sharing festive meals with those in need.',
    type: 'Festival',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2025-04-03'),
    isRecurring: true,
    recurrencePattern: 'Yearly',
    goals: {
      targetMeals: 2000,
      targetDonors: 100,
      targetNGOs: 12
    },
    badges: [
      {
        name: 'Eid Blessing',
        icon: '🌟',
        criteria: 'Shared Eid meals with 10+ people',
        color: '#9B59B6'
      },
      {
        name: 'Festival Food Hero',
        icon: '🎉',
        criteria: 'Shared Eid meals with 30+ people',
        color: '#8E44AD'
      }
    ],
    status: 'Upcoming'
  },
  {
    name: 'Restaurant Week Give Back',
    description: 'Restaurants donate surplus food from the busy restaurant week to support local communities.',
    type: 'Custom',
    startDate: new Date('2025-02-15'),
    endDate: new Date('2025-02-22'),
    isRecurring: true,
    recurrencePattern: 'Yearly',
    goals: {
      targetMeals: 1500,
      targetDonors: 50,
      targetNGOs: 10
    },
    badges: [
      {
        name: 'Restaurant Hero',
        icon: '🍴',
        criteria: 'Restaurant donated 20+ meals',
        color: '#E74C3C'
      },
      {
        name: 'Culinary Champion',
        icon: '👨‍🍳',
        criteria: 'Restaurant donated 100+ meals',
        color: '#C0392B'
      }
    ],
    status: 'Upcoming'
  },
  {
    name: 'Back to School Nutrition Drive',
    description: 'Ensure students start the school year with proper nutrition by donating healthy meals.',
    type: 'Custom',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-15'),
    isRecurring: true,
    recurrencePattern: 'Yearly',
    goals: {
      targetMeals: 2500,
      targetDonors: 120,
      targetNGOs: 15
    },
    badges: [
      {
        name: 'Education Supporter',
        icon: '📚',
        criteria: 'Donated 10+ meals for students',
        color: '#F39C12'
      },
      {
        name: 'Student Champion',
        icon: '🎓',
        criteria: 'Donated 50+ meals for students',
        color: '#E67E22'
      }
    ],
    status: 'Active'
  }
];

async function seedCampaigns() {
  try {
    console.log('Clearing existing campaigns...');
    await Campaign.deleteMany({});

    console.log('Seeding campaigns...');
    
    for (const campaignData of campaigns) {
      const campaign = new Campaign(campaignData);
      campaign.updateStatus(); // Set correct status based on dates
      await campaign.save();
      console.log(`✓ Created campaign: ${campaign.name} (Status: ${campaign.status})`);
    }

    console.log('\n✅ Campaign seeding complete!');
    console.log(`Total campaigns created: ${campaigns.length}`);
    
    // Display active campaigns
    const activeCampaigns = await Campaign.find({ status: 'Active' });
    console.log(`\nCurrently Active Campaigns: ${activeCampaigns.length}`);
    activeCampaigns.forEach(c => {
      console.log(`  - ${c.name} (${c.type})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding campaigns:', error);
    process.exit(1);
  }
}

seedCampaigns();
