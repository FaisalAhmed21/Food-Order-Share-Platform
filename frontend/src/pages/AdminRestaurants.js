import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminRestaurants.css';

const AdminRestaurants = () => {
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
      const response = await fetch('http://localhost:5000/api/restaurants/all?page=1&limit=100');
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

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.cuisine?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="admin-restaurants-loading">Loading restaurants...</div>;
  }

  return (
    <div className="admin-restaurants-page">
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
            Order Food View
          </button>
          <button className="admin-nav-btn" onClick={() => navigate('/admin/manage-restaurants')}>
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
      <div className="admin-restaurants-content">
        <div className="admin-restaurants-header">
          <h1>Restaurants Overview</h1>
          <p>Browse all restaurants (Admin View - No ordering functionality)</p>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            placeholder="Search restaurants by name or cuisine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Restaurants Grid */}
        <div className="restaurants-grid">
          {filteredRestaurants.length === 0 ? (
            <div className="no-restaurants">
              <p>No restaurants found</p>
            </div>
          ) : (
            filteredRestaurants.map((restaurant) => (
              <div key={restaurant._id} className="restaurant-card-admin">
                <div className="restaurant-image-admin">
                  {restaurant.image ? (
                    <img src={restaurant.image} alt={restaurant.name} />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                  {restaurant.verificationMark && (
                    <span className="verified-badge-admin">✅ Verified</span>
                  )}
                </div>
                <div className="restaurant-info-admin">
                  <h3>{restaurant.name}</h3>
                  <p className="cuisine">{restaurant.cuisine || 'Various'}</p>
                  <p className="address">{typeof restaurant.address === 'object' ? restaurant.address?.fullAddress || restaurant.address?.area || 'Address not provided' : restaurant.address || 'Address not provided'}</p>
                  <div className="restaurant-meta">
                    <span>{restaurant.rating || 'N/A'}</span>
                    <span>{restaurant.phone || 'N/A'}</span>
                  </div>
                  <button 
                    className="view-menu-btn-admin"
                    onClick={() => navigate(`/admin/restaurant/${restaurant._id}`)}
                  >
                    View Menu & Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRestaurants;
