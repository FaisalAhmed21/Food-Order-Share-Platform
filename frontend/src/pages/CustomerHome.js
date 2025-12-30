import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationTracker from '../components/LocationTracker';
import Chatbot from '../components/Chatbot';
import './CustomerHome.css';

export default function CustomerHome() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
        
        // Redirect non-customer users
        if (role === 'restaurant') {
          navigate('/restaurant-dashboard');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    // Fetch menu items grouped by category
    fetchMenuItems();
  }, [navigate]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/restaurants/menu-items/by-category?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
        setFilteredCategories(data.categories);
      } else {
        setError('Failed to load menu items');
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setError('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredCategories(categories);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    
    // Filter categories and items based on search query
    const filtered = categories.map(categoryData => {
      const filteredItems = categoryData.items.filter(item => 
        item.name.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.restaurant.name.toLowerCase().includes(lowerQuery) ||
        categoryData.category.toLowerCase().includes(lowerQuery)
      );
      
      return {
        ...categoryData,
        items: filteredItems
      };
    }).filter(categoryData => categoryData.items.length > 0);
    
    setFilteredCategories(filtered);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredCategories(categories);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setIsLoggedIn(false);
    navigate('/login');
  };

  const handleItemClick = (restaurantId) => {
    navigate(`/restaurant/${restaurantId}`);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Burgers': '🍔',
      'Pizza': '🍕',
      'Biryani': '🍛',
      'Chinese': '🥡',
      'BBQ': '🍖',
      'Chicken': '🍗',
      'Desserts': '🍰',
      'Beverages': '🥤',
      'Mains': '🍽️',
      'Starters': '🥗',
      'Sides': '🍟',
      'Thai': '🍜',
      'Continental': '🍴',
      'Salads': '🥗',
      'Breakfast': '🍳',
      'Snacks': '🍿',
      'Seafood': '🦐',
      'Japanese': '🍣',
      'Soups': '🍲'
    };
    return icons[category] || '🍽️';
  };

  return (
    <div className="customer-home-container">
      {/* Location Tracker for Volunteers */}
      {isLoggedIn && userRole === 'volunteer' && <LocationTracker />}
      
      {/* Navbar - Keep existing navbar */}
      <header className="navbar">
        <div className="navbar-content">
          <h1 className="logo" onClick={() => navigate('/home')}>🍽️ FoodShare</h1>
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
                
                {/* My Orders - For all except volunteers */}
                {userRole && userRole !== 'volunteer' && (
                  <button className="nav-btn" onClick={() => navigate('/my-orders')}>
                    📦 My Orders
                  </button>
                )}
                
                {/* My Donations - For customers and restaurants */}
                {userRole && (userRole === 'customer' || userRole === 'restaurant') && (
                  <button className="nav-btn" onClick={() => navigate('/my-donations')}>
                    💝 My Donations
                  </button>
                )}
                
                <button className="nav-btn" onClick={() => navigate('/profile')}>
                  👤 Profile
                </button>
                <button className="nav-btn logout-btn" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </>
            ) : (
              <>
                <button className="nav-btn" onClick={() => navigate('/login')}>
                  🔐 Login
                </button>
                <button className="nav-btn" onClick={() => navigate('/register')}>
                  📝 Register
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Search Bar Section */}
      <section className="search-bar-section">
        <div className="search-bar-container">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search for food, restaurants, or categories..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={clearSearch}>
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Order food to your door</h1>
          <p className="hero-subtitle">Discover restaurants and dishes near you</p>
        </div>
      </section>

      {/* Main Content - Category-based Food Items */}
      <main className="main-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading delicious food...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={fetchMenuItems} className="retry-btn">Retry</button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="no-items-container">
            <h3>{searchQuery ? 'No results found' : 'No items available at the moment'}</h3>
            <p>{searchQuery ? `Try searching for something else` : 'Check back later for delicious food options!'}</p>
            {searchQuery && (
              <button onClick={clearSearch} className="retry-btn">Clear Search</button>
            )}
          </div>
        ) : (
          <div className="categories-container">
            {filteredCategories.map((categoryData) => (
              <section key={categoryData.category} className="category-section">
                <div className="category-header">
                  <h2 className="category-title">
                    <span className="category-icon">{getCategoryIcon(categoryData.category)}</span>
                    {categoryData.category}
                  </h2>
                  <button 
                    className="view-all-btn"
                    onClick={() => navigate(`/restaurants?category=${categoryData.category}`)}
                  >
                    View All →
                  </button>
                </div>
                
                <div className="items-grid">
                  {categoryData.items.map((item) => (
                    <div 
                      key={item._id} 
                      className="food-item-card"
                      onClick={() => handleItemClick(item.restaurant._id)}
                    >
                      <div className="item-image-container">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="item-image"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/300x200?text=Food+Image';
                          }}
                        />
                        {item.badges && item.badges.length > 0 && (
                          <div className="item-badges">
                            {item.badges.slice(0, 2).map((badge, idx) => (
                              <span key={idx} className="badge">{badge}</span>
                            ))}
                          </div>
                        )}
                        {item.discountPrice && (
                          <div className="discount-badge">
                            {Math.round(((item.price - item.discountPrice) / item.price) * 100)}% OFF
                          </div>
                        )}
                      </div>
                      
                      <div className="item-details">
                        <h3 className="item-name">{item.name}</h3>
                        <p className="item-description">{item.description}</p>
                        
                        <div className="restaurant-info">
                          <span className="restaurant-name">
                            {item.restaurant.name}
                            {item.restaurant.verificationMark && (
                              <span className="verified-badge" title="Verified Restaurant">✅</span>
                            )}
                          </span>
                          {item.restaurant.rating > 0 && (
                            <span className="restaurant-rating">
                              ⭐ {item.restaurant.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        
                        <div className="item-footer">
                          <div className="price-container">
                            {item.discountPrice ? (
                              <>
                                <span className="original-price">৳{item.price}</span>
                                <span className="discount-price">৳{item.discountPrice}</span>
                              </>
                            ) : (
                              <span className="price">৳{item.price}</span>
                            )}
                          </div>
                          {item.rating > 0 && (
                            <span className="item-rating">
                              ⭐ {item.rating.toFixed(1)} ({item.totalOrders})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2024 FoodShare. All rights reserved.</p>
      </footer>

      {/* Chatbot */}
      {isLoggedIn && <Chatbot />}
    </div>
  );
}

