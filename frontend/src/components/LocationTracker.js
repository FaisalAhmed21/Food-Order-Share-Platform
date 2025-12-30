import React, { useEffect, useState } from 'react';
import locationService from '../services/locationService';
import './LocationTracker.css';

const LocationTracker = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Check if user is volunteer
    const userDataStr = localStorage.getItem('userData');
    const user = userDataStr ? JSON.parse(userDataStr) : null;
    
    if (user && user.role === 'Volunteer') {
      // Start location tracking
      locationService.startTracking((newLocation, oldLocation) => {
        // Show popup only when location actually changes
        setLocationInfo({
          new: newLocation,
          old: oldLocation
        });
        setShowPopup(true);
        
        // Auto-hide popup after 5 seconds
        setTimeout(() => {
          setShowPopup(false);
        }, 5000);
      });
      
      setIsTracking(true);
    }

    // Cleanup on unmount
    return () => {
      locationService.stopTracking();
    };
  }, []);

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  if (!isTracking || !showPopup || !locationInfo) {
    return null;
  }

  return (
    <div className="location-popup">
      <div className="location-popup-content">
        <button className="close-btn" onClick={handleClosePopup}>×</button>
        <div className="location-icon">📍</div>
        <h3>Location Updated</h3>
        <p className="location-text">
          Your location has been updated to help us assign nearby deliveries.
        </p>
        <div className="location-details">
          <p><strong>Current Location:</strong></p>
          <p className="location-address">{locationInfo.new.city}, {locationInfo.new.region}, {locationInfo.new.country}</p>
        </div>
        <button className="ok-btn" onClick={handleClosePopup}>
          Got it
        </button>
      </div>
    </div>
  );
};

export default LocationTracker;

