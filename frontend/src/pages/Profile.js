import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user data from localStorage
    const loadUserData = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Convert relative URLs to absolute URLs for profile picture
        if (parsedUser.profilePicture && parsedUser.profilePicture.startsWith('/uploads/')) {
          parsedUser.profilePicture = `http://localhost:5000${parsedUser.profilePicture}`;
        }
        setUser(parsedUser);
        setLoading(false);
      } else {
        // Redirect to login if no user found
        navigate('/login');
      }
    };

    loadUserData();

    // Listen for storage changes (when updated from another tab/window)
    const handleStorageChange = () => {
      loadUserData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleEditClick = () => {
    navigate('/edit-profile');
  };

  if (loading) {
    return <div className="profile-loading">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-container">
      <header className="profile-navbar">
        <div className="navbar-content">
          <h1 className="logo">🍽️ FoodShare</h1>
          <nav className="nav-links">
            <button className="nav-btn" onClick={() => navigate('/')}>
              Home
            </button>
            <button className="nav-btn" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </header>

      <div className="profile-wrapper">
        <div className="profile-header">
          <h2>My Profile</h2>
        </div>

        <div className="profile-content">
          <div className="profile-left">
            <div className="profile-picture">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" />
              ) : (
                <div className="placeholder-image">👤</div>
              )}
            </div>
          </div>

          <div className="profile-right">
            <div className="profile-info">
              <div className="info-group">
                <label>Name:</label>
                <p>{user.name || 'Not set'}</p>
              </div>

              <div className="info-group">
                <label>Email:</label>
                <p>{user.email}</p>
              </div>

              <div className="info-group">
                <label>Role:</label>
                <p className="role-badge">{user.role}</p>
              </div>

              <div className="info-group">
                <label>Phone:</label>
                <p>{user.phone || 'Not set'}</p>
              </div>

              {(user.role === 'Restaurant' || user.role === 'NGO') && (
                <>
                  <div className="info-group">
                    <label>Organization Name:</label>
                    <p>{user.organizationName || 'Not set'}</p>
                  </div>

                  <div className="info-group">
                    <label>Verification Status:</label>
                    <p>
                      {user.verificationMark ? (
                        <span className="verified">✓ Verified</span>
                      ) : (
                        <span className="pending">⏳ Pending Review</span>
                      )}
                    </p>
                  </div>
                </>
              )}

              <button className="edit-btn" onClick={handleEditClick}>
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;