import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminNGOs.css';

const AdminNGOs = () => {
  const navigate = useNavigate();
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Check if admin
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.role !== 'Admin') {
      navigate('/login');
      return;
    }

    fetchNGOs();
  }, [navigate]);

  const fetchNGOs = async () => {
    try {
      console.log('Fetching NGOs from API...');
      const response = await fetch('http://localhost:5000/api/admin/ngos', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        console.log('NGOs received:', data.ngos);
        setNgos(data.ngos);
      } else {
        console.error('API returned success=false:', data.message);
      }
    } catch (error) {
      console.error('Error fetching NGOs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerification = async (ngoId, currentStatus) => {
    try {
      console.log('Verifying NGO:', ngoId, 'Current status:', currentStatus);
      const response = await fetch(`http://localhost:5000/api/admin/ngos/${ngoId}/verify`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verificationMark: !currentStatus
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        // Update local state
        setNgos(ngos.map(ngo => 
          ngo._id === ngoId ? { ...ngo, verificationMark: !currentStatus } : ngo
        ));
        alert(`NGO ${!currentStatus ? 'verified' : 'unverified'} successfully!`);
      } else {
        alert(data.message || 'Failed to update verification');
      }
    } catch (error) {
      console.error('Full error:', error);
      alert(`Error updating verification: ${error.message}`);
    }
  };

  const deleteNGO = async (ngoId, ngoName) => {
    if (!window.confirm(`Are you sure you want to DELETE ${ngoName}? This action cannot be undone and will permanently remove this NGO account.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/admin/ngos/${ngoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setNgos(ngos.filter(ngo => ngo._id !== ngoId));
        alert('NGO deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete NGO');
      }
    } catch (error) {
      alert('Error deleting NGO');
      console.error(error);
    }
  };

  const filteredNGOs = ngos.filter(ngo =>
    ngo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ngo.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ngo.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="admin-ngos-loading">Loading NGOs...</div>;
  }

  return (
    <div className="admin-ngos-page">
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
          <button className="admin-nav-btn" onClick={() => navigate('/admin/campaigns')}>
            Campaigns
          </button>
          <button className="admin-nav-btn active">
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
      <div className="admin-ngos-content">
        <div className="admin-ngos-header">
          <h1>NGO Management</h1>
          <p>Manage and verify registered NGOs</p>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            placeholder="Search NGOs by name, email, or organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* NGO Stats */}
        <div className="ngo-stats">
          <div className="stat-box">
            <h3>{ngos.length}</h3>
            <p>Total NGOs</p>
          </div>
          <div className="stat-box">
            <h3>{ngos.filter(n => n.verificationMark).length}</h3>
            <p>Verified NGOs</p>
          </div>
          <div className="stat-box">
            <h3>{ngos.filter(n => !n.verificationMark).length}</h3>
            <p>Unverified NGOs</p>
          </div>
        </div>

        {/* NGOs Table */}
        <div className="ngos-table-container">
          {filteredNGOs.length === 0 ? (
            <div className="no-ngos">
              <p>No NGOs found</p>
            </div>
          ) : (
            <table className="ngos-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNGOs.map((ngo) => (
                  <tr key={ngo._id}>
                    <td>
                      <div className="ngo-name-cell">
                        {ngo.profilePicture ? (
                          <img src={ngo.profilePicture} alt={ngo.name} className="ngo-avatar" />
                        ) : (
                          <div className="ngo-avatar-placeholder">{ngo.name?.[0] || 'N'}</div>
                        )}
                        <span>{ngo.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{ngo.email}</td>
                    <td>{ngo.organizationName || 'N/A'}</td>
                    <td>{ngo.phone || 'N/A'}</td>
                    <td>{new Date(ngo.createdAt).toLocaleDateString()}</td>
                    <td>
                      {ngo.verificationMark ? (
                        <span className="verified-status">✓ Verified</span>
                      ) : (
                        <span className="unverified-status">⚠ Unverified</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`verify-btn ${ngo.verificationMark ? 'remove' : 'add'}`}
                          onClick={() => toggleVerification(ngo._id, ngo.verificationMark)}
                        >
                          {ngo.verificationMark ? 'Remove Verification' : 'Verify NGO'}
                        </button>
                        <button
                          className="delete-ngo-btn"
                          onClick={() => deleteNGO(ngo._id, ngo.name)}
                        >
                          Delete NGO
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNGOs;
