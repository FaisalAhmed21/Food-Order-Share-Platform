import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AdminRestaurantDetail.css';

const AdminRestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.role !== 'Admin') {
      navigate('/login');
      return;
    }

    fetchRestaurantDetails();
  }, [id, navigate]);

  const fetchRestaurantDetails = async () => {
    try {
      const [restaurantRes, menuRes] = await Promise.all([
        fetch(`http://localhost:5000/api/restaurants/${id}`),
        fetch(`http://localhost:5000/api/restaurants/${id}/menu`)
      ]);

      const restaurantData = await restaurantRes.json();
      const menuData = await menuRes.json();

      if (restaurantData.success) {
        setRestaurant(restaurantData.restaurant);
      }

      if (menuData.success) {
        setMenuItems(menuData.menuItems || []);
      }
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!window.confirm(`Are you sure you want to DELETE ${restaurant.name}? This action cannot be undone and will affect the restaurant owner.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/admin/restaurants/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('Restaurant deleted successfully!');
        navigate('/admin/restaurants');
      } else {
        alert(data.message || 'Failed to delete restaurant');
      }
    } catch (error) {
      alert('Error deleting restaurant');
      console.error(error);
    }
  };

  const handleDeleteMenuItem = async (itemId, itemName) => {
    if (!window.confirm(`Delete menu item: ${itemName}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/admin/menu-items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('Menu item deleted successfully!');
        fetchRestaurantDetails(); // Refresh
      } else {
        alert(data.message || 'Failed to delete menu item');
      }
    } catch (error) {
      alert('Error deleting menu item');
      console.error(error);
    }
  };

  const toggleVerification = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/restaurants/${id}/verify`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verificationMark: !restaurant.verificationMark
        })
      });

      const data = await response.json();

      if (data.success) {
        setRestaurant({ ...restaurant, verificationMark: !restaurant.verificationMark });
        alert(`Restaurant ${!restaurant.verificationMark ? 'verified' : 'unverified'} successfully!`);
      } else {
        alert(data.message || 'Failed to update verification');
      }
    } catch (error) {
      alert('Error updating verification');
      console.error(error);
    }
  };

  if (loading) {
    return <div className="admin-detail-loading">Loading...</div>;
  }

  if (!restaurant) {
    return <div className="admin-detail-error">Restaurant not found</div>;
  }

  return (
    <div className="admin-restaurant-detail-page">
      {/* Admin Navbar */}
      <nav className="admin-navbar">
        <div className="admin-nav-left">
          <h2>Admin Panel</h2>
        </div>
        <div className="admin-nav-center">
          <button className="admin-nav-btn" onClick={() => navigate('/admin/dashboard')}>
            Dashboard
          </button>
          <button className="admin-nav-btn" onClick={() => navigate('/admin/restaurants')}>
            Order Food View
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
      <div className="admin-detail-content">
        {/* Restaurant Info */}
        <div className="restaurant-info-section">
          <div className="restaurant-header-admin">
            <div>
              <h1>{restaurant.name}</h1>
              {restaurant.verificationMark && <span className="verified-badge">✅ Verified</span>}
            </div>
            <div className="admin-actions">
              <button className="verify-btn" onClick={toggleVerification}>
                {restaurant.verificationMark ? 'Remove Verification' : 'Verify Restaurant'}
              </button>
              <button className="delete-restaurant-btn" onClick={handleDeleteRestaurant}>
                Delete Restaurant
              </button>
            </div>
          </div>

          <div className="restaurant-details-grid">
            <div className="detail-card">
              <h3>Location & Contact</h3>
              <p><strong>Address:</strong> {typeof restaurant.address === 'object' ? restaurant.address?.fullAddress || restaurant.address?.area || 'Address not provided' : restaurant.address || 'N/A'}</p>
              <p><strong>Phone:</strong> {restaurant.phone || 'N/A'}</p>
              <p><strong>Email:</strong> {restaurant.email || 'N/A'}</p>
            </div>

            <div className="detail-card">
              <h3>Restaurant Info</h3>
              <p><strong>Cuisine:</strong> {restaurant.cuisine || 'N/A'}</p>
              <p><strong>Rating:</strong> {restaurant.rating || 'N/A'}</p>
              <p><strong>Owner:</strong> {restaurant.owner?.name || 'N/A'}</p>
            </div>

            <div className="detail-card">
              <h3>📄 License Information</h3>
              <p><strong>Trade License Number:</strong> {restaurant.verificationDocuments?.[0]?.tradeLicenseNumber || 'N/A'}</p>
              <p><strong>Food Safety License:</strong> {restaurant.verificationDocuments?.[0]?.foodSafetyLicense || 'N/A'}</p>
              <p><strong>Business Registration:</strong> {restaurant.verificationDocuments?.[0]?.businessRegistration || 'N/A'}</p>
              <p><strong>TIN Number:</strong> {restaurant.verificationDocuments?.[0]?.tinNumber || 'N/A'}</p>
              {restaurant.verificationDocuments?.[0]?.documentPDF && (
                <a 
                  href={`http://localhost:5000${restaurant.verificationDocuments[0].documentPDF}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="pdf-link"
                >
                  📄 View License PDF Document
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="menu-section-admin">
          <h2>📋 Menu Items ({menuItems.length})</h2>
          
          {menuItems.length === 0 ? (
            <div className="no-menu-items">No menu items found</div>
          ) : (
            <div className="menu-grid-admin">
              {menuItems.map((item) => (
                <div key={item._id} className="menu-item-card-admin">
                  <div className="menu-item-image-admin">
                    {item.image ? (
                      <img 
                        src={item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`} 
                        alt={item.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="40"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="no-item-image">No Image</div>
                    )}
                  </div>
                  <div className="menu-item-info-admin">
                    <h3>{item.name}</h3>
                    <p className="item-description">{item.description || 'No description'}</p>
                    <p className="item-price">৳{item.price?.toFixed(2)}</p>
                    <p className="item-category">Category: {item.category || 'Uncategorized'}</p>
                    <button 
                      className="delete-item-btn"
                      onClick={() => handleDeleteMenuItem(item._id, item.name)}
                    >
                      Delete Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRestaurantDetail;
