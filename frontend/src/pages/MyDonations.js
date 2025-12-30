import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyDonations.css';

const MyDonations = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed, cancelled

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDonations();
  }, [navigate]);

  const fetchDonations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/donations/my-donations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        // Sort by most recent first
        const sortedDonations = data.donations.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setDonations(sortedDonations);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffa500',
      confirmed: '#2196f3',
      picking_up: '#ff9800',
      picked_up: '#9c27b0',
      delivering: '#00bcd4',
      delivered: '#4caf50',
      cancelled: '#f44336'
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✓',
      picking_up: '🏍️',
      picked_up: '📦',
      delivering: '🚚',
      delivered: '✅',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  const getDeliveryStatusBadge = (donation) => {
    if (donation.status === 'cancelled') {
      return <span className="delivery-badge cancelled">Cancelled</span>;
    }
    
    if (donation.deliveryAssignmentStatus === 'assigned') {
      return <span className="delivery-badge assigned">✓ Volunteer Assigned</span>;
    } else if (donation.deliveryAssignmentStatus === 'searching') {
      return <span className="delivery-badge searching">🔍 Searching for Volunteer...</span>;
    } else if (donation.deliveryAssignmentStatus === 'failed') {
      return <span className="delivery-badge no-delivery">❌ No Volunteer Available</span>;
    }
    return null;
  };

  const filteredDonations = donations.filter(donation => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'confirmed', 'picking_up', 'picked_up', 'delivering'].includes(donation.status);
    if (filter === 'completed') return donation.status === 'delivered';
    if (filter === 'cancelled') return donation.status === 'cancelled';
    return true;
  });

  if (loading) {
    return (
      <div className="my-donations-container">
        <div className="loading-spinner"></div>
        <p>Loading your donations...</p>
      </div>
    );
  }

  return (
    <div className="my-donations-container">
      <div className="donations-header">
        <button className="back-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <h1>My Donations</h1>
      </div>

      <div className="donations-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Donations ({donations.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({donations.filter(d => ['pending', 'confirmed', 'picking_up', 'picked_up', 'delivering'].includes(d.status)).length})
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({donations.filter(d => d.status === 'delivered').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled ({donations.filter(d => d.status === 'cancelled').length})
        </button>
      </div>

      {filteredDonations.length === 0 ? (
        <div className="no-donations">
          <div className="no-donations-icon">🍽️</div>
          <h2>No Donations Found</h2>
          <p>You haven't made any donations yet</p>
          <button className="browse-btn" onClick={() => navigate('/donate-food')}>
            Donate Food Now
          </button>
        </div>
      ) : (
        <div className="donations-list">
          {filteredDonations.map(donation => (
            <div key={donation._id} className="donation-card">
              <div className="donation-header-row">
                <div className="donation-id">
                  <span className="label">Donation #</span>
                  <span className="value">{donation.donationNumber || donation._id.slice(-8).toUpperCase()}</span>
                </div>
                <div 
                  className="status-badge"
                  style={{ 
                    background: getStatusColor(donation.status),
                    color: 'white'
                  }}
                >
                  {getStatusIcon(donation.status)} {donation.status.replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>

              <div className="donation-content">
                <div className="donation-left">
                  {donation.photos && donation.photos[0] && (
                    <img 
                      src={donation.photos[0].url} 
                      alt={donation.title}
                      className="donation-image"
                    />
                  )}
                </div>

                <div className="donation-middle">
                  <h3 className="donation-title">{donation.title}</h3>
                  <div className="donation-details">
                    <div className="detail-item">
                      <span className="icon">📦</span>
                      <span>{donation.quantity}</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">👥</span>
                      <span>{donation.servings} servings</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">🍴</span>
                      <span>{donation.foodType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="icon">⏰</span>
                      <span>{donation.freshnessLevel}</span>
                    </div>
                  </div>

                  {donation.ngoName && (
                    <div className="ngo-info">
                      <span className="icon">🏢</span>
                      <span>Donating to: <strong>{donation.ngoName}</strong></span>
                    </div>
                  )}

                  {getDeliveryStatusBadge(donation)}

                  {donation.deliveryPerson && (
                    <div className="delivery-person-info">
                      <span className="icon">🏍️</span>
                      <span>Volunteer: <strong>{donation.deliveryPerson.name}</strong></span>
                      {donation.deliveryPerson.phone && (
                        <span className="phone"> • {donation.deliveryPerson.phone}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="donation-right">
                  <div className="donation-meta">
                    <div className="meta-item">
                      <span className="label">Created</span>
                      <span className="value">{new Date(donation.createdAt).toLocaleDateString()}</span>
                      <span className="time">{new Date(donation.createdAt).toLocaleTimeString()}</span>
                    </div>
                    {donation.expiryDateTime && (
                      <div className="meta-item">
                        <span className="label">Expires</span>
                        <span className="value">{new Date(donation.expiryDateTime).toLocaleDateString()}</span>
                        <span className="time">{new Date(donation.expiryDateTime).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>

                  <button 
                    className="view-details-btn"
                    onClick={() => navigate(`/donation-tracking/${donation._id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDonations;
