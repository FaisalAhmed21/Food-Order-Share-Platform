import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Campaigns.css';

const Campaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get user role and ID
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      
      // Redirect admin to admin campaigns page
      if (user.role === 'Admin') {
        navigate('/admin/campaigns');
        return;
      }
      
      setUserRole(user.role);
      setUserId(user.id || user._id);
      console.log('User data loaded:', { role: user.role, id: user.id || user._id });
    }
    
    fetchCampaigns();
  }, [navigate]);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Campaigns - Token:', token ? 'exists' : 'missing');
      console.log('Campaigns - Token value:', token);
      
      const [allResponse, activeResponse] = await Promise.all([
        fetch('http://localhost:5000/api/campaigns/all', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/campaigns/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      console.log('All campaigns response status:', allResponse.status);
      console.log('Active campaigns response status:', activeResponse.status);

      const allData = await allResponse.json();
      const activeData = await activeResponse.json();

      console.log('All campaigns data:', allData);
      console.log('Active campaigns data:', activeData);

      if (allData.success) setCampaigns(allData.campaigns);
      if (activeData.success) setActiveCampaigns(activeData.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCampaign = async (campaignId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/campaigns/${campaignId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        alert('Successfully joined campaign!');
        fetchCampaigns();
      } else {
        alert(data.message || 'Failed to join campaign');
      }
    } catch (error) {
      console.error('Error joining campaign:', error);
      alert('Failed to join campaign');
    }
  };

  const handleLeaveCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to leave this campaign?')) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/campaigns/${campaignId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        alert('Left campaign successfully');
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error leaving campaign:', error);
    }
  };

  const viewCampaignDetails = async (campaignId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/campaigns/${campaignId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await response.json();
      if (data.success) {
        setSelectedCampaign(data.campaign);
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    }
  };

  // Check if user is the creator of the campaign
  const isCreator = (campaign) => {
    if (!campaign || !userId) return false;
    const creatorId = campaign.createdBy?._id || campaign.createdBy;
    return creatorId === userId;
  };

  // Check if user has already joined the campaign
  const hasJoined = (campaign) => {
    if (!campaign || !userId) {
      return false;
    }
    
    // Check in participants arrays based on role
    // Participants are stored as subdocuments with a 'user' field
    if (userRole === 'NGO' && campaign.participants?.ngos) {
      return campaign.participants.ngos.some(ngo => {
        const ngoUserId = ngo.user?._id || ngo.user || ngo._id || ngo;
        return ngoUserId.toString() === userId.toString();
      });
    }
    if ((userRole === 'Customer' || userRole === 'Restaurant') && campaign.participants?.donors) {
      return campaign.participants.donors.some(donor => {
        const donorUserId = donor.user?._id || donor.user || donor._id || donor;
        return donorUserId.toString() === userId.toString();
      });
    }
    if (userRole === 'Volunteer' && campaign.participants?.volunteers) {
      return campaign.participants.volunteers.some(volunteer => {
        const volunteerUserId = volunteer.user?._id || volunteer.user || volunteer._id || volunteer;
        return volunteerUserId.toString() === userId.toString();
      });
    }
    return false;
  };

  const getCampaignIcon = (type) => {
    const icons = {
      'Ramadan': '🌙',
      'Winter': '❄️',
      'Zero Waste': '♻️',
      'Festival': '🎉',
      'Emergency': '🚨',
      'Custom': '📋'
    };
    return icons[type] || '📋';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Upcoming': '#ffc107',
      'Active': '#28a745',
      'Completed': '#6c757d',
      'Archived': '#343a40'
    };
    return colors[status] || '#6c757d';
  };

  const calculateProgress = (campaign) => {
    if (!campaign.goals.targetMeals) return 0;
    return Math.min(100, Math.round((campaign.stats.totalMealsDonated / campaign.goals.targetMeals) * 100));
  };

  if (loading) {
    return <div className="loading">Loading campaigns...</div>;
  }

  return (
    <div className="campaigns-container">
      <div className="header-section">
        <button className="back-btn" onClick={() => navigate('/home')}>← Back</button>
        <h1>Community Campaigns & Drives</h1>
      </div>

      {/* Active Campaigns Section */}
      {activeCampaigns.length > 0 && (
        <div className="active-section">
          <h2>🔥 Active Campaigns</h2>
          <div className="campaigns-grid">
            {activeCampaigns.map(campaign => (
              <div key={campaign._id} className="campaign-card active-campaign">
                <div className="campaign-header">
                  <div className="campaign-icon">{getCampaignIcon(campaign.type)}</div>
                  <div className="campaign-title-section">
                    <h3>{campaign.name}</h3>
                    <span className="campaign-type">{campaign.type}</span>
                  </div>
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(campaign.status) }}
                  >
                    {campaign.status}
                  </span>
                </div>

                {campaign.bannerImage && (
                  <div className="campaign-banner" style={{ margin: '10px 0', borderRadius: '8px', overflow: 'hidden' }}>
                    <img 
                      src={campaign.bannerImage.startsWith('http') 
                        ? campaign.bannerImage 
                        : `http://localhost:5000${campaign.bannerImage}`
                      } 
                      alt={campaign.name}
                      style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <p className="campaign-description">{campaign.description}</p>

                <div className="campaign-dates">
                  <span>📅 {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}</span>
                </div>

                <div className="campaign-progress">
                  <div className="progress-header">
                    <span>🎯 Progress</span>
                    <span>{campaign.stats.totalMealsDonated} / {campaign.goals.targetMeals} meals</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${calculateProgress(campaign)}%` }}
                    ></div>
                  </div>
                  <div className="progress-percentage">{calculateProgress(campaign)}%</div>
                </div>

                <div className="campaign-stats">
                  <div className="stat-item">
                    <span className="stat-value">{campaign.stats.totalDonors}</span>
                    <span className="stat-label">Donors</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{campaign.stats.totalNGOs}</span>
                    <span className="stat-label">NGOs</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{campaign.stats.totalVolunteers}</span>
                    <span className="stat-label">Volunteers</span>
                  </div>
                </div>

                <div className="campaign-actions">
                  <button 
                    className="view-btn"
                    onClick={() => viewCampaignDetails(campaign._id)}
                  >
                    View Details
                  </button>
                  {!isCreator(campaign) && !hasJoined(campaign) && userRole !== 'Admin' && (
                    <button 
                      className="join-btn"
                      onClick={() => handleJoinCampaign(campaign._id)}
                    >
                      Join Campaign
                    </button>
                  )}
                  {hasJoined(campaign) && (
                    <button 
                      className="joined-badge"
                      disabled
                    >
                      Joined
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Campaigns Section */}
      <div className="all-campaigns-section">
        <h2>📋 All Campaigns</h2>
        <div className="campaigns-grid">
          {campaigns.map(campaign => (
            <div key={campaign._id} className="campaign-card">
              <div className="campaign-header">
                <div className="campaign-icon">{getCampaignIcon(campaign.type)}</div>
                <div className="campaign-title-section">
                  <h3>{campaign.name}</h3>
                  <span className="campaign-type">{campaign.type}</span>
                </div>
                <span 
                  className="status-badge" 
                  style={{ backgroundColor: getStatusColor(campaign.status) }}
                >
                  {campaign.status}
                </span>
              </div>

              {campaign.bannerImage && (
                <div className="campaign-banner" style={{ margin: '10px 0', borderRadius: '8px', overflow: 'hidden' }}>
                  <img 
                    src={campaign.bannerImage.startsWith('http') 
                      ? campaign.bannerImage 
                      : `http://localhost:5000${campaign.bannerImage}`
                    } 
                    alt={campaign.name}
                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                  />
                </div>
              )}

              <p className="campaign-description">{campaign.description}</p>

              <div className="campaign-dates">
                <span>📅 {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}</span>
              </div>

              {campaign.isRecurring && (
                <div className="recurring-badge">
                  🔄 Recurring {campaign.recurrencePattern}
                </div>
              )}

              <div className="campaign-stats">
                <div className="stat-item">
                  <span className="stat-value">{campaign.stats.totalMealsDonated}</span>
                  <span className="stat-label">Meals</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{campaign.stats.totalPickups}</span>
                  <span className="stat-label">Pickups</span>
                </div>
              </div>

              <div className="campaign-actions">
                <button 
                  className="view-btn"
                  onClick={() => viewCampaignDetails(campaign._id)}
                >
                  View Details
                </button>
                {campaign.status === 'Active' && !isCreator(campaign) && !hasJoined(campaign) && (
                  <button 
                    className="join-btn"
                    onClick={() => handleJoinCampaign(campaign._id)}
                  >
                    Join Campaign
                  </button>
                )}
                {hasJoined(campaign) && (
                  <button 
                    className="joined-badge"
                    disabled
                  >
                    Joined
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="modal-overlay" onClick={() => setSelectedCampaign(null)}>
          <div className="modal-content campaign-details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedCampaign(null)}>✕</button>
            
            <div className="modal-header">
              <div className="campaign-icon large">{getCampaignIcon(selectedCampaign.type)}</div>
              <h2>{selectedCampaign.name}</h2>
              <span 
                className="status-badge" 
                style={{ backgroundColor: getStatusColor(selectedCampaign.status) }}
              >
                {selectedCampaign.status}
              </span>
            </div>

            <p className="campaign-description">{selectedCampaign.description}</p>

            <div className="details-section">
              <h3>📊 Campaign Goals</h3>
              <div className="goals-grid">
                <div className="goal-item">
                  <span className="goal-label">Target Meals:</span>
                  <span className="goal-value">{selectedCampaign.goals.targetMeals}</span>
                </div>
                <div className="goal-item">
                  <span className="goal-label">Target Donors:</span>
                  <span className="goal-value">{selectedCampaign.goals.targetDonors}</span>
                </div>
                <div className="goal-item">
                  <span className="goal-label">Target NGOs:</span>
                  <span className="goal-value">{selectedCampaign.goals.targetNGOs}</span>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>📈 Current Statistics</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-number">{selectedCampaign.stats.totalMealsDonated}</span>
                  <span className="stat-text">Meals Donated</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{selectedCampaign.stats.totalDonors}</span>
                  <span className="stat-text">Donors Joined</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{selectedCampaign.stats.totalNGOs}</span>
                  <span className="stat-text">NGOs Participating</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{selectedCampaign.stats.totalVolunteers}</span>
                  <span className="stat-text">Volunteers</span>
                </div>
              </div>
            </div>

            {selectedCampaign.badges && selectedCampaign.badges.length > 0 && (
              <div className="details-section">
                <h3>🏅 Available Badges</h3>
                <div className="badges-list">
                  {selectedCampaign.badges.map((badge, index) => (
                    <div key={index} className="badge-item">
                      <span className="badge-icon">{badge.icon}</span>
                      <div className="badge-info">
                        <strong>{badge.name}</strong>
                        <p>{badge.criteria}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              {selectedCampaign.status === 'Active' && !isCreator(selectedCampaign) && !hasJoined(selectedCampaign) && (
                <button 
                  className="join-btn large"
                  onClick={() => {
                    handleJoinCampaign(selectedCampaign._id);
                    setSelectedCampaign(null);
                  }}
                >
                  Join Campaign
                </button>
              )}
              {hasJoined(selectedCampaign) && !isCreator(selectedCampaign) && (
                <button 
                  className="joined-badge large"
                  disabled
                >
                  Already Joined
                </button>
              )}
              {isCreator(selectedCampaign) && !hasJoined(selectedCampaign) && (
                <button 
                  className="creator-badge large"
                  disabled
                >
                  You Created This Campaign
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
