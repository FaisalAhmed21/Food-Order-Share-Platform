import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CampaignBadges from '../components/CampaignBadges';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  useEffect(() => {
    // Fetch user data from server to get latest verification status
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('http://localhost:5000/api/profile/get', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (data.success) {
          const userData = data.user;
          
          // Redirect Restaurant users to their dashboard
          if (userData.role?.toLowerCase() === 'restaurant') {
            navigate('/restaurant-dashboard');
            return;
          }
          
          // Convert relative URLs to absolute URLs for profile picture
          if (userData.profilePicture && userData.profilePicture.startsWith('/uploads/')) {
            userData.profilePicture = `http://localhost:5000${userData.profilePicture}`;
          }
          
          setUser(userData);
          
          // Update localStorage with fresh data
          localStorage.setItem('userData', JSON.stringify(userData));
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  // Fetch user's donations
  useEffect(() => {
    const fetchDonations = async () => {
      if (!user || (user.role !== 'Customer' && user.role !== 'Restaurant')) {
        return;
      }

      setLoadingDonations(true);
      try {
        const response = await fetch('http://localhost:5000/api/donations/my-donations', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();
        if (data.success) {
          // Get only the 10 most recent donations
          setDonations(data.donations.slice(0, 10));
        }
      } catch (error) {
        console.error('Error fetching donations:', error);
      } finally {
        setLoadingDonations(false);
      }
    };

    if (user) {
      fetchDonations();
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleEditClick = () => {
    navigate('/edit-profile');
  };

  if (loading) {
    return <div className="profile-loading">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-container">
      <header className="profile-navbar">
        <div className="navbar-content">
          <h1 className="logo">🍽️ FoodShare</h1>
          <nav className="nav-links">
            {user.role !== 'NGO' && (
              <button className="nav-btn" onClick={() => navigate('/')}>
                Home
              </button>
            )}
            <button className="nav-btn" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </header>

      <div className="profile-wrapper">
        <div className="profile-header">
          <h2>My Profile</h2>
        </div>

        <div className="profile-content">
          <div className="profile-left">
            <div className="profile-picture">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" />
              ) : (
                <div className="placeholder-image">👤</div>
              )}
            </div>
          </div>

          <div className="profile-right">
            <div className="profile-info">
              <div className="info-group">
                <label>Name:</label>
                <p>{user.name || 'Not set'}</p>
              </div>

              <div className="info-group">
                <label>Email:</label>
                <p>{user.email}</p>
              </div>

              <div className="info-group">
                <label>Role:</label>
                <p className="role-badge">{user.role}</p>
              </div>

              <div className="info-group">
                <label>Phone:</label>
                <p>{user.phone || 'Not set'}</p>
              </div>

              {(user.role === 'Restaurant' || user.role === 'NGO') && (
                <>
                  <div className="info-group">
                    <label>Organization Name:</label>
                    <p>{user.organizationName || 'Not set'}</p>
                  </div>

                  <div className="info-group">
                    <label>Verification Status:</label>
                    <p>
                      {user.verificationMark ? (
                        <span className="verified">✓ Verified</span>
                      ) : (
                        <span className="pending">⏳ Pending Review</span>
                      )}
                    </p>
                  </div>
                </>
              )}

              <button className="edit-btn" onClick={handleEditClick}>
                Edit Profile
              </button>
            </div>

            {/* Quick Actions Section */}
            <div className="quick-actions-section">
              <h3>Quick Actions</h3>
              <div className="quick-action-buttons">
                {user.role === 'Customer' && (
                  <>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/restaurants')}
                    >
                      🍔 Order Food
                    </button>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/nearby-map')}
                    >
                      🗺️ Nearby Places
                    </button>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/donate-food')}
                    >
                      🤝 Donate Food
                    </button>
                  </>
                )}
                {user.role === 'Restaurant' && (
                  <>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/restaurant-ngo-map')}
                    >
                      🗺️ Nearby NGOs
                    </button>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/donate-food')}
                    >
                      🤝 Donate Food
                    </button>
                  </>
                )}
                {user.role === 'NGO' && (
                  <>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/restaurants')}
                    >
                      Order Food
                    </button>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/nearby-map')}
                    >
                      Nearby Restaurants
                    </button>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/ngo/campaigns')}
                    >
                      My Campaigns
                    </button>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/volunteer-dashboard')}
                    >
                      My Dashboard
                    </button>
                  </>
                )}
                {(user.role === 'Customer' || user.role === 'Restaurant') && (
                  <button 
                    className="quick-action-btn"
                    onClick={() => navigate('/campaigns')}
                  >
                    🎯 Campaigns
                  </button>
                )}
              </div>
            </div>

            {/* Campaign Badges Section */}
            {user.campaignBadges && user.campaignBadges.length > 0 && (
              <CampaignBadges badges={user.campaignBadges} />
            )}
          </div>
        </div>

        {/* My Donations Section - Only for Customers and Restaurants */}
        {(user.role === 'Customer' || user.role === 'Restaurant') && (
          <div className="donations-section">
            <div className="donations-header">
              <h3>📦 My Recent Donations</h3>
              <button 
                className="view-all-btn" 
                onClick={() => navigate('/my-donations')}
              >
                View All
              </button>
            </div>

            {loadingDonations ? (
              <div className="donations-loading">Loading donations...</div>
            ) : donations.length === 0 ? (
              <div className="no-donations">
                <p>You haven't made any donations yet.</p>
                <button 
                  className="donate-now-btn" 
                  onClick={() => navigate('/donate-food')}
                >
                  Donate Food Now
                </button>
              </div>
            ) : (
              <div className="donations-list">
                {donations.map((donation) => {
                  const expiryDate = new Date(donation.expiryDateTime);
                  const now = new Date();
                  const hoursLeft = Math.floor((expiryDate - now) / (1000 * 60 * 60));
                  const isExpiringSoon = hoursLeft <= 6 && hoursLeft > 0;
                  const isExpired = hoursLeft <= 0;

                  return (
                    <div key={donation._id} className="donation-card">
                      <div className="donation-card-header">
                        <h4>{donation.title}</h4>
                        <span className={`status-badge ${donation.status.toLowerCase()}`}>
                          {donation.status}
                        </span>
                      </div>

                      <div className="donation-details">
                        <div className="detail-row">
                          <span className="detail-label">🍽️ Quantity:</span>
                          <span className="detail-value">{donation.quantity}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">👥 Servings:</span>
                          <span className="detail-value">{donation.servings} people</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">🥗 Type:</span>
                          <span className="detail-value">{donation.foodType}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">✨ Freshness:</span>
                          <span className="detail-value">{donation.freshnessLevel}</span>
                        </div>
                        
                        {/* Expiry Status */}
                        <div className="detail-row">
                          <span className="detail-label">⏰ Expiry:</span>
                          <span className={`detail-value expiry-status ${
                            isExpired ? 'expired' : isExpiringSoon ? 'warning' : 'good'
                          }`}>
                            {isExpired ? (
                              '🔴 Expired'
                            ) : isExpiringSoon ? (
                              `⚠️ ${hoursLeft}h left`
                            ) : hoursLeft > 0 ? (
                              `✅ ${hoursLeft}h left`
                            ) : (
                              new Date(donation.expiryDateTime).toLocaleString()
                            )}
                          </span>
                        </div>

                        {/* Smart Expiry Info */}
                        {donation.productionTime && (
                          <div className="detail-row">
                            <span className="detail-label">👨‍🍳 Prepared:</span>
                            <span className="detail-value">
                              {new Date(donation.productionTime).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {donation.storageCondition && (
                          <div className="detail-row">
                            <span className="detail-label">❄️ Storage:</span>
                            <span className="detail-value">{donation.storageCondition}</span>
                          </div>
                        )}

                        {/* Pickup Window */}
                        {donation.pickupWindow && (
                          <div className="detail-row">
                            <span className="detail-label">📍 Pickup:</span>
                            <span className="detail-value">
                              {new Date(donation.pickupWindow.from).toLocaleTimeString()} - {new Date(donation.pickupWindow.to).toLocaleTimeString()}
                            </span>
                          </div>
                        )}

                        {/* Claimed By */}
                        {donation.claimedBy && (
                          <div className="detail-row">
                            <span className="detail-label">🤝 Claimed by:</span>
                            <span className="detail-value">{donation.claimedBy.name || 'NGO'}</span>
                          </div>
                        )}

                        {/* Created Date */}
                        <div className="detail-row">
                          <span className="detail-label">📅 Posted:</span>
                          <span className="detail-value">
                            {new Date(donation.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="donation-actions">
                        <button 
                          className="view-details-btn"
                          onClick={() => navigate(`/donation/${donation._id}`)}
                        >
                          View Details
                        </button>
                        
                        {donation.status === 'Available' && isExpiringSoon && (
                          <button 
                            className="urgent-action-btn"
                            onClick={() => navigate(`/donation/${donation._id}`)}
                          >
                            ⚡ Take Action
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;