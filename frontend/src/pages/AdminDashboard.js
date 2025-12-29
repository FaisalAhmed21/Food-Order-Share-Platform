import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Load admin data from localStorage
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      
      // Check if user is admin
      if (parsedUser.role !== 'Admin') {
        navigate('/login');
        return;
      }
      
      setAdmin(parsedUser);
      setLoading(false);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Admin Navbar */}
      <nav className="admin-navbar">
        <div className="admin-nav-left">
          <h2>Admin Panel</h2>
        </div>
        <div className="admin-nav-center">
          <button 
            className={`admin-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Home
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/manage-restaurants')}
          >
            Manage Restaurants
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/campaigns')}
          >
            Campaigns
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/ngos')}
          >
            NGO Management
          </button>
        </div>
        <div className="admin-nav-right">
          <div className="admin-profile-info">
            <span className="admin-name">{admin.name}</span>
            <span className="admin-badge">Admin</span>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Admin Content */}
      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="admin-home-content">
            <section className="hero">
              <div className="hero-content">
                <h2>Order & Share Delicious Food</h2>
                <p>Discover amazing meals, connect with food lovers, and share your culinary experiences</p>
              </div>
              <div className="hero-image">
                <div className="food-emoji">🍕 🍔 🍱 🍜</div>
              </div>
            </section>

            <section className="features">
              <h3>Why Choose FoodShare?</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🛒</div>
                  <h4>Easy Ordering</h4>
                  <p>Browse and order from your favorite restaurants in seconds</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">👥</div>
                  <h4>Share & Connect</h4>
                  <p>Share meals with friends and meet food enthusiasts</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">⭐</div>
                  <h4>Quality Guaranteed</h4>
                  <p>All meals are verified and reviewed by our community</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">💰</div>
                  <h4>Great Deals</h4>
                  <p>Enjoy exclusive discounts and offers daily</p>
                </div>
              </div>
            </section>

            <section className="nearby-map-promo">
              <div className="promo-content">
                <div className="promo-icon">🗺️</div>
                <div className="promo-text">
                  <h3>Admin Control Panel</h3>
                  <p>Manage restaurants, NGOs, campaigns and all platform activities from your dashboard</p>
                </div>
                <button 
                  className="promo-btn"
                  onClick={() => navigate('/admin/restaurants')}
                >
                  View Restaurants
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
