import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AdminRestaurantMenu.css';

const AdminRestaurantMenu = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    // Check if admin
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.role !== 'Admin') {
      navigate('/login');
      return;
    }

    fetchRestaurantDetails();
    fetchMenu();
  }, [id, navigate]);

  const fetchRestaurantDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/restaurants/api/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setRestaurant(data.restaurant);
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/restaurants/api/${id}/menu`);
      const data = await response.json();
      
      if (data.success) {
        setMenu(data.menuItems || []);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to DELETE "${itemName}"? This action cannot be undone.`)) {
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
        setMenu(menu.filter(item => item._id !== itemId));
        alert('Menu item deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete menu item');
      }
    } catch (error) {
      alert('Error deleting menu item');
      console.error(error);
    }
  };

  const categories = ['All', ...new Set(menu.map(item => item.category))];
  const filteredMenu = activeCategory === 'All' 
    ? menu 
    : menu.filter(item => item.category === activeCategory);

  if (loading) {
    return (
      <div className="admin-menu-loading">
        <div className="spinner"></div>
        <p>Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="admin-restaurant-menu-page">
      {/* Admin Navbar */}
      <nav className="admin-navbar">
        <div className="admin-nav-left">
          <h2>Admin Panel</h2>
        </div>
        <div className="admin-nav-center">
          <button className="admin-nav-btn" onClick={() => navigate('/admin/dashboard')}>
            Dashboard
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
      <div className="admin-menu-content">
        {/* Restaurant Header */}
        <div className="restaurant-header">
          <button className="back-btn" onClick={() => navigate('/admin/manage-restaurants')}>
            ← Back to Manage Restaurants
          </button>
          {restaurant && (
            <div className="restaurant-info">
              <h1>{restaurant.name}</h1>
              <p className="restaurant-details">
                {restaurant.cuisine} • {restaurant.address}
              </p>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          {categories.map(category => (
            <button
              key={category}
              className={`category-btn ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="menu-section">
          <div className="menu-header">
            <h2>Menu Items ({filteredMenu.length})</h2>
          </div>

          {filteredMenu.length === 0 ? (
            <div className="no-items">
              <p>No menu items in this category</p>
            </div>
          ) : (
            <div className="menu-grid">
              {filteredMenu.map((item) => (
                <div key={item._id} className="menu-item-card">
                  <div className="item-image">
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                    {!item.available && (
                      <div className="unavailable-overlay">Unavailable</div>
                    )}
                  </div>
                  <div className="item-details">
                    <h3>{item.name}</h3>
                    <p className="item-description">{item.description}</p>
                    <div className="item-meta">
                      <span className="item-category">{item.category}</span>
                      <span className="item-price">৳{item.price}</span>
                    </div>
                    {item.badges && item.badges.length > 0 && (
                      <div className="item-badges">
                        {item.badges.map((badge, idx) => (
                          <span key={idx} className={`badge badge-${badge.toLowerCase()}`}>
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="item-actions">
                      <button 
                        className="delete-item-btn"
                        onClick={() => deleteMenuItem(item._id, item.name)}
                      >
                        Delete Item
                      </button>
                    </div>
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

export default AdminRestaurantMenu;
