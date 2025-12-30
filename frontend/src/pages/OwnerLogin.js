import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './OwnerLogin.css';

const OwnerLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Check if user is owner or admin
        if (data.user.role === 'owner' || data.user.role === 'admin') {
          // Store token and user data
          localStorage.setItem('ownerToken', data.token);
          localStorage.setItem('ownerData', JSON.stringify(data.user));
          
          // Redirect to dashboard
          navigate('/owner/dashboard');
        } else {
          setError('Access denied. Owner privileges required.');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="owner-login-container">
      <div className="owner-login-card">
        <div className="owner-login-header">
          <h1>Restaurant Owner Login</h1>
          <p>Manage your restaurant and menu items</p>
        </div>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="owner-login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="owner@restaurant.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Logging in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i> Login
              </>
            )}
          </button>
        </form>

        <div className="owner-login-footer">
          <p>
            Don't have an account? 
            <Link to="/owner/register"> Register as Owner</Link>
          </p>
          <Link to="/login" className="customer-link">
            <i className="fas fa-arrow-left"></i> Back to Customer Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
