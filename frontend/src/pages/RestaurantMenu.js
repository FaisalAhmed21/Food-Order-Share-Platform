import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './RestaurantMenu.css';

const RestaurantMenu = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customization, setCustomization] = useState({});
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemReviews, setItemReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [notification, setNotification] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Check if user has restaurant role - show management dashboard instead
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'Restaurant' || user.role === 'restaurant') {
          // Restaurant users should see management dashboard, not ordering interface
          navigate('/restaurant-dashboard');
          return;
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    fetchRestaurantDetails();
    fetchMenu();
    
    // WebSocket connection for real-time updates
    const ws = new WebSocket('ws://localhost:5000');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ITEM_AVAILABILITY') {
        handleAvailabilityUpdate(data);
      }
    };

    return () => ws.close();
  }, [id]);

  const fetchRestaurantDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/restaurants/${id}`);
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
      const response = await fetch(`http://localhost:5000/api/restaurants/${id}/menu`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Menu items received:', data.menuItems);
        data.menuItems.forEach(item => {
          console.log(`Item: ${item.name}, Badges:`, item.badges);
        });
        setMenu(data.menuItems || []);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const handleAvailabilityUpdate = (data) => {
    if (data.restaurantId === id) {
      setMenu(prevMenu => prevMenu.map(item => 
        item._id === data.itemId ? { ...item, available: data.available } : item
      ));

      if (data.available) {
        showNotification(`${data.itemName} is back in stock! 🎉`);
      } else {
        showNotification(`${data.itemName} is now sold out`);
      }
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const fetchItemReviews = async (menuItemId) => {
    setLoadingReviews(true);
    try {
      const response = await fetch(`http://localhost:5000/api/tracking/menu-item/${menuItemId}/reviews`);
      const data = await response.json();
      if (data.success) {
        setItemReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={`star ${star <= rating ? 'filled' : ''}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const openItemModal = (item) => {
    setSelectedItem(item);
    setCustomization({
      size: (item.sizes && item.sizes.length > 0) ? item.sizes[0].name : null,
      spiceLevel: 'medium',
      addons: [],
      extras: {},
      instructions: ''
    });
    setItemReviews([]);
    setShowItemModal(true);
    fetchItemReviews(item._id);
  };

  const calculateItemPrice = () => {
    if (!selectedItem) return 0;
    let price = selectedItem.price;

    // Add size price difference
    if (customization.size && selectedItem.sizes) {
      const sizeOption = selectedItem.sizes.find(s => s.name === customization.size);
      if (sizeOption) price = sizeOption.price;
    }

    // Add addons
    customization.addons.forEach(addon => {
      const addonItem = selectedItem.addons?.find(a => a.name === addon);
      if (addonItem) price += addonItem.price;
    });

    // Add extras
    Object.entries(customization.extras).forEach(([extra, quantity]) => {
      const extraItem = selectedItem.extras?.find(e => e.name === extra);
      if (extraItem) price += extraItem.price * quantity;
    });

    return price;
  };

  const addToCart = () => {
    const cartItem = {
      ...selectedItem,
      customization: { ...customization },
      finalPrice: calculateItemPrice(),
      quantity: 1,
      cartId: Date.now()
    };

    setCart(prev => [...prev, cartItem]);
    showNotification(`${selectedItem.name} added to cart! 🛒`);
    setShowItemModal(false);
    
    // Auto-save cart
    saveCart([...cart, cartItem]);
  };

  const saveCart = async (cartData) => {
    try {
      await fetch('http://localhost:5000/api/cart/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ cart: cartData, restaurantId: id })
      });
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const updateCartQuantity = (cartId, change) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const editCartItem = (cartId) => {
    const item = cart.find(i => i.cartId === cartId);
    if (item) {
      setSelectedItem(item);
      setCustomization(item.customization);
      setShowItemModal(true);
      removeFromCart(cartId);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
  };

  const categories = ['All', ...new Set(menu.map(item => item.category))];

  const filteredMenu = activeCategory === 'All' 
    ? menu 
    : menu.filter(item => item.category === activeCategory);

  if (!restaurant) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading restaurant...</p>
      </div>
    );
  }

  return (
    <div className="restaurant-menu-container">
      {/* Notification Toast */}
      {notification && (
        <div className="notification-toast">{notification}</div>
      )}

      {/* Restaurant Header */}
      <div className="restaurant-hero">
        <img 
          src={restaurant.heroImage?.startsWith('http') ? restaurant.heroImage : restaurant.image?.startsWith('http') ? restaurant.image : `http://localhost:5000${restaurant.image || restaurant.heroImage}`}
          alt={restaurant.name}
          className="hero-image"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/1200x400'; }}
        />
        <div className="hero-overlay">
          <button className="back-btn" onClick={() => navigate('/restaurants')}>
            ← Back
          </button>
          <div className="restaurant-name-row">
            <h1 className="restaurant-name">{restaurant.name}</h1>
            {restaurant.verificationMark && (
              <span className="verified-badge" title="Verified Restaurant">✅</span>
            )}
          </div>
          <p className="restaurant-address">📍 {restaurant.address?.fullAddress || restaurant.address?.area || 'Address not available'}</p>
          <div className="restaurant-stats">
            <span>⭐ {restaurant.rating || 4.5}</span>
            <span>🕒 {restaurant.deliveryTime || 30} mins</span>
            <span>💰 Delivery: ${restaurant.deliveryFee || 2}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="action-btn">Call</button>
        <button 
          className={`action-btn ${isFavorite ? 'favorite' : ''}`}
          onClick={() => setIsFavorite(!isFavorite)}
        >
          {isFavorite ? '❤️' : '🤍'} Favorite
        </button>
        <button className="action-btn">Donate Surplus</button>
        <button className="action-btn">Reviews</button>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      <div className="menu-section">
        <div className="menu-list">
          {filteredMenu.map(item => (
            <div 
              key={item._id} 
              className={`menu-item ${!item.available ? 'unavailable' : ''}`}
              onClick={() => item.available && openItemModal(item)}
            >
              <div className="item-image">
                <img 
                  src={item.image?.startsWith('http') ? item.image : `http://localhost:5000${item.image}`}
                  alt={item.name}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                />
                {item.badges && item.badges.length > 0 && (
                  <div className="badges-container">
                    {item.badges.map(badge => (
                      <span key={badge} className={`item-badge badge-${badge.toLowerCase().replace(/\s+/g, '-')}`}>
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
                {!item.available && (
                  <div className="sold-out-overlay">
                    <span>SOLD OUT</span>
                  </div>
                )}
              </div>

              <div className="item-details">
                <div className="item-header">
                  <h3>{item.name}</h3>
                  <span className={`stock-badge ${item.available ? 'in-stock' : 'out-of-stock'}`}>
                    {item.available ? '✓ In Stock' : '✗ Out of Stock'}
                  </span>
                </div>
                {item.rating > 0 && (
                  <div className="item-rating">
                    {renderStars(Math.round(item.rating))}
                    <span className="rating-count">({item.totalReviews || 0})</span>
                  </div>
                )}
                <p className="item-description">{item.description}</p>
                
                <div className="item-icons">
                  {item.dietary && item.dietary.map(diet => (
                    <span key={diet} className="dietary-icon" title={diet}>
                      {diet === 'vegan' && '🌱'}
                      {diet === 'vegetarian' && '🥗'}
                      {diet === 'gluten-free' && '🌾'}
                      {diet === 'halal' && '☪️'}
                    </span>
                  ))}
                  {item.spiceLevel && (
                    <span className="spice-icon">
                      {'🌶️'.repeat(item.spiceLevel)}
                    </span>
                  )}
                </div>

                <div className="item-footer">
                  <span className="item-price">৳{item.price}</span>
                  {item.available && (
                    <button className="add-btn" onClick={(e) => { e.stopPropagation(); openItemModal(item); }}>
                      + Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Sidebar */}
        {cart.length > 0 && (
          <div className="cart-sidebar">
            <h2>Your Cart ({cart.length})</h2>
            
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.cartId} className="cart-item">
                  <div className="cart-item-header">
                    <h4>{item.name}</h4>
                    <button className="remove-btn" onClick={() => removeFromCart(item.cartId)}>
                      🗑️
                    </button>
                  </div>

                  {item.customization.size && (
                    <p className="customization-detail">Size: {item.customization.size}</p>
                  )}
                  {item.customization.addons.length > 0 && (
                    <p className="customization-detail">
                      Add-ons: {item.customization.addons.join(', ')}
                    </p>
                  )}

                  <div className="cart-item-footer">
                    <div className="quantity-controls">
                      <button onClick={() => updateCartQuantity(item.cartId, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.cartId, 1)}>+</button>
                    </div>
                    <span className="item-total">৳{(item.finalPrice * item.quantity).toFixed(2)}</span>
                  </div>

                  <button className="edit-item-btn" onClick={() => editCartItem(item.cartId)}>
                    ✏️ Edit
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>৳{getCartTotal().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee:</span>
                <span>৳{restaurant.deliveryFee || 50}</span>
              </div>
              <div className="summary-row">
                <span>Tax:</span>
                <span>৳{(getCartTotal() * 0.05).toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>৳{(getCartTotal() + (restaurant.deliveryFee || 50) + getCartTotal() * 0.05).toFixed(2)}</span>
              </div>

              <button className="checkout-btn" onClick={() => navigate('/checkout', { state: { cart, restaurant } })}>
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Item Customization Modal */}
      {showItemModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="item-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowItemModal(false)}>✕</button>
            
            <div className="modal-image">
              <img 
                src={selectedItem.image?.startsWith('http') ? selectedItem.image : `http://localhost:5000${selectedItem.image}`}
                alt={selectedItem.name}
                onError={(e) => { e.target.src = 'https://via.placeholder.com/400'; }}
              />
            </div>

            <div className="modal-content">
              <h2>{selectedItem.name}</h2>
              <p className="modal-description">{selectedItem.description}</p>
              
              {selectedItem.allergens && (
                <p className="allergens">⚠️ Contains: {selectedItem.allergens.join(', ')}</p>
              )}

              {/* Size Selection */}
              {selectedItem.sizes && (
                <div className="customization-group">
                  <h3>Select Size</h3>
                  <div className="option-buttons">
                    {selectedItem.sizes.map(size => (
                      <button
                        key={size.name}
                        className={`option-btn ${customization.size === size.name ? 'active' : ''}`}
                        onClick={() => setCustomization(prev => ({ ...prev, size: size.name }))}
                      >
                        {size.name} - ৳{size.price}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Spice Level */}
              <div className="customization-group">
                <h3>Spice Level</h3>
                <div className="option-buttons">
                  {['mild', 'medium', 'hot', 'extra-hot'].map(level => (
                    <button
                      key={level}
                      className={`option-btn ${customization.spiceLevel === level ? 'active' : ''}`}
                      onClick={() => setCustomization(prev => ({ ...prev, spiceLevel: level }))}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              {selectedItem.addons && (
                <div className="customization-group">
                  <h3>Add-ons</h3>
                  <div className="checkbox-options">
                    {selectedItem.addons.map(addon => (
                      <label key={addon.name} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={customization.addons.includes(addon.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomization(prev => ({ 
                                ...prev, 
                                addons: [...prev.addons, addon.name] 
                              }));
                            } else {
                              setCustomization(prev => ({ 
                                ...prev, 
                                addons: prev.addons.filter(a => a !== addon.name) 
                              }));
                            }
                          }}
                        />
                        <span>{addon.name} (+৳{addon.price})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div className="customization-group">
                <h3>Special Instructions</h3>
                <textarea
                  placeholder="Any special requests? (e.g., less salt, no onions)"
                  value={customization.instructions}
                  onChange={(e) => setCustomization(prev => ({ ...prev, instructions: e.target.value }))}
                  className="instructions-input"
                />
              </div>

              {/* Reviews Section */}
              <div className="reviews-section">
                <h3>Customer Reviews ({selectedItem.totalReviews || 0})</h3>
                {selectedItem.rating > 0 && (
                  <div className="average-rating">
                    {renderStars(Math.round(selectedItem.rating))}
                    <span className="rating-text">{selectedItem.rating.toFixed(1)} out of 5</span>
                  </div>
                )}
                
                {loadingReviews ? (
                  <p className="loading-text">Loading reviews...</p>
                ) : itemReviews.length > 0 ? (
                  <div className="reviews-list">
                    {itemReviews.slice(0, 3).map((review, index) => (
                      <div key={index} className="review-item">
                        <div className="review-header">
                          <span className="reviewer-name">{review.customerName || 'Anonymous'}</span>
                          {renderStars(review.rating)}
                        </div>
                        {review.review && <p className="review-comment">{review.review}</p>}
                        <span className="review-date">
                          {new Date(review.reviewedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {itemReviews.length > 3 && (
                      <p className="more-reviews">And {itemReviews.length - 3} more reviews...</p>
                    )}
                  </div>
                ) : (
                  <p className="no-reviews">No reviews yet. Be the first to review!</p>
                )}
              </div>

              <div className="modal-footer">
                <div className="modal-price">
                  <span>Total:</span>
                  <span className="price-value">৳{calculateItemPrice().toFixed(2)}</span>
                </div>
                <button className="add-to-cart-btn" onClick={addToCart}>
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;
