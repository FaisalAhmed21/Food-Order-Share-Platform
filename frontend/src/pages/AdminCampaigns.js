import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminCampaigns.css';

const AdminCampaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => {
    // Check if admin
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.role !== 'Admin') {
      navigate('/login');
      return;
    }

    fetchCampaigns();
  }, [navigate]);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Admin Campaigns - Token:', token ? 'exists' : 'missing');
      
      const response = await fetch('http://localhost:5000/api/campaigns/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Admin Campaigns - Response status:', response.status);
      
      const data = await response.json();
      console.log('Admin Campaigns - API Response:', data);
      
      if (data.success) {
        setCampaigns(data.campaigns);
      } else {
        console.error('API returned error:', data.message);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = (campaign) => {
    setSelectedCampaign(campaign);
  };

  const closeModal = () => {
    setSelectedCampaign(null);
  };

  const deleteCampaign = async (campaignId, campaignTitle) => {
    if (!window.confirm(`Are you sure you want to DELETE "${campaignTitle}"? This action cannot be undone and will permanently remove this campaign.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/admin/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setCampaigns(campaigns.filter(c => c._id !== campaignId));
        alert('Campaign deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete campaign');
      }
    } catch (error) {
      alert('Error deleting campaign');
      console.error(error);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    (campaign.name || campaign.title)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCampaigns = filteredCampaigns.filter(c => c.status?.toLowerCase() === 'active');
  const completedCampaigns = filteredCampaigns.filter(c => c.status?.toLowerCase() === 'completed');

  if (loading) {
    return <div className="admin-campaigns-loading">Loading campaigns...</div>;
  }

  return (
    <div className="admin-campaigns-page">
      {/* Admin Navbar */}
      <nav className="admin-navbar">
        <div className="admin-nav-left">
          <h2>Admin Panel</h2>
        </div>
        <div className="admin-nav-center">
          <button className="admin-nav-btn" onClick={() => navigate('/admin/dashboard')}>
            Dashboard
          </button>
          <button className="admin-nav-btn" onClick={() => navigate('/admin/manage-restaurants')}>
            Manage Restaurants
          </button>
          <button className="admin-nav-btn active">
            Campaigns
          </button>
          <button className="admin-nav-btn" onClick={() => navigate('/admin/ngos')}>
            NGO Management
          </button>
        </div>
        <div className="admin-nav-right">
          <button className="admin-logout-btn" onClick={() => {
            localStorage.clear();
            navigate('/login');
          }}>
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="admin-campaigns-content">
        <div className="admin-campaigns-header">
          <h1>Campaign Management</h1>
          <p>View and monitor all campaigns</p>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            placeholder="Search campaigns by title, description, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Campaign Stats */}
        <div className="campaign-stats">
          <div className="stat-box">
            <h3>{campaigns.length}</h3>
            <p>Total Campaigns</p>
          </div>
          <div className="stat-box">
            <h3>{activeCampaigns.length}</h3>
            <p>Active Campaigns</p>
          </div>
          <div className="stat-box">
            <h3>{completedCampaigns.length}</h3>
            <p>Completed Campaigns</p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="campaigns-section">
          <h2>🔥 Active Campaigns</h2>
          {activeCampaigns.length === 0 ? (
            <div className="no-campaigns">No active campaigns</div>
          ) : (
            <div className="campaigns-grid">
              {activeCampaigns.map((campaign) => (
                <div key={campaign._id} className="campaign-card-admin">
                  <div className="campaign-image-admin">
                    {campaign.bannerImage ? (
                      <img src={campaign.bannerImage} alt={campaign.name || campaign.title} />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                    <span className="status-badge active">Active</span>
                  </div>
                  <div className="campaign-info-admin">
                    <h3>{campaign.name || campaign.title}</h3>
                    <p className="campaign-desc">{campaign.description?.substring(0, 100)}...</p>
                    <div className="campaign-meta">
                      <span>📍 {campaign.location}</span>
                      <span>👥 {(campaign.participants?.donors?.length || 0) + (campaign.participants?.ngos?.length || 0) + (campaign.participants?.volunteers?.length || 0)} participants</span>
                    </div>
                    <div className="campaign-dates">
                      <span>Start: {new Date(campaign.startDate).toLocaleDateString()}</span>
                      <span>End: {new Date(campaign.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="campaign-actions">
                      <button 
                        className="view-details-btn"
                        onClick={() => viewDetails(campaign)}
                      >
                        View Details
                      </button>
                      <button 
                        className="delete-campaign-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCampaign(campaign._id, campaign.name || campaign.title);
                        }}
                      >
                        Delete Campaign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Campaigns */}
        <div className="campaigns-section">
          <h2>✅ Completed Campaigns</h2>
          {completedCampaigns.length === 0 ? (
            <div className="no-campaigns">No completed campaigns</div>
          ) : (
            <div className="campaigns-grid">
              {completedCampaigns.map((campaign) => (
                <div key={campaign._id} className="campaign-card-admin completed">
                  <div className="campaign-image-admin">
                    {campaign.bannerImage ? (
                      <img src={campaign.bannerImage.startsWith('http') ? campaign.bannerImage : `http://localhost:5000${campaign.bannerImage}`} alt={campaign.name || campaign.title} />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                    <span className="status-badge completed">Completed</span>
                  </div>
                  <div className="campaign-info-admin">
                    <h3>{campaign.name || campaign.title}</h3>
                    <p className="campaign-desc">{campaign.description?.substring(0, 100)}...</p>
                    <div className="campaign-meta">
                      <span>📍 {campaign.location}</span>
                      <span>👥 {(campaign.participants?.donors?.length || 0) + (campaign.participants?.ngos?.length || 0) + (campaign.participants?.volunteers?.length || 0)} participants</span>
                    </div>
                    <div className="campaign-actions">
                      <button 
                        className="view-details-btn"
                        onClick={() => viewDetails(campaign)}
                      >
                        View Details
                      </button>
                      <button 
                        className="delete-campaign-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCampaign(campaign._id, campaign.name || campaign.title);
                        }}
                      >
                        Delete Campaign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content-admin" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            <h2>{selectedCampaign.name || selectedCampaign.title}</h2>
            {selectedCampaign.bannerImage && (
              <img src={selectedCampaign.bannerImage.startsWith('http') ? selectedCampaign.bannerImage : `http://localhost:5000${selectedCampaign.bannerImage}`} alt={selectedCampaign.name || selectedCampaign.title} className="modal-banner" />
            )}
            <div className="modal-details">
              <p><strong>Description:</strong> {selectedCampaign.description}</p>
              <p><strong>Location:</strong> {selectedCampaign.location}</p>
              <p><strong>Status:</strong> <span className={`status-${selectedCampaign.status}`}>{selectedCampaign.status}</span></p>
              <p><strong>Start Date:</strong> {new Date(selectedCampaign.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> {new Date(selectedCampaign.endDate).toLocaleDateString()}</p>
              <p><strong>Created By:</strong> {selectedCampaign.createdBy?.name || 'Unknown'} ({selectedCampaign.createdBy?.role || 'Unknown'})</p>
              
              <h3>Participants</h3>
              <div className="participants-summary">
                <div>
                  <strong>Donors:</strong> {selectedCampaign.participants?.donors?.length || 0}
                </div>
                <div>
                  <strong>NGOs:</strong> {selectedCampaign.participants?.ngos?.length || 0}
                </div>
                <div>
                  <strong>Volunteers:</strong> {selectedCampaign.participants?.volunteers?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCampaigns;
