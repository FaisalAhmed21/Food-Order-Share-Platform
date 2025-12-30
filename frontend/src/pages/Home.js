import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationTracker from '../components/LocationTracker';
import Chatbot from '../components/Chatbot';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('userData');
    
    if (token && userDataStr) {
      setIsLoggedIn(true);
      try {
        const userData = JSON.parse(userDataStr);
        const role = userData.role?.toLowerCase();
        setUserRole(role);
        
        // Redirect Restaurant users to their dashboard
        if (role === 'restaurant') {
          navigate('/restaurant-dashboard');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <div className="home-container">
      {/* Location Tracker for Volunteers */}
      {isLoggedIn && userRole === 'volunteer' && <LocationTracker />}
      
      <header className="navbar">
        <div className="navbar-content">
          <h1 className="logo">🍽️ FoodShare</h1>
          <nav className="nav-links">
            {isLoggedIn ? (
              <>
                {/* Order Food - Only for Customer and Restaurant */}
                {userRole && (userRole === 'customer' || userRole === 'restaurant') && (
                  <button className="nav-btn" onClick={() => navigate('/restaurants')}>
                    🍔 Order Food
                  </button>
                )}
                
                {/* Donate Food - Only for Customers and Restaurants */}
                {userRole && (userRole === 'customer' || userRole === 'restaurant') && (
                  <>
                    <button className="nav-btn" onClick={() => navigate('/donate-food')}>
                      🤝 Donate Food
                    </button>
                    <button className="nav-btn" onClick={() => navigate('/scheduled-pickups')}>
                      📅 Schedules
                    </button>
                  </>
                )}
                
                {/* Customer: Show Nearby Map */}
                {userRole && userRole === 'customer' && (
                  <button className="nav-btn" onClick={() => navigate('/nearby-map')}>
                    🗺️ Nearby Places
                  </button>
                )}
                
                {/* Restaurant: Show NGO Map */}
                {userRole && userRole === 'restaurant' && (
                  <button className="nav-btn" onClick={() => navigate('/restaurant-ngo-map')}>
                    🗺️ Nearby NGOs
                  </button>
                )}
                
                {/* Campaigns - All roles */}
                <button className="nav-btn" onClick={() => navigate('/campaigns')}>
                  🎯 Campaigns
                </button>
                
                {/* NGO quick links */}
                {userRole && userRole === 'ngo' && (
                  <>
                    <button className="nav-btn" onClick={() => navigate('/ngo-map')}>
                      🗺️ Nearby Restaurants
                    </button>
                    <button className="nav-btn" onClick={() => navigate('/ngo/donations')}>
                      💝 Received Donations
                    </button>
                  </>
                )}
                
                {/* Volunteer quick links */}
                {userRole && userRole === 'volunteer' && (
                  <>
                    <button className="nav-btn" onClick={() => navigate('/nearby-places')}>
                      🗺️ Nearby Places
                    </button>
                    <button className="nav-btn" onClick={() => navigate('/my-assignments')}>
                      📦 Assignments
                    </button>
                  </>
                )}
                
                {/* My Orders - Not for Volunteers */}
                {userRole && userRole !== 'volunteer' && (
                  <button className="nav-btn" onClick={() => navigate('/my-orders')}>
                    📦 My Orders
                  </button>
                )}
                <button className="nav-btn" onClick={() => navigate('/profile')}>
                  Profile
                </button>
                <button className="nav-btn nav-btn-primary" onClick={handleLogout}>
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button className="nav-btn" onClick={() => navigate('/login')}>
                  Log In
                </button>
                <button className="nav-btn nav-btn-primary" onClick={() => navigate('/signup')}>
                  Sign Up
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h2>Order & Share Delicious Food</h2>
          <p>Discover amazing meals, connect with food lovers, and share your culinary experiences</p>
          {!isLoggedIn && (
            <div className="hero-buttons">
              <button 
                className="cta-button secondary"
                onClick={() => navigate('/signup')}
              >
                Get Started
              </button>
            </div>
          )}
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

      {/* Nearby Map Feature - Show for logged in Customers */}
      {isLoggedIn && userRole === 'customer' && (
        <section className="nearby-map-promo">
          <div className="promo-content">
            <div className="promo-icon">🗺️</div>
            <div className="promo-text">
              <h3>Discover Nearby Places</h3>
              <p>View restaurants and NGO collection points near you on an interactive map</p>
            </div>
            <button 
              className="promo-btn"
              onClick={() => navigate('/nearby-map')}
            >
              Explore Map
            </button>
          </div>
        </section>
      )}

      {/* Restaurant NGO Map Feature - Show for logged in Restaurants */}
      {isLoggedIn && userRole === 'restaurant' && (
        <section className="nearby-map-promo">
          <div className="promo-content">
            <div className="promo-icon">🗺️</div>
            <div className="promo-text">
              <h3>Find Nearby NGOs</h3>
              <p>Locate NGO collection points near your restaurant for food donation pickups</p>
            </div>
            <button 
              className="promo-btn"
              onClick={() => navigate('/restaurant-ngo-map')}
            >
              View NGO Map
            </button>
          </div>
        </section>
      )}

      {!isLoggedIn && (
        <section className="cta-section">
          <h3>Ready to Share Your First Meal?</h3>
          <button 
            className="cta-button-large"
            onClick={() => navigate('/signup')}
          >
            Sign Up Now
          </button>
        </section>
      )}

      <footer className="footer">
        <p>&copy; 2025 FoodShare. All rights reserved.</p>
      </footer>

      {/* Chatbot - Available for everyone */}
      <Chatbot />
    </div>
  );
}
