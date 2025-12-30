let webpush;
try {
  webpush = require('web-push');
} catch (e) {
  webpush = null;
}

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || null;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || null;

if (webpush && VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@localhost',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

const sendPushNotification = async (subscription, payload) => {
  if (!webpush || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log('Push service not configured. Skipping push send.');
    return { success: false, reason: 'not-configured' };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (err) {
    console.error('Push send error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { sendPushNotification };
