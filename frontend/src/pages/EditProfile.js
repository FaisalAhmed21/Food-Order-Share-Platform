import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EditProfile.css';

const EditProfile = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    profilePicture: null,
    organizationName: '',
    documents: null
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    // Load user data from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setProfileData({
          name: parsedUser.name || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || '',
          profilePicture: null,
          organizationName: parsedUser.organizationName || '',
          documents: null
        });
        // Set preview image to current profile picture if it exists
        if (parsedUser.profilePicture) {
          setPreviewImage(parsedUser.profilePicture);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load user data');
      }
    }
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];
    if (file) {
      setProfileData((prev) => ({
        ...prev,
        [name]: file
      }));
      
      // If it's a profile picture, create a preview
      if (name === 'profilePicture') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No token found. Please log in again.');
      return;
    }

    const formData = new FormData();
    formData.append('name', profileData.name);
    formData.append('email', profileData.email);
    formData.append('phone', profileData.phone);
    
    // Add role-specific fields
    if (user?.role === 'Restaurant' || user?.role === 'NGO') {
      formData.append('organizationName', profileData.organizationName);
      if (profileData.documents && profileData.documents instanceof File) {
        formData.append('documents', profileData.documents);
      }
    }
    
    // Profile picture is for all roles
    if (profileData.profilePicture && profileData.profilePicture instanceof File) {
      formData.append('profilePicture', profileData.profilePicture);
    }

    try {
      const response = await fetch('http://localhost:5000/api/profile/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Profile updated successfully!');
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      } else {
        setError(data.message || 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('An error occurred while updating the profile.');
    }
  };

  return (
    <div className="edit-profile-container">
      <h2>Edit Profile</h2>
      {loading && <p>Loading...</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        {/* Basic Fields - All Roles */}
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={profileData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={profileData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone:</label>
          <input
            type="text"
            id="phone"
            name="phone"
            placeholder="Enter your phone number"
            value={profileData.phone}
            onChange={handleChange}
          />
        </div>

        {/* Profile Picture - All Roles */}
        <div className="form-group">
          <label htmlFor="profilePicture">Profile Picture:</label>
          
          {/* Display current or preview image */}
          {previewImage && (
            <div className="profile-picture-preview">
              <img 
                src={previewImage} 
                alt="Profile Preview"
                onError={(e) => {
                  console.error('Image failed to load:', previewImage);
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23ddd" width="150" height="150"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          )}
          
          <input
            type="file"
            id="profilePicture"
            name="profilePicture"
            accept="image/*"
            onChange={handleFileChange}
          />
          <small>Accepted formats: JPG, PNG, GIF (Max 5MB)</small>
        </div>

        {/* Organization-Specific Fields - Restaurant & NGO Only */}
        {(user?.role === 'Restaurant' || user?.role === 'NGO') && (
          <>
            <div className="form-divider">
              <h3>{user?.role} Information</h3>
            </div>
            <div className="form-group">
              <label htmlFor="organizationName">Organization Name:</label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                placeholder={`Enter your ${user?.role.toLowerCase()} name`}
                value={profileData.organizationName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="documents">Upload Documents/License:</label>
              <input
                type="file"
                id="documents"
                name="documents"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <small>Accepted formats: PDF, DOC, DOCX (Max 5MB)</small>
            </div>
          </>
        )}

        <button type="submit" className="submit-btn">Update Profile</button>
      </form>
    </div>
  );
};

export default EditProfile;