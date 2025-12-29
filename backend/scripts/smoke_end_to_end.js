// Ensure a working fetch in Node (support Node <18 and node-fetch ESM)
require('dotenv').config();
let fetchFn;
if (typeof fetch === 'function') {
  fetchFn = fetch.bind(global);
} else {
  // lazy-load node-fetch
  fetchFn = (...args) => import('node-fetch').then(mod => mod.default(...args));
}

const API = process.env.BACKEND_URL || 'http://localhost:5000';

async function run() {
  console.log('Starting enhanced smoke end-to-end test');

  try {
    // 1) Register donor
    const donorEmail = `smoke_donor_${Date.now()}@example.com`;
    const donorPassword = 'TestPass123';
    const regDonor = await fetchFn(`${API}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: donorEmail, password: donorPassword, name: 'Smoke Donor', role: 'Customer' }) });
    const donorData = await regDonor.json();
    if (!donorData.success) throw new Error('Donor registration failed: ' + JSON.stringify(donorData));
    const donorToken = donorData.token;
    console.log('Donor registered, token received');

    // 2) Register NGO
    const ngoEmail = `smoke_ngo_${Date.now()}@example.com`;
    const ngoPassword = 'TestPass123';
    const regNgo = await fetchFn(`${API}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ngoEmail, password: ngoPassword, name: 'Smoke NGO', role: 'NGO' }) });
    const ngoData = await regNgo.json();
    if (!ngoData.success) throw new Error('NGO registration failed: ' + JSON.stringify(ngoData));
    const ngoToken = ngoData.token;
    console.log('NGO registered, token received');

    // 3) Create NGO profile (so NGO can claim)
    const ngoProfile = {
      ngoName: 'Smoke NGO Org',
      location: { type: 'Point', coordinates: [90.41, 23.81] },
      address: { fullAddress: 'Smoke NGO address' },
      acceptedItems: { veg: true, nonVeg: true, vegan: true },
      serviceRadius: 50,
      isVerified: true,
      isAcceptingItems: true
    };

    const pRes = await fetchFn(`${API}/api/ngo/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ngoToken}` }, body: JSON.stringify(ngoProfile) });
    const pData = await pRes.json();
    if (!pData.success) throw new Error('NGO profile creation failed: ' + JSON.stringify(pData));
    console.log('NGO profile created');

    // 4) Donor creates a donation
    const donationPayload = {
      title: 'Smoke Test Meal',
      quantity: '2 kg',
      servings: 4,
      foodType: 'Veg',
      freshnessLevel: 'Today',
      expiryDateTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
      description: 'Automated smoke test donation',
      pickupAddress: { fullAddress: 'Test address', coordinates: { lat: 23.81, lng: 90.41 } },
      pickupWindow: { from: new Date(Date.now() + 30 * 60 * 1000).toISOString(), to: new Date(Date.now() + 120 * 60 * 1000).toISOString() },
      safetyChecklist: { properlyPacked: true, noContamination: true, safeTempStorage: true, correctExpiry: true, pickupReady: true },
      packagingProvided: true,
      packagingInfo: 'Sealed container',
      warningAccepted: true,
      photos: JSON.stringify(['https://via.placeholder.com/300','https://via.placeholder.com/301'])
    };

    const createRes = await fetchFn(`${API}/api/donations/create`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${donorToken}` },
      body: createFormData(donationPayload)
    });
    const createData = await createRes.json();
    console.log('Create donation response:', createData);
    if (!createData.success) throw new Error('Donation creation failed: ' + JSON.stringify(createData));
    const donationId = createData.donation._id;

    // 5) NGO fetches available donations nearby
    const avaRes = await fetchFn(`${API}/api/donations/available?lat=23.81&lng=90.41&distance=50`, { headers: { 'Authorization': `Bearer ${ngoToken}` } });
    const avaData = await avaRes.json();
    console.log('Available donations for NGO:', avaData.count);
    if (!avaData.success || avaData.count === 0) throw new Error('NGO did not find the donated item');

    // 6) NGO claims the donation
    const claimRes = await fetchFn(`${API}/api/donations/${donationId}/claim`, { method: 'POST', headers: { 'Authorization': `Bearer ${ngoToken}` } });
    const claimData = await claimRes.json();
    console.log('Claim response:', claimData);
    if (!claimData.success) throw new Error('NGO claim failed: ' + JSON.stringify(claimData));

    // 7) NGO uploads pickup proof
    const proofRes = await fetchFn(`${API}/api/donations/${donationId}/pickup-proof`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ngoToken}` }, body: JSON.stringify({ proofPhotos: ['https://via.placeholder.com/400'] }) });
    const proofData = await proofRes.json();
    console.log('Pickup proof response:', proofData);
    if (!proofData.success) throw new Error('Pickup proof failed: ' + JSON.stringify(proofData));

    // 8) NGO completes the donation
    const compRes = await fetchFn(`${API}/api/donations/${donationId}/complete`, { method: 'POST', headers: { 'Authorization': `Bearer ${ngoToken}` } });
    const compData = await compRes.json();
    console.log('Complete response:', compData);
    if (!compData.success) throw new Error('Completion failed: ' + JSON.stringify(compData));

    console.log('Smoke end-to-end flow completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Enhanced smoke test error:', err);
    process.exit(1);
  }
}

function createFormData(obj) {
  const form = new URLSearchParams();
  Object.keys(obj).forEach(k => {
    if (typeof obj[k] === 'object') form.append(k, JSON.stringify(obj[k]));
    else form.append(k, String(obj[k]));
  });
  return form;
}

run();
