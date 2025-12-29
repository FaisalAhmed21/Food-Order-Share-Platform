require('dotenv').config();
const mongoose = require('mongoose');
const FoodDonation = require('../models/FoodDonation');
const NGOProfile = require('../models/NGOProfile');
const User = require('../models/User');
const { sendNotificationEmail } = require('../config/emailService');
const { sendPushNotification } = require('../config/pushService');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const user = await User.findOne();
    if (!user) {
      console.error('No users found in DB. Create a user first.');
      process.exit(1);
    }

    // Sample donation
    const donation = new FoodDonation({
      donor: user._id,
      donorType: user.role === 'Restaurant' ? 'Restaurant' : 'Customer',
      title: 'Test Donation - Mixed Veg Curry',
      quantity: '5 plates',
      servings: 5,
      foodType: 'Veg',
      freshnessLevel: 'Just Cooked',
      expiryDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      description: 'Automated test donation',
      photos: [{ url: 'https://via.placeholder.com/800' }, { url: 'https://via.placeholder.com/801' }],
      pickupAddress: {
        fullAddress: 'Test address, Dhaka',
        // Use GeoJSON Point for spatial index
        coordinates: { type: 'Point', coordinates: [90.4125, 23.8103] }
      },
      pickupWindow: { from: new Date(), to: new Date(Date.now() + 60 * 60 * 1000) },
      safetyChecklist: { properlyPacked: true, noContamination: true, safeTempStorage: true, correctExpiry: true, pickupReady: true },
      hasUncertainty: false,
      warningAccepted: true
    });

    // Insert raw document directly into collection using GeoJSON for coordinates
    const latVal = 23.8103;
    const lngVal = 90.4125;

    const rawDoc = {
      donor: user._id,
      donorType: user.role === 'Restaurant' ? 'Restaurant' : 'Customer',
      title: 'Test Donation - Mixed Veg Curry',
      quantity: '5 plates',
      servings: 5,
      foodType: 'Veg',
      freshnessLevel: 'Just Cooked',
      expiryDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      description: 'Automated test donation',
      photos: [{ url: 'https://via.placeholder.com/800' }, { url: 'https://via.placeholder.com/801' }],
      pickupAddress: {
        fullAddress: 'Test address, Dhaka',
        coordinates: { type: 'Point', coordinates: [lngVal, latVal] }
      },
      pickupWindow: { from: new Date(), to: new Date(Date.now() + 60 * 60 * 1000) },
      safetyChecklist: { properlyPacked: true, noContamination: true, safeTempStorage: true, correctExpiry: true, pickupReady: true },
      hasUncertainty: false,
      warningAccepted: true,
      status: 'Available',
      urgencyLevel: 'Approaching',
      conversionOptions: { canConvertToSale: false, volunteerRequested: false, pickupExtended: false, compostingRequested: false },
      expiryWarningsSent: 0,
      autoExpired: false,
      pickupProof: [],
      notifiedNGOs: [],
      notifiedVolunteers: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const collection = mongoose.connection.db.collection('fooddonations');
    const insertRes = await collection.insertOne(rawDoc);
    const insertedId = insertRes.insertedId;
    console.log('Donation created (raw):', insertedId);

    const lat = latVal;
    const lng = lngVal;

    const nearbyNGOs = await NGOProfile.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 20000
        }
      },
      isVerified: true,
      isAcceptingItems: true
    }).populate('user', 'name email phone');

    const eligibleNGOs = nearbyNGOs.filter(ngo => ngo.acceptsFoodType(donation.foodType));

    donation.notifiedNGOs = eligibleNGOs.map(ngo => ({ ngoId: ngo.user._id, notifiedAt: new Date() }));
    await donation.save();

    console.log(`Notifying ${eligibleNGOs.length} NGOs`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const subject = `New Food Donation: ${donation.title}`;
    const html = `<p>${donation.title} posted. View: ${frontendUrl}/donation-details?id=${donation._id}</p>`;

    for (const ngo of eligibleNGOs) {
      if (ngo.user && ngo.user.email) {
        await sendNotificationEmail(ngo.user.email, subject, html);
      }
      if (ngo.pushSubscription) {
        await sendPushNotification(ngo.pushSubscription, { title: donation.title, body: 'New donation available', url: `${frontendUrl}/donation-details?id=${donation._id}` });
      }
    }

    console.log('Notifications attempted.');
    process.exit(0);
  } catch (err) {
    console.error('Error in test donation script', err);
    process.exit(1);
  }
})();
