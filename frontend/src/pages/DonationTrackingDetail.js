import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './OrderTrackingDetail.css'; // Reusing order tracking detail styles

const DonationTrackingDetail = () => {
  const { donationId } = useParams();
  const navigate = useNavigate();
  const [donationData, setDonationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [notification, setNotification] = useState('');

  const stages = ['Available', 'Assigned', 'In Transit', 'Picked Up', 'Delivered'];
  
  useEffect(() => {
    fetchTrackingData();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchTrackingData, 5000);
    
    return () => clearInterval(interval);
  }, [donationId]);

  useEffect(() => {
    if (!donationData) return;
    
    // Calculate time until expiry
    const expiryTime = new Date(donationData.expiryDateTime);
    const now = new Date();
    const msRemaining = expiryTime - now;
    
    if (msRemaining > 0) {
      setTimeRemaining(Math.floor(msRemaining / 1000));
      
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [donationData]);

  const fetchTrackingData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/donations/${donationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setDonationData(data.donation);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setLoading(false);
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return 'Expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m ${secs}s remaining`;
  };

  const getCurrentStageIndex = () => {
    if (!donationData) return 0;
    return stages.indexOf(donationData.status);
  };

  if (loading) {
    return (
      <div className="tracking-detail-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!donationData) {
    return (
      <div className="tracking-detail-container">
        <div className="error-message">Donation not found</div>
      </div>
    );
  }

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="tracking-detail-container">
      {notification && (
        <div className="notification-banner success">
          {notification}
        </div>
      )}

      <div className="tracking-header">
        <button className="back-btn" onClick={() => navigate('/my-donations')}>
          ← Back to My Donations
        </button>
        <h1>Donation Tracking</h1>
      </div>

      <div className="tracking-main">
        <div className="tracking-stages">
          {stages.map((stage, index) => (
            <div
              key={stage}
              className={`stage ${index <= currentStageIndex ? 'completed' : ''} ${
                index === currentStageIndex ? 'active' : ''
              }`}
            >
              <div className="stage-marker">
                {index < currentStageIndex ? (
                  <span className="checkmark">✓</span>
                ) : (
                  <span className="stage-number">{index + 1}</span>
                )}
              </div>
              <div className="stage-content">
                <h3 className="stage-title">{stage}</h3>
                {index === currentStageIndex && (
                  <p className="stage-description">Current Status</p>
                )}
              </div>
              {index < stages.length - 1 && <div className="stage-connector"></div>}
            </div>
          ))}
        </div>

        <div className="donation-summary-card">
          <h2>Donation Details</h2>
          
          <div className="summary-section">
            <div className="section-header">
              <h3>Food Information</h3>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Title:</span>
                <span className="value">{donationData.title}</span>
              </div>
              <div className="info-item">
                <span className="label">Quantity:</span>
                <span className="value">{donationData.quantity}</span>
              </div>
              <div className="info-item">
                <span className="label">Servings:</span>
                <span className="value">{donationData.servings} people</span>
              </div>
              <div className="info-item">
                <span className="label">Food Type:</span>
                <span className="value">{donationData.foodType}</span>
              </div>
              <div className="info-item">
                <span className="label">Freshness:</span>
                <span className="value">{donationData.freshnessLevel}</span>
              </div>
              <div className="info-item full-width">
                <span className="label">Description:</span>
                <span className="value">{donationData.description || 'No description provided'}</span>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <div className="section-header">
              <h3>Expiry Information</h3>
              {timeRemaining !== null && (
                <span className={`time-remaining ${timeRemaining < 7200 ? 'urgent' : ''}`}>
                  ⏰ {formatTimeRemaining(timeRemaining)}
                </span>
              )}
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Expires At:</span>
                <span className="value">{new Date(donationData.expiryDateTime).toLocaleString()}</span>
              </div>
              {donationData.productionTime && (
                <div className="info-item">
                  <span className="label">Produced At:</span>
                  <span className="value">{new Date(donationData.productionTime).toLocaleString()}</span>
                </div>
              )}
              {donationData.storageCondition && (
                <div className="info-item">
                  <span className="label">Storage:</span>
                  <span className="value">{donationData.storageCondition}</span>
                </div>
              )}
            </div>
          </div>

          {donationData.photos && donationData.photos.length > 0 && (
            <div className="summary-section">
              <div className="section-header">
                <h3>Photos</h3>
              </div>
              <div className="photos-grid">
                {donationData.photos.map((photo, index) => (
                  <img 
                    key={index} 
                    src={photo.url} 
                    alt={`Food ${index + 1}`}
                    className="food-photo"
                  />
                ))}
              </div>
            </div>
          )}

          {donationData.pickupAddress && (
            <div className="summary-section">
              <div className="section-header">
                <h3>Pickup Location</h3>
              </div>
              <div className="info-grid">
                <div className="info-item full-width">
                  <span className="label">Address:</span>
                  <span className="value">
                    {donationData.pickupAddress.fullAddress || 
                     donationData.pickupAddress.area || 
                     'Address provided'}
                  </span>
                </div>
                {donationData.pickupWindow && (
                  <>
                    <div className="info-item">
                      <span className="label">Pickup Window From:</span>
                      <span className="value">{new Date(donationData.pickupWindow.from).toLocaleString()}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Pickup Window To:</span>
                      <span className="value">{new Date(donationData.pickupWindow.to).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {donationData.assignedVolunteer && (
            <div className="summary-section">
              <div className="section-header">
                <h3>Assigned Volunteer</h3>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Name:</span>
                  <span className="value">{donationData.assignedVolunteer.name || 'Volunteer'}</span>
                </div>
                {donationData.assignedVolunteer.phone && (
                  <div className="info-item">
                    <span className="label">Phone:</span>
                    <span className="value">{donationData.assignedVolunteer.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {donationData.status === 'Available' && !donationData.assignedVolunteer && (
            <div className="info-banner warning">
              ⏳ Waiting for volunteer assignment. Nearby volunteers have been notified.
            </div>
          )}

          {donationData.status === 'Picked Up' && (
            <div className="info-banner success">
              ✅ Food has been picked up and is on its way to those in need!
            </div>
          )}

          {donationData.status === 'Delivered' && (
            <div className="info-banner success">
              🎉 Thank you! Your donation has been successfully delivered and will help feed those in need.
            </div>
          )}
        </div>

        <div className="action-buttons-container">
          <button 
            className="btn-primary"
            onClick={() => navigate('/donation-tracking', { state: { donationId } })}
          >
            View Live Map
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate('/my-donations')}
          >
            Back to My Donations
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationTrackingDetail;
