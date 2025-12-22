import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="navbar-content">
          <h1 className="logo">🍽️ FoodShare</h1>
          <nav className="nav-links">
            <button className="nav-btn" onClick={() => navigate('/login')}>
              Log In
            </button>
            <button className="nav-btn nav-btn-primary" onClick={() => navigate('/signup')}>
              Sign Up
            </button>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h2>Order & Share Delicious Food</h2>
          <p>Discover amazing meals, connect with food lovers, and share your culinary experiences</p>
          <button 
            className="cta-button"
            onClick={() => navigate('/signup')}
          >
            Get Started
          </button>
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

      <section className="cta-section">
        <h3>Ready to Share Your First Meal?</h3>
        <button 
          className="cta-button-large"
          onClick={() => navigate('/signup')}
        >
          Sign Up Now
        </button>
      </section>

      <footer className="footer">
        <p>&copy; 2025 FoodShare. All rights reserved.</p>
      </footer>
    </div>
  );
}
