import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './OrderTrackingDetail.css'; // Use the SAME CSS as orders

const DonationTrackingDetail = () => {
  const { donationId } = useParams();
  const navigate = useNavigate();
  const [donationData, setDonationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [notification, setNotification] = useState('');

  // 4 stages for donation (instead of 5 for orders)
  const stages = ['Moving for Pickup', 'Picked Up', 'Moving to NGO', 'Reached'];
  
  useEffect(() => {
    fetchTrackingData();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchTrackingData, 5000);
    
    return () => clearInterval(interval);
  }, [donationId]);

  useEffect(() => {
    if (!donationData || donationData.status === 'delivered') return;
    
    // If no stageStartTime, volunteer not assigned yet - show waiting state
    if (!donationData.stageStartTime) {
      console.log('⏳ Waiting for volunteer assignment...');
      setTimeRemaining(10); // Show 10 but don't count down
      return;
    }
    
    // Calculate time remaining in current stage
    const stageStart = new Date(donationData.stageStartTime);
    const now = new Date();
    const elapsed = Math.floor((now - stageStart) / 1000);
    const remaining = Math.max(0, 10 - elapsed);
    
    console.log(`⏱️ Stage: ${donationData.currentStage}, Elapsed: ${elapsed}s, Remaining: ${remaining}s`);
    
    setTimeRemaining(remaining);
    
    // If time has already expired, fetch updates immediately
    if (remaining === 0) {
      console.log('⏰ Time expired, fetching updates...');
      const timeout = setTimeout(() => {
        fetchTrackingData();
      }, 1000);
      return () => clearTimeout(timeout);
    }
    
    if (remaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(timer);
            console.log('⏰ Counter reached 0, fetching next stage...');
            // When counter reaches 0, fetch updated data to get next stage
            setTimeout(() => {
              fetchTrackingData();
            }, 1000);
            return 0;
          }
          return newValue;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [donationData?.currentStage, donationData?.stageStartTime]);

  const fetchTrackingData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/donations/${donationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      console.log('📦 Donation tracking data:', data);
      
      if (data.success) {
        setDonationData(data.donation);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setLoading(false);
    }
  };

  const getCurrentStageIndex = () => {
    if (!donationData) return 0;
    return stages.indexOf(donationData.currentStage);
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  if (loading) {
    return (
      <div className="tracking-container">
        <div className="loading-spinner"></div>
        <p style={{textAlign: 'center', marginTop: '20px'}}>Loading donation details...</p>
      </div>
    );
  }

  if (!donationData) {
    return (
      <div className="tracking-container">
        <div className="error-message" style={{textAlign: 'center', padding: '40px'}}>
          <h2>Donation not found</h2>
          <button 
            onClick={() => navigate('/my-donations')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Back to Donations
          </button>
        </div>
      </div>
    );
  }

  const donation = donationData;
  const currentStageIndex = getCurrentStageIndex();

  // Handle cancelled donations
  if (donation.status === 'cancelled') {
    return (
      <div className="tracking-container">
        <div className="order-cancelled-section">
          <div className="cancelled-icon">❌</div>
          <h2>Donation Cancelled</h2>
          <div className="cancellation-reason">
            <h3>Reason:</h3>
            <p>{donation.cancellationReason || 'Donation was cancelled'}</p>
          </div>
          {donation.deliveryAssignmentMessage && (
            <div className="assignment-status-message">
              <p>{donation.deliveryAssignmentMessage}</p>
            </div>
          )}
          <button className="back-to-orders-btn" onClick={() => navigate('/my-donations')}>
            Back to My Donations
          </button>
        </div>
      </div>
    );
  }

  // Handle delivered donations (NO RATING - this is the key difference from orders)
  if (donation.status === 'delivered') {
    return (
      <div className="tracking-container">
        <div className="delivery-complete-section">
          <div className="success-icon">🎉</div>
          <h2>Donation Delivered Successfully!</h2>
          <p className="success-message">Thank you for your generous donation!</p>
          
          <div className="order-summary-box">
            <h3>Donation Summary</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Food:</span>
                <span className="value">{donation.title}</span>
              </div>
              <div className="summary-item">
                <span className="label">Quantity:</span>
                <span className="value">{donation.quantity}</span>
              </div>
              <div className="summary-item">
                <span className="label">Servings:</span>
                <span className="value">{donation.servings}</span>
              </div>
              <div className="summary-item">
                <span className="label">Delivered to:</span>
                <span className="value">{donation.ngoName || 'NGO'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Completed at:</span>
                <span className="value">{new Date(donation.completedAt || donation.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button className="back-to-orders-btn" onClick={() => navigate('/my-donations')}>
            Back to My Donations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-container">
      {notification && (
        <div className="notification-toast">{notification}</div>
      )}

      <div className="tracking-header">
        <h1>Donation Tracking</h1>
        <p className="order-number">Donation #{donation.donationNumber || donation._id.slice(-8).toUpperCase()}</p>
      </div>

      {/* Stage Progress Section */}
      <div className="stage-progress-section">
        <h2 style={{marginBottom: '20px', textAlign: 'center'}}>Delivery Progress</h2>
        
        {/* Timer Display */}
        {donation.stageStartTime ? (
          <div className="timer-display">
            <span className="timer-label">Time until next stage</span>
            <span className="timer-value">{timeRemaining}s</span>
          </div>
        ) : (
          <div className="timer-display" style={{background: 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)'}}>
            <span className="timer-label">🔍 Finding volunteer...</span>
            <span className="timer-value">Please wait</span>
          </div>
        )}

        {/* Stages Bar */}
        <div className="stages-bar">
          {stages.map((stage, index) => (
            <div 
              key={index}
              className={`stage-item ${index < currentStageIndex ? 'completed' : ''} ${index === currentStageIndex ? 'active' : ''}`}
            >
              <div className="stage-icon">
                {index < currentStageIndex ? '✓' : 
                 index === 0 ? '🏍️' :
                 index === 1 ? '📦' :
                 index === 2 ? '🚚' : '🏢'}
              </div>
              <span className="stage-label">{stage}</span>
              {index < stages.length - 1 && (
                <div className={`stage-connector ${index < currentStageIndex ? 'completed' : ''}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Order Details Card */}
      <div className="order-details-card">
        <h3>Donation Details</h3>
        <div className="details-grid">
          <div className="detail-row">
            <span className="detail-label">Food Item:</span>
            <span className="detail-value">{donation.title}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Quantity:</span>
            <span className="detail-value">{donation.quantity}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Servings:</span>
            <span className="detail-value">{donation.servings} people</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Food Type:</span>
            <span className="detail-value">{donation.foodType}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Freshness:</span>
            <span className="detail-value">{donation.freshnessLevel}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Donating to:</span>
            <span className="detail-value">{donation.ngoName || 'NGO'}</span>
          </div>
          {donation.deliveryPerson && (
            <div className="detail-row">
              <span className="detail-label">Volunteer:</span>
              <span className="detail-value">{donation.deliveryPerson.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Person Info */}
      {donation.deliveryPerson && (
        <div className="delivery-person-card">
          <h3>Volunteer Information</h3>
          <div className="delivery-person-info">
            <div className="delivery-person-avatar">
              {donation.deliveryPerson.profilePicture ? (
                <img src={donation.deliveryPerson.profilePicture} alt={donation.deliveryPerson.name} />
              ) : (
                <div className="avatar-placeholder">👤</div>
              )}
            </div>
            <div className="delivery-person-details">
              <h4>{donation.deliveryPerson.name}</h4>
              {donation.deliveryPerson.phone && (
                <p className="phone">📞 {donation.deliveryPerson.phone}</p>
              )}
              {donation.deliveryPerson.rating && (
                <p className="rating">⭐ {donation.deliveryPerson.rating.toFixed(1)} ({donation.deliveryPerson.totalRatings || 0} ratings)</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photos */}
      {donation.photos && donation.photos.length > 0 && (
        <div className="order-items-card">
          <h3>Food Photos</h3>
          <div className="food-photos-grid">
            {donation.photos.map((photo, index) => (
              <div key={index} className="food-photo-item">
                <img src={photo.url} alt={`Food ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationTrackingDetail;
