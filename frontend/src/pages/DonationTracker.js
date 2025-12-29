import React, { useState, useEffect } from 'react';
import './DonationTracker.css';
import { useNavigate } from 'react-router-dom';

const DonationTracker = () => {
  const [stats, setStats] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    foodType: '',
    quantity: '',
    unit: 'servings',
    description: '',
    pickupAddress: '',
    expiryTime: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDonationData();
  }, []);

  const fetchDonationData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch stats
      const statsResponse = await fetch('http://localhost:5000/api/donations/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch donations list
      const donationsResponse = await fetch('http://localhost:5000/api/donations/my-donations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (donationsResponse.ok) {
        const donationsData = await donationsResponse.json();
        setDonations(donationsData.donations);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch donation data');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateDonation = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/donations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormData({
          foodType: '',
          quantity: '',
          unit: 'servings',
          description: '',
          pickupAddress: '',
          expiryTime: ''
        });
        fetchDonationData();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create donation');
      }
    } catch (err) {
      setError('Failed to create donation');
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'available': 'status-available',
      'claimed': 'status-claimed',
      'picked-up': 'status-picked',
      'completed': 'status-completed',
      'expired': 'status-expired'
    };
    return statusClasses[status] || '';
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

  if (loading) {
    return (
      <div className="donation-tracker">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="donation-tracker">
      <div className="tracker-header">
        <h1>Donation Impact Tracker</h1>
        <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ Create Donation'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreateForm && (
        <div className="create-donation-form">
          <h2>Create New Donation</h2>
          <form onSubmit={handleCreateDonation}>
            <div className="form-row">
              <div className="form-group">
                <label>Food Type *</label>
                <input
                  type="text"
                  name="foodType"
                  value={formData.foodType}
                  onChange={handleInputChange}
                  placeholder="e.g., Rice & Curry"
                  required
                />
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <select name="unit" value={formData.unit} onChange={handleInputChange}>
                  <option value="servings">Servings</option>
                  <option value="plates">Plates</option>
                  <option value="kg">Kilograms</option>
                  <option value="pieces">Pieces</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional details about the food..."
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Pickup Address *</label>
              <input
                type="text"
                name="pickupAddress"
                value={formData.pickupAddress}
                onChange={handleInputChange}
                placeholder="Full address for pickup"
                required
              />
            </div>
            <div className="form-group">
              <label>Expiry Time *</label>
              <input
                type="datetime-local"
                name="expiryTime"
                value={formData.expiryTime}
                onChange={handleInputChange}
                required
              />
            </div>
            <button type="submit" className="btn-submit">Create Donation</button>
          </form>
        </div>
      )}

      {stats && (
        <div className="stats-container">
          <div className="stat-card primary">
            <div className="stat-icon">🍽️</div>
            <div className="stat-content">
              <h3>{stats.totalMealsServed.toLocaleString()}</h3>
              <p>Total Meals Donated</p>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">❤️</div>
            <div className="stat-content">
              <h3>{stats.totalBeneficiaries.toLocaleString()}</h3>
              <p>People Helped</p>
            </div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">🏢</div>
            <div className="stat-content">
              <h3>{stats.ngoCount}</h3>
              <p>NGOs Served</p>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>{stats.totalDonations}</h3>
              <p>Total Donations</p>
            </div>
          </div>
        </div>
      )}

      {stats && stats.monthlyData && Object.keys(stats.monthlyData).length > 0 && (
        <div className="chart-container">
          <h2>Monthly Impact</h2>
          <div className="bar-chart">
            {Object.entries(stats.monthlyData).map(([month, data]) => (
              <div key={month} className="bar-group">
                <div className="bar-wrapper">
                  <div 
                    className="bar"
                    style={{ 
                      height: `${Math.min((data.meals / Math.max(...Object.values(stats.monthlyData).map(d => d.meals))) * 200, 200)}px` 
                    }}
                  >
                    <span className="bar-value">{data.meals}</span>
                  </div>
                </div>
                <div className="bar-label">{month}</div>
                <div className="bar-sublabel">{data.count} donations</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && (
        <div className="status-overview">
          <h2>Donation Status Overview</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-badge status-available">{stats.statusCounts.available}</span>
              <span>Available</span>
            </div>
            <div className="status-item">
              <span className="status-badge status-claimed">{stats.statusCounts.claimed}</span>
              <span>Claimed</span>
            </div>
            <div className="status-item">
              <span className="status-badge status-picked">{stats.statusCounts['picked-up']}</span>
              <span>Picked Up</span>
            </div>
            <div className="status-item">
              <span className="status-badge status-completed">{stats.statusCounts.completed}</span>
              <span>Completed</span>
            </div>
            <div className="status-item">
              <span className="status-badge status-expired">{stats.statusCounts.expired}</span>
              <span>Expired</span>
            </div>
          </div>
        </div>
      )}

      <div className="donations-list">
        <h2>Recent Donations</h2>
        {donations.length === 0 ? (
          <p className="no-data">No donations yet. Create your first donation to start making an impact!</p>
        ) : (
          <div className="table-responsive">
            <table className="donations-table">
              <thead>
                <tr>
                  <th>Food Type</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Claimed By</th>
                  <th>Meals Served</th>
                  <th>Beneficiaries</th>
                  <th>Created</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((donation) => (
                  <tr key={donation._id}>
                    <td>
                      <strong>{donation.foodType}</strong>
                      {donation.description && (
                        <div className="donation-desc">{donation.description}</div>
                      )}
                    </td>
                    <td>{donation.quantity} {donation.unit}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(donation.status)}`}>
                        {donation.status}
                      </span>
                    </td>
                    <td>{donation.claimedByName || '-'}</td>
                    <td>{donation.mealsServed || '-'}</td>
                    <td>{donation.beneficiaries || '-'}</td>
                    <td>{formatDate(donation.createdAt)}</td>
                    <td className={new Date(donation.expiryTime) < new Date() ? 'expired-time' : ''}>
                      {formatDate(donation.expiryTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationTracker;
