const VolunteerProfile = require('../models/VolunteerProfile');
const FoodDonation = require('../models/FoodDonation');
const { sendNotificationEmail } = require('../config/emailService');
const { sendPushNotification } = require('../config/pushService');

// Try to find nearest suitable volunteer and create pending assignment
async function assignNearestVolunteer(donationId, excludeVolunteerIds = []) {
  try {
    const donation = await FoodDonation.findById(donationId);
    if (!donation) return null;
    const pickup = donation.pickupAddress;
    if (!pickup || !pickup.coordinates || !pickup.coordinates.lat || !pickup.coordinates.lng) return null;

    const { lat, lng } = pickup.coordinates;
    const maxSearchMeters = 20000; // 20 km

    // Find nearby volunteers who are available and not excluded
    const nearbyVolunteers = await VolunteerProfile.find({
      isAvailable: true,
      'user': { $nin: excludeVolunteerIds },
      currentLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxSearchMeters
        }
      }
    }).populate('user', 'name email phone pushSubscription');

    for (let vol of nearbyVolunteers) {
      // skip if volunteer is in exclude list (by id or string)
      const volUserId = vol.user && (vol.user._id ? vol.user._id.toString() : vol.user);
      if (excludeVolunteerIds.map(String).includes(volUserId)) continue;

      // check service radius
      const distanceKm = vol.distanceFrom(lat, lng);
      const volunteerRadiusKm = vol.serviceRadius || 5;
      if (distanceKm > volunteerRadiusKm) continue;

      // check high risk acceptance
      const isHighRisk = donation.urgencyLevel === 'Urgent' || donation.foodType === 'Non-Veg' || donation.servings > 50;
      if (isHighRisk && !vol.canAcceptHighRisk()) continue;

      // assign as pending
      donation.assignedVolunteer = vol.user._id;
      donation.notifiedVolunteers = donation.notifiedVolunteers || [];
      donation.notifiedVolunteers.push({ volunteerId: vol.user._id, notifiedAt: new Date() });
      await donation.save();

      vol.pendingAssignments = vol.pendingAssignments || [];
      vol.pendingAssignments.push({ donation: donation._id, notifiedAt: new Date() });
      await vol.save();

      // notify volunteer
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const subject = `Pickup available: ${donation.title}`;
        const html = `A pickup near you is available. Please open the app to accept or decline: <a href="${frontendUrl}/volunteer-dashboard">Open Volunteer Dashboard</a>`;
        if (vol.user && vol.user.email) await sendNotificationEmail(vol.user.email, subject, html);
        if (vol.pushSubscription) {
          const payload = { title: `Pickup available: ${donation.title}`, body: `A pickup near you is available. Open app to accept or decline.`, url: `${frontendUrl}/volunteer-dashboard` };
          await sendPushNotification(vol.pushSubscription, payload);
        }
      } catch (err) {
        console.error('Error notifying volunteer during reassignment', err);
      }

      return { volunteer: vol, donation };
    }

    return null;
  } catch (err) {
    console.error('assignNearestVolunteer error:', err);
    return null;
  }
}

module.exports = { assignNearestVolunteer };
