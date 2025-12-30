import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Chatbot from '../components/Chatbot';
import './NGODonations.css';

const NGODonations = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalDonations, setTotalDonations] = useState(0);
  const [filter, setFilter] = useState('all'); // all, pending, transferred

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ngo/my-donations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setDonations(data.donations);
        setTotalDonations(data.totalDonations);
      } else {
        console.error('Failed to fetch donations:', data.message);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDonations = donations.filter(donation => {
    if (filter === 'all') return true;
    if (filter === 'received') return !donation.donation?.transferredToNGO;
    if (filter === 'pending') return donation.donation?.transferredToNGO;
    return true;
  });

  const getStatusBadge = (transferred) => {
    if (transferred) {
      return <span className="status-badge pending">⏳ Pending</span>;
    }
    return <span className="status-badge received">✓ Received</span>;
  };

  if (loading) {
    return (
      <div className="ngo-donations-container">
        <div className="loading-spinner">Loading donations...</div>
      </div>
    );
  }

  return (
    <div className="ngo-donations-container">
      <div className="donations-header">
        <button className="back-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <h1>💝 Received Donations</h1>
        <p>Track all food order donations made to your NGO</p>
      </div>

      <div className="donations-summary">
        <div className="summary-card total">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>Total Donations</h3>
            <p className="summary-amount">৳{totalDonations.toFixed(2)}</p>
          </div>
        </div>
        <div className="summary-card count">
          <div className="summary-icon">📦</div>
          <div className="summary-content">
            <h3>Total Orders</h3>
            <p className="summary-amount">{donations.length}</p>
          </div>
        </div>
        <div className="summary-card pending">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>Available to Collect</h3>
            <p className="summary-amount">
              ৳{donations
                .filter(d => !d.donation?.transferredToNGO)
                .reduce((sum, d) => sum + (d.donation?.amount || 0), 0)
                .toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="filter-buttons">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({donations.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'received' ? 'active' : ''}`}
          onClick={() => setFilter('received')}
        >
          Received ({donations.filter(d => !d.donation?.transferredToNGO).length})
        </button>
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({donations.filter(d => d.donation?.transferredToNGO).length})
        </button>
      </div>

      {filteredDonations.length === 0 ? (
        <div className="no-donations">
          <div className="no-donations-icon">📭</div>
          <h3>No Donations Found</h3>
          <p>You haven't received any donations yet matching the selected filter.</p>
        </div>
      ) : (
        <div className="donations-list">
          {filteredDonations.map((donation) => (
            <div key={donation._id} className="donation-card">
              <div className="donation-header">
                <div className="donation-info">
                  <h3>Order #{donation.orderNumber}</h3>
                  <p className="donation-date">
                    {new Date(donation.donation?.donatedAt || donation.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="donation-amount-badge">
                  <span className="amount-label">Donation</span>
                  <span className="amount-value">৳{donation.donation?.amount?.toFixed(2)}</span>
                </div>
              </div>

              <div className="donation-details">
                <div className="detail-row">
                  <span className="detail-label">👤 Donor:</span>
                  <span className="detail-value">
                    {donation.customer?.name || 'Anonymous'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🍽️ Restaurant:</span>
                  <span className="detail-value">
                    {donation.restaurant?.name || 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">📦 Order Status:</span>
                  <span className={`order-status ${donation.status}`}>
                    {donation.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">💳 Payment:</span>
                  <span className={`payment-status ${donation.payment?.status}`}>
                    {donation.payment?.status?.toUpperCase()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🏦 Transfer Status:</span>
                  {getStatusBadge(donation.donation?.transferredToNGO)}
                </div>
              </div>

              <div className="donation-items">
                <strong>Order Items:</strong>
                <ul>
                  {donation.items?.map((item, idx) => (
                    <li key={idx}>
                      {item.name} x{item.quantity} - ৳{(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="donation-footer">
                <div className="total-info">
                  <span>Order Total: ৳{donation.pricing?.total?.toFixed(2)}</span>
                  <span className="donation-highlight">
                    Your Donation: ৳{donation.donation?.amount?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Chatbot */}
      <Chatbot />
    </div>
  );
};

export default NGODonations;

