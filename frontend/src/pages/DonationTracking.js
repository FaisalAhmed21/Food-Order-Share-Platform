import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './OrderTracking.css'; // Reusing order tracking styles

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DonationTracking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { donationId } = location.state || {};
  
  const [donation, setDonation] = useState(null);
  const [volunteerLocation, setVolunteerLocation] = useState(null);
  const [eta, setEta] = useState(30);
  const [donationStatus, setDonationStatus] = useState('Available');
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const volunteerMarker = useRef(null);

  const statusSteps = [
    { key: 'Available', label: 'Available', icon: '📦' },
    { key: 'Assigned', label: 'Volunteer Assigned', icon: '🚶' },
    { key: 'In Transit', label: 'En Route', icon: '🚗' },
    { key: 'Picked Up', label: 'Picked Up', icon: '✅' },
    { key: 'Delivered', label: 'Delivered', icon: '🎉' }
  ];

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!donationId) {
      navigate('/my-donations');
      return;
    }

    fetchDonationDetails();
    initializeMap();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchDonationDetails, 5000);

    return () => {
      clearInterval(interval);
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, [donationId]);

  const fetchDonationDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/donations/${donationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('Donation data received:', data.donation);
        setDonation(data.donation);
        setDonationStatus(data.donation.status);
        
        // Update volunteer location if available
        if (data.donation.assignedVolunteer && data.donation.volunteerLocation) {
          setVolunteerLocation(data.donation.volunteerLocation);
          updateVolunteerMarker(data.donation.volunteerLocation);
        }
      }
    } catch (error) {
      console.error('Error fetching donation:', error);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map centered on a default location
    mapInstance.current = L.map(mapRef.current).setView([23.8103, 90.4125], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current);
  };

  useEffect(() => {
    if (donation && mapInstance.current) {
      updateMapMarkers();
    }
  }, [donation]);

  const updateMapMarkers = () => {
    if (!donation || !mapInstance.current) return;

    // Add pickup location marker
    if (donation.pickupAddress && donation.pickupAddress.coordinates) {
      const coords = donation.pickupAddress.coordinates;
      let lat, lng;
      
      // Handle both GeoJSON and regular coordinate formats
      if (coords.type === 'Point' && Array.isArray(coords.coordinates)) {
        lng = coords.coordinates[0];
        lat = coords.coordinates[1];
      } else if (coords.lat && coords.lng) {
        lat = coords.lat;
        lng = coords.lng;
      }

      if (lat && lng) {
        const pickupIcon = L.divIcon({
          className: 'custom-marker pickup-marker',
          html: '<div class="marker-icon">📍</div>',
          iconSize: [40, 40]
        });

        L.marker([lat, lng], { icon: pickupIcon })
          .addTo(mapInstance.current)
          .bindPopup('Pickup Location');

        // Center map on pickup location
        mapInstance.current.setView([lat, lng], 14);
      }
    }

    // Add volunteer marker if assigned and location available
    if (volunteerLocation) {
      updateVolunteerMarker(volunteerLocation);
    }
  };

  const updateVolunteerMarker = (location) => {
    if (!mapInstance.current || !location) return;

    const { lat, lng } = location;

    // Remove old marker if exists
    if (volunteerMarker.current) {
      mapInstance.current.removeLayer(volunteerMarker.current);
    }

    // Create volunteer marker
    const volunteerIcon = L.divIcon({
      className: 'custom-marker volunteer-marker',
      html: '<div class="marker-icon">🚶</div>',
      iconSize: [40, 40]
    });

    volunteerMarker.current = L.marker([lat, lng], { icon: volunteerIcon })
      .addTo(mapInstance.current)
      .bindPopup('Volunteer');

    // Draw route line if pickup location exists
    if (donation && donation.pickupAddress && donation.pickupAddress.coordinates) {
      const coords = donation.pickupAddress.coordinates;
      let pickupLat, pickupLng;
      
      if (coords.type === 'Point' && Array.isArray(coords.coordinates)) {
        pickupLng = coords.coordinates[0];
        pickupLat = coords.coordinates[1];
      } else if (coords.lat && coords.lng) {
        pickupLat = coords.lat;
        pickupLng = coords.lng;
      }

      if (pickupLat && pickupLng) {
        L.polyline([[lat, lng], [pickupLat, pickupLng]], {
          color: '#28a745',
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 10'
        }).addTo(mapInstance.current);
      }
    }
  };

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.key === donationStatus);
  };

  if (!donation) {
    return (
      <div className="order-tracking">
        <div className="tracking-header">
          <button className="back-btn" onClick={() => navigate('/my-donations')}>← Back</button>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="order-tracking">
      <div className="tracking-header">
        <button className="back-btn" onClick={() => navigate('/my-donations')}>← Back</button>
        <h2>Track Donation</h2>
      </div>

      <div className="tracking-content">
        {/* Map Section */}
        <div className="map-section">
          <div ref={mapRef} className="tracking-map" style={{ height: '400px', width: '100%' }}></div>
        </div>

        {/* Donation Info Card */}
        <div className="order-info-card">
          <div className="order-header">
            <h3>{donation.title}</h3>
            <span className={`status-badge ${donationStatus.toLowerCase().replace(' ', '-')}`}>
              {donationStatus}
            </span>
          </div>
          
          <div className="order-details">
            <div className="detail-row">
              <span className="label">Quantity:</span>
              <span className="value">{donation.quantity}</span>
            </div>
            <div className="detail-row">
              <span className="label">Servings:</span>
              <span className="value">{donation.servings} people</span>
            </div>
            <div className="detail-row">
              <span className="label">Food Type:</span>
              <span className="value">{donation.foodType}</span>
            </div>
            <div className="detail-row">
              <span className="label">Expires:</span>
              <span className="value">{new Date(donation.expiryDateTime).toLocaleString()}</span>
            </div>
            {donation.assignedVolunteer && (
              <div className="detail-row">
                <span className="label">Volunteer:</span>
                <span className="value">{donation.assignedVolunteer.name || 'Assigned'}</span>
              </div>
            )}
          </div>

          {donation.pickupAddress && (
            <div className="address-section">
              <h4>Pickup Address</h4>
              <p>{donation.pickupAddress.fullAddress || donation.pickupAddress.area || 'Address provided'}</p>
            </div>
          )}
        </div>

        {/* Status Progress */}
        <div className="status-progress">
          <h3>Donation Status</h3>
          <div className="progress-steps">
            {statusSteps.map((step, index) => (
              <div 
                key={step.key}
                className={`progress-step ${index <= currentStepIndex ? 'completed' : ''} ${index === currentStepIndex ? 'active' : ''}`}
              >
                <div className="step-icon">{step.icon}</div>
                <div className="step-label">{step.label}</div>
                {index < statusSteps.length - 1 && (
                  <div className={`step-line ${index < currentStepIndex ? 'completed' : ''}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="btn-primary"
            onClick={() => navigate(`/donation-tracking/${donationId}`)}
          >
            View Full Details
          </button>
          {donation.assignedVolunteer && donation.assignedVolunteer.phone && (
            <button className="btn-secondary">
              📞 Call Volunteer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationTracking;
