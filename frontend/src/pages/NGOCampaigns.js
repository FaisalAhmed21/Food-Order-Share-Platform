import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './NGOCampaigns.css';

const NGOCampaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Custom',
    startDate: '',
    endDate: '',
    targetMeals: '',
    targetDonors: ''
  });
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyCampaigns();
  }, []);

  const fetchMyCampaigns = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/campaigns/ngo/my-campaigns', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await response.json();

      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setBannerImage(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('userData');
      console.log('Creating campaign - Token exists:', !!token);
      console.log('Creating campaign - User data:', userData ? JSON.parse(userData) : 'No user data');
      
      // Create FormData for file upload
      const formPayload = new FormData();
      formPayload.append('name', formData.name);
      formPayload.append('description', formData.description);
      formPayload.append('type', formData.type);
      formPayload.append('startDate', formData.startDate);
      formPayload.append('endDate', formData.endDate);
      formPayload.append('targetMeals', formData.targetMeals || '0');
      formPayload.append('targetDonors', formData.targetDonors || '0');
      
      if (bannerImage) {
        formPayload.append('campaignBanner', bannerImage);
      }
      
      const response = await fetch('http://localhost:5000/api/campaigns/ngo/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formPayload
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          type: 'Custom',
          startDate: '',
          endDate: '',
          targetMeals: '',
          targetDonors: ''
        });
        setBannerImage(null);
        setBannerPreview('');
        fetchMyCampaigns();
      } else {
        setError(data.message || 'Failed to create campaign');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      console.error('Error creating campaign:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCampaign = async (campaignId, campaignName) => {
    if (!window.confirm(`Are you sure you want to delete "${campaignName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/campaigns/ngo/${campaignId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await response.json();

      if (data.success) {
        alert('Campaign deleted successfully');
        fetchMyCampaigns();
      } else {
        alert(data.message || 'Failed to delete campaign');
      }
    } catch (error) {
      alert('Something went wrong. Please try again.');
      console.error('Error deleting campaign:', error);
    }
  };

  const handleAssignBadges = async (campaignId, campaignName) => {
    if (!window.confirm(`Assign badges to top 3 donors in "${campaignName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/campaigns/ngo/${campaignId}/assign-badges`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await response.json();

      if (data.success) {
        alert(`${data.message}\n\nBadges assigned:\n${data.badgeAssignments.map(b => `${b.badge}: $${b.donationAmount.toFixed(2)}`).join('\n')}`);
        fetchMyCampaigns();
      } else {
        alert(data.message || 'Failed to assign badges');
      }
    } catch (error) {
      alert('Something went wrong. Please try again.');
      console.error('Error assigning badges:', error);
    }
  };

  const fetchCampaignDetails = async (campaignId) => {
    setLoadingDetails(true);
    setShowDetailsModal(true);
    
    try {
      const response = await fetch(`http://localhost:5000/api/campaigns/${campaignId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await response.json();

      if (data.success) {
        setCampaignDetails(data.campaign);
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (campaign) => {
    setSelectedCampaign(campaign);
    fetchCampaignDetails(campaign._id);
  };

  const getStatusBadgeClass = (status) => {
    const classMap = {
      'Upcoming': 'status-upcoming',
      'Active': 'status-active',
      'Completed': 'status-completed',
      'Archived': 'status-archived'
    };
    return classMap[status] || '';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="ngo-campaigns-container">
        <div className="loading-spinner">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="ngo-campaigns-container">
      <div className="ngo-campaigns-header">
        <button className="back-to-profile-btn" onClick={() => navigate('/profile')}>
          ← Back
        </button>
        <h1>My Campaigns</h1>
        <p>Manage your fundraising campaigns</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="no-campaigns">
          <div className="empty-state">
            <h2>📋 No Campaigns Yet</h2>
            <p>Create your first campaign to start raising funds and awareness</p>
            <button className="create-first-btn" onClick={() => setShowCreateModal(true)}>
              Create Campaign
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="create-campaign-action">
            <button className="create-campaign-btn" onClick={() => setShowCreateModal(true)}>
              + Create New Campaign
            </button>
          </div>
          <div className="campaigns-grid">
          {campaigns.map(campaign => (
            <div key={campaign._id} className="campaign-card">
              <div className={`campaign-status-badge ${getStatusBadgeClass(campaign.status)}`}>
                {campaign.status}
              </div>

              {campaign.bannerImage && (
                <div className="campaign-banner">
                  <img 
                    src={campaign.bannerImage.startsWith('http') 
                      ? campaign.bannerImage 
                      : `http://localhost:5000${campaign.bannerImage}`
                    } 
                    alt={campaign.name} 
                  />
                </div>
              )}

              <div className="campaign-content">
                <h3>{campaign.name}</h3>
                <span className="campaign-type">{campaign.type}</span>
                <p className="campaign-description">{campaign.description}</p>

                <div className="campaign-dates">
                  <div className="date-item">
                    <span className="date-label">Start Date:</span>
                    <span className="date-value">{formatDate(campaign.startDate)}</span>
                  </div>
                  <div className="date-item">
                    <span className="date-label">End Date:</span>
                    <span className="date-value">{formatDate(campaign.endDate)}</span>
                  </div>
                </div>

                <div className="campaign-stats">
                  <div className="stat-item">
                    <span className="stat-number">{campaign.stats?.totalMealsDonated || 0}</span>
                    <span className="stat-label">Meals Donated</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{campaign.stats?.totalDonors || 0}</span>
                    <span className="stat-label">Donors</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{campaign.participants?.donors?.length || 0}</span>
                    <span className="stat-label">Participants</span>
                  </div>
                </div>

                {campaign.goals && (
                  <div className="campaign-goals">
                    <div className="goal-item">
                      <span>Target Meals: {campaign.goals.targetMeals || 'No limit'}</span>
                    </div>
                    <div className="goal-item">
                      <span>Target Donors: {campaign.goals.targetDonors || 'No limit'}</span>
                    </div>
                  </div>
                )}

                <div className="campaign-actions">
                  <button 
                    className="view-details-btn"
                    onClick={() => handleViewDetails(campaign)}
                  >
                    View Participants
                  </button>
                  {campaign.status === 'Completed' && (
                    <button 
                      className="badge-btn"
                      onClick={() => handleAssignBadges(campaign._id, campaign.name)}
                      title="Assign Gold/Silver/Bronze badges to top 3 donors"
                    >
                      Assign Badges
                    </button>
                  )}
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteCampaign(campaign._id, campaign.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Campaign</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="campaign-form">
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Winter Food Drive 2024"
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  placeholder="Describe your campaign goals and impact..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange}>
                    <option value="Custom">Custom</option>
                    <option value="Ramadan">Ramadan</option>
                    <option value="Winter">Winter</option>
                    <option value="Zero Waste">Zero Waste</option>
                    <option value="Festival">Festival</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Campaign Banner Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>Max 5MB, JPG/PNG/GIF</small>
                  {bannerPreview && (
                    <div style={{ marginTop: '10px' }}>
                      <img 
                        src={bannerPreview} 
                        alt="Banner preview" 
                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Target Meals (Optional)</label>
                  <input
                    type="number"
                    name="targetMeals"
                    value={formData.targetMeals}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="1000"
                  />
                </div>

                <div className="form-group">
                  <label>Target Donors (Optional)</label>
                  <input
                    type="number"
                    name="targetDonors"
                    value={formData.targetDonors}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campaign Details Modal */}
      {showDetailsModal && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content campaign-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Campaign Participants & Donations</h2>
              <button className="close-modal" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>

            {loadingDetails ? (
              <div className="modal-loading">Loading details...</div>
            ) : campaignDetails ? (
              <div className="campaign-details-content">
                <div className="campaign-info-summary">
                  <h3>{campaignDetails.name}</h3>
                  <p>{campaignDetails.description}</p>
                  <div className="detail-stats">
                    <span>{formatDate(campaignDetails.startDate)} - {formatDate(campaignDetails.endDate)}</span>
                    <span className={`detail-status ${getStatusBadgeClass(campaignDetails.status)}`}>
                      {campaignDetails.status}
                    </span>
                  </div>
                </div>

                {/* Donors Section */}
                <div className="participants-section">
                  <h4>🍽️ Donors ({campaignDetails.participants?.donors?.length || 0})</h4>
                  {campaignDetails.participants?.donors && campaignDetails.participants.donors.length > 0 ? (
                    <div className="participants-list">
                      {campaignDetails.participants.donors.map((donor, index) => (
                        <div key={index} className="participant-card">
                          <div className="participant-info">
                            <span className="participant-name">
                              {donor.user?.name || 'Anonymous'}
                            </span>
                            <span className="participant-role">{donor.user?.role || 'Donor'}</span>
                          </div>
                          <div className="participant-contribution">
                            <div className="contribution-detail">
                              <span className="contribution-label">Meals Donated:</span>
                              <span className="contribution-value">{donor.mealsDonated || 0}</span>
                            </div>
                            <div className="contribution-detail">
                              <span className="contribution-label">Total Amount:</span>
                              <span className="contribution-value">৳{donor.totalDonated?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="contribution-detail">
                              <span className="contribution-label">Donations:</span>
                              <span className="contribution-value">{donor.donationCount || 0}</span>
                            </div>
                            <div className="contribution-detail">
                              <span className="contribution-label">Joined:</span>
                              <span className="contribution-value">
                                {new Date(donor.joinedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-participants">No donors yet</p>
                  )}
                </div>

                {/* NGOs Section */}
                <div className="participants-section">
                  <h4>🏢 Partner NGOs ({campaignDetails.participants?.ngos?.length || 0})</h4>
                  {campaignDetails.participants?.ngos && campaignDetails.participants.ngos.length > 0 ? (
                    <div className="participants-list">
                      {campaignDetails.participants.ngos.map((ngo, index) => (
                        <div key={index} className="participant-card">
                          <div className="participant-info">
                            <span className="participant-name">
                              {ngo.user?.organizationName || ngo.user?.name || 'Anonymous NGO'}
                            </span>
                            <span className="participant-role">NGO Partner</span>
                          </div>
                          <div className="participant-contribution">
                            <div className="contribution-detail">
                              <span className="contribution-label">Meals Donated:</span>
                              <span className="contribution-value">{ngo.mealsDonated || 0}</span>
                            </div>
                            <div className="contribution-detail">
                              <span className="contribution-label">Total Amount:</span>
                              <span className="contribution-value">৳{ngo.totalDonated?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="contribution-detail">
                              <span className="contribution-label">Joined:</span>
                              <span className="contribution-value">
                                {new Date(ngo.joinedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-participants">No partner NGOs yet</p>
                  )}
                </div>

                {/* Volunteers Section */}
                <div className="participants-section">
                  <h4>👥 Volunteers ({campaignDetails.participants?.volunteers?.length || 0})</h4>
                  {campaignDetails.participants?.volunteers && campaignDetails.participants.volunteers.length > 0 ? (
                    <div className="participants-list">
                      {campaignDetails.participants.volunteers.map((volunteer, index) => (
                        <div key={index} className="participant-card">
                          <div className="participant-info">
                            <span className="participant-name">
                              {volunteer.user?.name || 'Anonymous'}
                            </span>
                            <span className="participant-role">Volunteer</span>
                          </div>
                          <div className="participant-contribution">
                            <div className="contribution-detail">
                              <span className="contribution-label">Deliveries:</span>
                              <span className="contribution-value">{volunteer.deliveriesCompleted || 0}</span>
                            </div>
                            <div className="contribution-detail">
                              <span className="contribution-label">Hours:</span>
                              <span className="contribution-value">{volunteer.hoursContributed || 0}h</span>
                            </div>
                            <div className="contribution-detail">
                              <span className="contribution-label">Joined:</span>
                              <span className="contribution-value">
                                {new Date(volunteer.joinedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-participants">No volunteers yet</p>
                  )}
                </div>

                {/* Overall Stats */}
                <div className="overall-stats">
                  <h4>📈 Campaign Statistics</h4>
                  <div className="stats-grid">
                    <div className="stat-box">
                      <span className="stat-box-label">Total Meals</span>
                      <span className="stat-box-value">{campaignDetails.stats?.totalMealsDonated || 0}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-box-label">Total Amount</span>
                      <span className="stat-box-value">৳{campaignDetails.stats?.totalAmountRaised?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-box-label">Total Donors</span>
                      <span className="stat-box-value">{campaignDetails.stats?.totalDonors || 0}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-box-label">Total Participants</span>
                      <span className="stat-box-value">
                        {(campaignDetails.participants?.donors?.length || 0) + 
                         (campaignDetails.participants?.ngos?.length || 0) + 
                         (campaignDetails.participants?.volunteers?.length || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="modal-error">Failed to load campaign details</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NGOCampaigns;
