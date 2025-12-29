import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './DonationDetails.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DonationDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const donationId = location.state?.donationId;
  // Fallback: allow ?id= query parameter so links from emails work
  const params = new URLSearchParams(location.search);
  const queryId = params.get('id');
  const effectiveDonationId = donationId || queryId;
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [volunteerLocation, setVolunteerLocation] = useState(null);
  const [assignedVolunteer, setAssignedVolunteer] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const donorMarkerRef = useRef(null);
  const volunteerMarkerRef = useRef(null);
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!effectiveDonationId) { alert('Donation ID missing'); navigate('/my-donations'); return; }
    fetchDonation();
  }, [effectiveDonationId, navigate]);

  const fetchDonation = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/donations/${effectiveDonationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success && data.donation) {
        setDonation(data.donation);
      }
    } catch (err) {
      console.error('Failed to fetch donation', err);
    } finally { setLoading(false); }
  };

  // Initialize map after donation loads
  useEffect(() => {
    if (!donation) return;

    const coords = donation.pickupAddress && donation.pickupAddress.coordinates;
    const lat = coords && coords.lat ? coords.lat : 23.8103;
    const lng = coords && coords.lng ? coords.lng : 90.4125;

    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance.current);

      donorMarkerRef.current = L.marker([lat, lng]).addTo(mapInstance.current).bindPopup('Pickup Location').openPopup();
    } else {
      mapInstance.current.setView([lat, lng], 14);
      if (donorMarkerRef.current) donorMarkerRef.current.setLatLng([lat, lng]);
      else donorMarkerRef.current = L.marker([lat, lng]).addTo(mapInstance.current).bindPopup('Pickup Location');
    }

    // Open WebSocket and subscribe to donation tracking with reconnect/backoff
    const connectWS = () => {
      try {
        const ws = new WebSocket(`ws://localhost:5000`);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempts.current = 0;
          setWsConnected(true);
          ws.send(JSON.stringify({ type: 'SUBSCRIBE_DONATION', donationId: effectiveDonationId }));
        };

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === 'ASSIGNED_VOLUNTEER') {
              setAssignedVolunteer(msg.volunteer);
              if (msg.currentLocation) setVolunteerLocation(msg.currentLocation);
            } else if (msg.type === 'VOLUNTEER_LOCATION') {
              if (msg.location) setVolunteerLocation(msg.location);
            }
          } catch (err) { console.error('WS parse error', err); }
        };

        ws.onclose = () => {
          setWsConnected(false);
          // attempt reconnect with exponential backoff
          const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts.current));
          reconnectAttempts.current += 1;
          console.log('Donation WS closed, reconnecting in', delay);
          setTimeout(connectWS, delay);
        };

        ws.onerror = (e) => { console.error('Donation WS error', e); };
      } catch (err) {
        console.error('Failed to open WebSocket', err);
        setWsConnected(false);
        const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts.current));
        reconnectAttempts.current += 1;
        setTimeout(connectWS, delay);
      }
    };

    connectWS();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [donation, effectiveDonationId]);

  // Update volunteer marker when location changes
  useEffect(() => {
    if (!volunteerLocation || !mapInstance.current) return;
    const { lat, lng } = volunteerLocation;
    if (volunteerMarkerRef.current) {
      volunteerMarkerRef.current.setLatLng([lat, lng]);
    } else {
        const icon = L.divIcon({ className: 'volunteer-marker', html: '<div class="vol-pulse"></div>', iconSize: [24, 24], iconAnchor: [12, 12] });
      volunteerMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapInstance.current).bindPopup('Volunteer');
    }
  }, [volunteerLocation]);

  // ETA calculation and map indicator
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const estimatedETA = () => {
    if (!volunteerLocation || !donation || !donation.pickupAddress || !donation.pickupAddress.coordinates) return null;
    const vlat = volunteerLocation.lat;
    const vlng = volunteerLocation.lng;
    const plat = donation.pickupAddress.coordinates.lat;
    const plng = donation.pickupAddress.coordinates.lng;
    const distanceKm = haversineDistance(vlat, vlng, plat, plng);
    // assume average speed 25 km/h for vehicle, fallback 5 km/h for walking
    const avgSpeed = 25;
    const hours = distanceKm / avgSpeed;
    const mins = Math.max(1, Math.round(hours * 60));
    return { distanceKm: distanceKm.toFixed(2), minutes: mins };
  };

  if (loading) return <div className="donation-details-container"><p>Loading...</p></div>;
  if (!donation) return <div className="donation-details-container"><p>Donation not found</p></div>;

  return (
    <div className="donation-details-container">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      <h1>{donation.title}</h1>
      <p>{donation.quantity} • {donation.servings} servings</p>
      <p>Type: {donation.foodType}</p>
      <p>Status: {donation.status}</p>
      <div className="photos-grid">
        {donation.photos?.map((p, idx) => {
          const src = (p && p.url) ? p.url : p;
          return <img key={idx} src={src} alt={`photo-${idx}`} />;
        })}
      </div>
      <div className="pickup-info">
        <h3>Pickup Address</h3>
        <p>{donation.pickupAddress?.fullAddress}</p>
        <p>Window: {new Date(donation.pickupWindow?.from).toLocaleString()} - {new Date(donation.pickupWindow?.to).toLocaleString()}</p>
      </div>
      {/* Fallback suggestions UI */}
      {(donation.fallbackSuggested || donation.conversionOptions) && (
        <div className="fallback-suggestions">
          <h3>Fallback Suggestions</h3>
          <p>If this donation remains unclaimed, you can try one of the options below.</p>
          <div className="fallback-actions">
            <button onClick={async () => {
              try {
                const res = await fetch(`http://localhost:5000/api/donations/${donation._id}/convert-to-sale`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } });
                const data = await res.json();
                if (data.success) setDonation(data.donation);
                else alert(data.message || 'Failed to convert to sale');
              } catch (err) { console.error(err); alert('Network error'); }
            }}>Convert to Sale</button>

            <button onClick={async () => {
              try {
                const res = await fetch(`http://localhost:5000/api/donations/${donation._id}/request-volunteer`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } });
                const data = await res.json();
                if (data.success) setDonation(data.donation);
                else alert(data.message || 'Failed to request volunteer');
              } catch (err) { console.error(err); alert('Network error'); }
            }}>Request Volunteer</button>

            <button onClick={async () => {
              const minutes = prompt('Extend pickup window by how many minutes?', '30');
              if (!minutes) return;
              try {
                const res = await fetch(`http://localhost:5000/api/donations/${donation._id}/extend-pickup`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ extendMinutes: parseInt(minutes,10) }) });
                const data = await res.json();
                if (data.success) setDonation(data.donation);
                else alert(data.message || 'Failed to extend pickup window');
              } catch (err) { console.error(err); alert('Network error'); }
            }}>Extend Pickup Window</button>

            <button onClick={async () => {
              if (!window.confirm('Mark this donation as for composting? This will remove it from available pickups.')) return;
              try {
                const res = await fetch(`http://localhost:5000/api/donations/${donation._id}/mark-compost`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } });
                const data = await res.json();
                if (data.success) setDonation(data.donation);
                else alert(data.message || 'Failed to mark compost');
              } catch (err) { console.error(err); alert('Network error'); }
            }}>Mark for Composting</button>
          </div>
        </div>
      )}
      <div className="donation-map">
        <h3>Live Tracking</h3>
        {assignedVolunteer ? (
          <div className="assigned-volunteer">
            <strong>Assigned Volunteer:</strong> {assignedVolunteer.name} {assignedVolunteer.phone ? `• ${assignedVolunteer.phone}` : ''}
          </div>
        ) : (
          <div>No volunteer assigned yet.</div>
        )}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div ref={mapRef} style={{ height: '320px', width: '100%', marginTop: '8px' }} />
          </div>
          <div style={{ width: '220px', marginTop: '8px' }}>
            <div style={{ marginBottom: '8px' }}><strong>Connection:</strong> {wsConnected ? 'Connected' : 'Disconnected'}</div>
            {volunteerLocation && (
              <div>
                <div><strong>Volunteer Location:</strong> {volunteerLocation.lat.toFixed(5)}, {volunteerLocation.lng.toFixed(5)}</div>
                {(() => { const eta = estimatedETA(); return eta ? <div><strong>ETA:</strong> ~{eta.minutes} min ({eta.distanceKm} km)</div> : null; })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationDetails;
