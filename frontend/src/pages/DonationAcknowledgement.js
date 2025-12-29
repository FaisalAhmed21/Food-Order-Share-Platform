import React, { useState, useEffect } from 'react';
import './DonationAcknowledgement.css';
import { useNavigate } from 'react-router-dom';

const DonationAcknowledgement = () => {
  const [availableDonations, setAvailableDonations] = useState([]);
  const [claimedDonations, setClaimedDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [showAckForm, setShowAckForm] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [ackForm, setAckForm] = useState({
    mealsServed: '',
    beneficiaries: '',
    photo: '',
    note: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch available donations
      const availableResponse = await fetch('http://localhost:5000/api/donations/available', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (availableResponse.ok) {
        const availableData = await availableResponse.json();
        setAvailableDonations(availableData.donations);
      }

      // Fetch claimed donations
      const claimedResponse = await fetch('http://localhost:5000/api/donations/my-claimed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (claimedResponse.ok) {
        const claimedData = await claimedResponse.json();
        setClaimedDonations(claimedData.donations);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch donations');
      setLoading(false);
    }
  };

  const claimDonation = async (donationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/donations/${donationId}/claim`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchDonations();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to claim donation');
      }
    } catch (err) {
      setError('Failed to claim donation');
    }
  };

  const updateDonationStatus = async (donationId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/donations/${donationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchDonations();
      }
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const openAckForm = (donation) => {
    setSelectedDonation(donation);
    setAckForm({
      mealsServed: donation.quantity,
      beneficiaries: '',
      photo: '',
      note: ''
    });
    setShowAckForm(true);
  };

  const handleAckSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/donations/${selectedDonation._id}/acknowledge`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(ackForm)
      });

      if (response.ok) {
        setShowAckForm(false);
        setSelectedDonation(null);
        setAckForm({ mealsServed: '', beneficiaries: '', photo: '', note: '' });
        fetchDonations();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to add acknowledgement');
      }
    } catch (err) {
      setError('Failed to add acknowledgement');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    const classes = {
      'available': 'status-available',
      'claimed': 'status-claimed',
      'picked-up': 'status-picked',
      'completed': 'status-completed',
      'expired': 'status-expired'
    };
    return classes[status] || '';
  };

  const getTimeUntilExpiry = (expiryTime) => {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} left`;
    }
    
    return `${hours}h ${minutes}m left`;
  };

  if (loading) {
    return (
      <div className="donation-acknowledgement">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="donation-acknowledgement">
      <div className="ack-header">
        <h1>Donation Management</h1>
        <div className="header-stats">
          <div className="stat-pill available-pill">
            {availableDonations.length} Available
          </div>
          <div className="stat-pill claimed-pill">
            {claimedDonations.length} Claimed
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="tabs-nav">
        <button 
          className={activeTab === 'available' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('available')}
        >
          Available Donations ({availableDonations.length})
        </button>
        <button 
          className={activeTab === 'claimed' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('claimed')}
        >
          My Claimed ({claimedDonations.length})
        </button>
      </div>

      {showAckForm && selectedDonation && (
        <div className="ack-modal">
          <div className="ack-form-container">
            <h2>Add Acknowledgement</h2>
            <div className="donation-summary">
              <h3>{selectedDonation.foodType}</h3>
              <p>From: {selectedDonation.restaurantName}</p>
            </div>
            <form onSubmit={handleAckSubmit}>
              <div className="form-row-ack">
                <div className="form-group-ack">
                  <label>Meals Served *</label>
                  <input
                    type="number"
                    value={ackForm.mealsServed}
                    onChange={(e) => setAckForm({...ackForm, mealsServed: e.target.value})}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group-ack">
                  <label>Beneficiaries *</label>
                  <input
                    type="number"
                    value={ackForm.beneficiaries}
                    onChange={(e) => setAckForm({...ackForm, beneficiaries: e.target.value})}
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="form-group-ack">
                <label>Photo URL (Optional)</label>
                <input
                  type="text"
                  value={ackForm.photo}
                  onChange={(e) => setAckForm({...ackForm, photo: e.target.value})}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <div className="form-group-ack">
                <label>Thank You Note</label>
                <textarea
                  value={ackForm.note}
                  onChange={(e) => setAckForm({...ackForm, note: e.target.value})}
                  rows="4"
                  placeholder="Write a thank you message to the donor..."
                />
              </div>
              <div className="form-actions-ack">
                <button type="submit" className="btn-submit-ack">Submit Acknowledgement</button>
                <button type="button" className="btn-cancel-ack" onClick={() => setShowAckForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'available' && (
        <div className="donations-section">
          {availableDonations.length === 0 ? (
            <p className="no-data">No available donations at the moment. Check back later!</p>
          ) : (
            <div className="donations-grid">
              {availableDonations.map((donation) => (
                <div key={donation._id} className="donation-card">
                  <div className="card-badge">
                    <span className={`time-badge ${getTimeUntilExpiry(donation.expiryTime) === 'Expired' ? 'expired' : ''}`}>
                      ⏰ {getTimeUntilExpiry(donation.expiryTime)}
                    </span>
                  </div>
                  <h3>{donation.foodType}</h3>
                  <div className="donation-info">
                    <p><strong>Quantity:</strong> {donation.quantity} {donation.unit}</p>
                    <p><strong>Restaurant:</strong> {donation.restaurantName}</p>
                    {donation.description && (
                      <p><strong>Details:</strong> {donation.description}</p>
                    )}
                    <p><strong>Pickup Address:</strong> {donation.pickupAddress}</p>
                    <p><strong>Expires:</strong> {formatDate(donation.expiryTime)}</p>
                    <p><strong>Posted:</strong> {formatDate(donation.createdAt)}</p>
                  </div>
                  <div className="card-footer">
                    <button 
                      className="btn-claim"
                      onClick={() => claimDonation(donation._id)}
                    >
                      Claim Donation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'claimed' && (
        <div className="donations-section">
          {claimedDonations.length === 0 ? (
            <p className="no-data">You haven't claimed any donations yet.</p>
          ) : (
            <div className="claimed-list">
              {claimedDonations.map((donation) => (
                <div key={donation._id} className="claimed-card">
                  <div className="claimed-header">
                    <div>
                      <h3>{donation.foodType}</h3>
                      <p className="restaurant-name">🏪 {donation.restaurantName}</p>
                    </div>
                    <span className={`status-badge ${getStatusClass(donation.status)}`}>
                      {donation.status}
                    </span>
                  </div>
                  <div className="claimed-body">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Quantity:</span>
                        <span className="info-value">{donation.quantity} {donation.unit}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Claimed:</span>
                        <span className="info-value">{formatDate(donation.claimedAt)}</span>
                      </div>
                      {donation.completedAt && (
                        <>
                          <div className="info-item">
                            <span className="info-label">Meals Served:</span>
                            <span className="info-value">{donation.mealsServed}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Beneficiaries:</span>
                            <span className="info-value">{donation.beneficiaries}</span>
                          </div>
                        </>
                      )}
                    </div>
                    <p className="pickup-address">📍 {donation.pickupAddress}</p>
                    
                    {donation.acknowledgement && donation.acknowledgement.note && (
                      <div className="acknowledgement-box">
                        <h4>Our Acknowledgement</h4>
                        {donation.acknowledgement.photo && (
                          <img 
                            src={donation.acknowledgement.photo} 
                            alt="Acknowledgement" 
                            className="ack-photo"
                          />
                        )}
                        <p className="ack-note">"{donation.acknowledgement.note}"</p>
                        <p className="ack-date">Sent on {formatDate(donation.acknowledgement.addedAt)}</p>
                      </div>
                    )}
                  </div>
                  {donation.status !== 'completed' && donation.status !== 'expired' && (
                    <div className="claimed-actions">
                      {donation.status === 'claimed' && (
                        <button 
                          className="btn-action pickup"
                          onClick={() => updateDonationStatus(donation._id, 'picked-up')}
                        >
                          Mark as Picked Up
                        </button>
                      )}
                      {donation.status === 'picked-up' && (
                        <button 
                          className="btn-action complete"
                          onClick={() => openAckForm(donation)}
                        >
                          Add Acknowledgement
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DonationAcknowledgement;
