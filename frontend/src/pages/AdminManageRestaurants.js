import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminManageRestaurants.css';

const AdminManageRestaurants = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Check if admin
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.role !== 'Admin') {
      navigate('/login');
      return;
    }

    fetchRestaurants();
  }, [navigate]);

  const fetchRestaurants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/restaurants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setRestaurants(data.restaurants);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerification = async (restaurantId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'unverify' : 'verify'} this restaurant?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/admin/restaurants/${restaurantId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ verificationMark: !currentStatus })
      });

      const data = await response.json();
      if (data.success) {
        setRestaurants(restaurants.map(r => 
          r._id === restaurantId ? { ...r, verificationMark: !currentStatus } : r
        ));
        alert(`Restaurant ${!currentStatus ? 'verified' : 'unverified'} successfully!`);
      }
    } catch (error) {
      alert('Error updating verification status');
      console.error(error);
    }
  };

  const deleteRestaurant = async (restaurantId, restaurantName) => {
    if (!window.confirm(`Are you sure you want to DELETE "${restaurantName}"? This will also delete all menu items and cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/admin/restaurants/${restaurantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRestaurants(restaurants.filter(r => r._id !== restaurantId));
        alert('Restaurant deleted successfully!');
      }
    } catch (error) {
      alert('Error deleting restaurant');
      console.error(error);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.cuisine?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="admin-manage-restaurants-loading">Loading restaurants...</div>;
  }

  return (
    <div className="admin-manage-restaurants-page">
      {/* Admin Navbar */}
      <nav className="admin-navbar">
        <div className="admin-nav-left">
          <h2>Admin Panel</h2>
        </div>
        <div className="admin-nav-center">
          <button className="admin-nav-btn" onClick={() => navigate('/admin/dashboard')}>
            Dashboard
          </button>
          <button className="admin-nav-btn active">
            Manage Restaurants
          </button>
          <button className="admin-nav-btn" onClick={() => navigate('/admin/campaigns')}>
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
      <div className="admin-manage-restaurants-content">
        <div className="admin-manage-restaurants-header">
          <h1>Manage Restaurants</h1>
          <p>View, verify, and manage all restaurant profiles</p>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by restaurant name, owner, or cuisine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Restaurant Stats */}
        <div className="restaurant-stats">
          <div className="stat-box">
            <h3>{restaurants.length}</h3>
            <p>Total Restaurants</p>
          </div>
          <div className="stat-box">
            <h3>{restaurants.filter(r => r.verificationMark).length}</h3>
            <p>Verified</p>
          </div>
          <div className="stat-box">
            <h3>{restaurants.filter(r => !r.verificationMark).length}</h3>
            <p>Unverified</p>
          </div>
        </div>

        {/* Restaurants Table */}
        <div className="restaurants-table-container">
          <table className="restaurants-table">
            <thead>
              <tr>
                <th>Restaurant Name</th>
                <th>Owner</th>
                <th>Cuisine</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No restaurants found</td>
                </tr>
              ) : (
                filteredRestaurants.map((restaurant) => (
                  <tr key={restaurant._id}>
                    <td>
                      <div className="restaurant-name-cell">
                        <strong>{restaurant.name}</strong>
                        {restaurant.verificationMark && (
                          <span className="verified-badge" style={{marginLeft: '8px', fontSize: '14px'}} title="Verified Restaurant">✅</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {restaurant.owner ? (
                        <div>
                          <div>{restaurant.owner.name}</div>
                          <div className="owner-email">{restaurant.owner.email}</div>
                        </div>
                      ) : (
                        <span className="no-owner">No Owner</span>
                      )}
                    </td>
                    <td>{restaurant.cuisine || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${restaurant.isOpen ? 'open' : 'closed'}`}>
                        {restaurant.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td>
                      {restaurant.verificationMark ? (
                        <span className="verified-badge">✅ Verified</span>
                      ) : (
                        <span className="unverified-badge">Not Verified</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="verify-btn"
                          onClick={() => toggleVerification(restaurant._id, restaurant.verificationMark)}
                        >
                          {restaurant.verificationMark ? 'Unverify' : 'Verify'}
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => deleteRestaurant(restaurant._id, restaurant.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminManageRestaurants;
