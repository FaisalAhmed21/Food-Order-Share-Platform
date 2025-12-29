import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Restaurants.css';

const Restaurants = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    distance: 10,
    priceRange: [0, 1000],
    dietary: [],
    rating: 0,
    deliveryTime: 60
  });
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Check if user is a Restaurant and redirect to dashboard
  useEffect(() => {
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        if (userData.role?.toLowerCase() === 'restaurant') {
          navigate('/restaurant-dashboard');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [navigate]);

  const fetchRestaurants = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add filters
      if (searchQuery) params.append('search', searchQuery);
      if (filters.rating > 0) params.append('minRating', filters.rating);
      if (filters.deliveryTime < 60) params.append('maxDeliveryTime', filters.deliveryTime);
      if (filters.dietary.length > 0) params.append('dietary', filters.dietary.join(','));
      if (sortBy) params.append('sortBy', sortBy);
      
      // Pagination
      params.append('page', 1);
      params.append('limit', 100); // Increased to show more restaurants

      const response = await fetch(`http://localhost:5000/api/restaurants/api/all?${params.toString()}`);
      const data = await response.json();
      
      console.log('Fetched restaurants:', data.restaurants?.length || 0, 'restaurants');
      console.log('Restaurant names:', data.restaurants?.map(r => r.name) || []);
      console.log('BFC found:', data.restaurants?.some(r => r.name.includes('BFC')) ? 'YES' : 'NO');
      
      if (data.success) {
        setRestaurants(data.restaurants || []);
      } else {
        setRestaurants([]);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setRestaurants([]);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/restaurants/api/search?q=${searchQuery}`);
      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  useEffect(() => {
    // Fetch restaurants (allow browsing as guest)
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRestaurants();
  };

  const toggleDietaryFilter = (diet) => {
    setFilters(prev => ({
      ...prev,
      dietary: prev.dietary.includes(diet)
        ? prev.dietary.filter(d => d !== diet)
        : [...prev.dietary, diet]
    }));
  };

  const removeFilter = (filterType, value) => {
    if (filterType === 'dietary') {
      setFilters(prev => ({
        ...prev,
        dietary: prev.dietary.filter(d => d !== value)
      }));
    }
  };

  const clearAllFilters = () => {
    setFilters({
      distance: 10,
      priceRange: [0, 1000],
      dietary: [],
      rating: 0,
      deliveryTime: 60
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return '#4CAF50';
      case 'Closed': return '#f44336';
      case 'Accepting orders': return '#FF9800';
      default: return '#999';
    }
  };

  return (
    <div className="restaurants-container">
      {/* Header */}
      <div className="restaurants-header">
        <h1>Find Your Favorite Food</h1>
        <div className="header-actions">
          <button className="orders-btn" onClick={() => navigate('/my-orders')}>
            My Orders
          </button>
          <button className="back-btn" onClick={() => navigate('/home')}>
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search restaurants, cuisines, or dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        {/* Autocomplete Suggestions */}
        {suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="suggestion-item"
                onClick={() => {
                  setSearchQuery(suggestion.name);
                  setSuggestions([]);
                  fetchRestaurants();
                }}
              >
                <span className="suggestion-icon">{suggestion.type === 'restaurant' ? '🏪' : '🍽️'}</span>
                <span className="suggestion-name">{suggestion.name}</span>
                <span className="suggestion-type">{suggestion.type}</span>
              </div>
            ))}
          </div>
        )}

        <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
          Filters {(filters.dietary.length > 0 || filters.rating > 0) && `(${filters.dietary.length + (filters.rating > 0 ? 1 : 0)})`}
        </button>
      </div>

      {/* Active Filter Chips */}
      {(filters.dietary.length > 0 || filters.rating > 0 || filters.deliveryTime < 60) && (
        <div className="active-filters">
          {filters.dietary.map(diet => (
            <span key={diet} className="filter-chip" onClick={() => removeFilter('dietary', diet)}>
              {diet} ✕
            </span>
          ))}
          {filters.rating > 0 && (
            <span className="filter-chip" onClick={() => setFilters(prev => ({ ...prev, rating: 0 }))}>
              Rating ≥ {filters.rating}★ ✕
            </span>
          )}
          {filters.deliveryTime < 60 && (
            <span className="filter-chip" onClick={() => setFilters(prev => ({ ...prev, deliveryTime: 60 }))}>
              Under {filters.deliveryTime} mins ✕
            </span>
          )}
          <button className="clear-filters-btn" onClick={clearAllFilters}>Clear All</button>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Distance (km): {filters.distance}</label>
            <input
              type="range"
              min="1"
              max="20"
              value={filters.distance}
              onChange={(e) => setFilters(prev => ({ ...prev, distance: parseInt(e.target.value) }))}
            />
          </div>

          <div className="filter-group">
            <label>Delivery Time (max): {filters.deliveryTime} mins</label>
            <input
              type="range"
              min="15"
              max="90"
              step="15"
              value={filters.deliveryTime}
              onChange={(e) => setFilters(prev => ({ ...prev, deliveryTime: parseInt(e.target.value) }))}
            />
          </div>

          <div className="filter-group">
            <label>Minimum Rating: {filters.rating}★</label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={filters.rating}
              onChange={(e) => setFilters(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
            />
          </div>

          <div className="filter-group">
            <label>Dietary Preferences:</label>
            <div className="dietary-options">
              {['Vegan', 'Vegetarian', 'Halal', 'Gluten-Free', 'Kosher'].map(diet => (
                <button
                  key={diet}
                  className={`dietary-btn ${filters.dietary.includes(diet) ? 'active' : ''}`}
                  onClick={() => toggleDietaryFilter(diet)}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          <button className="apply-filters-btn" onClick={() => { setShowFilters(false); fetchRestaurants(); }}>
            Apply Filters
          </button>
        </div>
      )}

      {/* Sort Options */}
      <div className="sort-section">
        <span>Sort by:</span>
        {['popular', 'deliveryTime', 'rating', 'price'].map(sort => (
          <button
            key={sort}
            className={`sort-chip ${sortBy === sort ? 'active' : ''}`}
            onClick={() => setSortBy(sort)}
          >
            {sort === 'popular' && 'Most Popular'}
            {sort === 'deliveryTime' && 'Fastest'}
            {sort === 'rating' && 'Highest Rated'}
            {sort === 'price' && 'Lowest Price'}
          </button>
        ))}

      </div>

      {/* Restaurant Grid */}
      <div className="restaurants-grid">
        {restaurants.length > 0 ? (
          restaurants.map(restaurant => (
            <div
              key={restaurant._id}
              className="restaurant-card"
              onClick={() => {
                // Check if user has restaurant role
                const userData = localStorage.getItem('userData');
                if (userData) {
                  try {
                    const user = JSON.parse(userData);
                    if (user.role === 'Restaurant' || user.role === 'restaurant') {
                      navigate('/restaurant-dashboard');
                      return;
                    }
                  } catch (e) {
                    console.error('Error parsing user data:', e);
                  }
                }
                navigate(`/restaurant/${restaurant._id}`);
              }}
            >
              <div className="restaurant-image">
                <img 
                  src={restaurant.image?.startsWith('http') ? restaurant.image : `http://localhost:5000${restaurant.image}`} 
                  alt={restaurant.name}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200'; }}
                />
                {restaurant.badges && restaurant.badges.length > 0 && (
                  <div className="badges-wrapper">
                    {restaurant.badges.map(badge => (
                      <span key={badge} className={`badge badge-${badge.toLowerCase().replace(/\s+/g, '-').replace(/%/g, '')}`}>{badge}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="restaurant-info">
                <div className="restaurant-name-row">
                  <h3>{restaurant.name}</h3>
                  {restaurant.verificationMark && (
                    <span className="verified-badge" title="Verified Restaurant">✓</span>
                  )}
                </div>
                <p className="cuisine">{restaurant.cuisine}</p>

                <div className="restaurant-meta">
                  <span className="rating">⭐ {restaurant.rating || 4.5}</span>
                  <span className="delivery-time">🕒 {restaurant.deliveryTime || 30} mins</span>
                  <span className="price-range">💰 {restaurant.priceRange || '$$'}</span>
                </div>

                <div className="restaurant-status">
                  <span
                    className="status-indicator"
                    style={{ backgroundColor: getStatusColor(restaurant.status || 'Open') }}
                  ></span>
                  <span className="status-text">{restaurant.status || 'Open'}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <h2>No restaurants found</h2>
            <p>Try adjusting your filters or search for something else</p>
            <button className="expand-search-btn" onClick={clearAllFilters}>
              Expand Search Area
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Restaurants;
