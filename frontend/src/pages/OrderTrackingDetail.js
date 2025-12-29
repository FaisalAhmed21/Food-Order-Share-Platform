import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './OrderTrackingDetail.css';

const OrderTrackingDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [deliveryReview, setDeliveryReview] = useState('');
  const [itemRatings, setItemRatings] = useState({});
  const [notification, setNotification] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);

  const stages = ['To Restaurant', 'Preparing', 'Ready to Pickup', 'Rider En Route', 'Reached'];
  
  useEffect(() => {
    fetchTrackingData();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchTrackingData, 5000);
    
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (!orderData || orderData.order.status === 'delivered') return;
    
    // Calculate time remaining in current stage
    const stageStart = new Date(orderData.order.stageStartTime);
    const now = new Date();
    const elapsed = Math.floor((now - stageStart) / 1000);
    const remaining = Math.max(0, 10 - elapsed);
    
    setTimeRemaining(remaining);
    
    if (remaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [orderData]);

  const fetchTrackingData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/tracking/${orderId}/tracking`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setOrderData(data);
        
        // Check if already rated
        const alreadyRated = data.order.deliveryPersonRating || (data.order.itemReviews && data.order.itemReviews.length > 0);
        setHasRated(alreadyRated);
        
        // Pre-fill existing ratings if editing
        if (alreadyRated) {
          if (data.order.deliveryPersonRating) {
            setDeliveryRating(data.order.deliveryPersonRating);
            setDeliveryReview(data.order.deliveryPersonReview || '');
          }
          
          // Pre-fill item ratings
          if (data.order.itemReviews) {
            const existingRatings = {};
            data.order.itemReviews.forEach(review => {
              existingRatings[review.menuItem] = {
                rating: review.rating,
                review: review.review || ''
              };
            });
            setItemRatings(existingRatings);
          }
        }
        
        // Show rating modal when order is delivered and not yet rated
        if (data.order.status === 'delivered' && !alreadyRated && !hasRated) {
          setShowRatingModal(true);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setLoading(false);
    }
  };

  const submitRatings = async () => {
    try {
      // Submit delivery person rating if provided
      if (deliveryRating > 0) {
        const deliveryEndpoint = showEditMode 
          ? `http://localhost:5000/api/tracking/${orderId}/update-delivery-rating`
          : `http://localhost:5000/api/tracking/${orderId}/rate-delivery`;
          
        await fetch(deliveryEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            rating: deliveryRating,
            review: deliveryReview
          })
        });
      }

      // Submit item ratings if provided
      const itemReviews = Object.entries(itemRatings)
        .filter(([_, data]) => data.rating > 0)
        .map(([menuItemId, data]) => ({
          menuItemId,
          rating: data.rating,
          review: data.review || ''
        }));

      if (itemReviews.length > 0) {
        const itemEndpoint = showEditMode
          ? `http://localhost:5000/api/tracking/${orderId}/update-item-ratings`
          : `http://localhost:5000/api/tracking/${orderId}/rate-items`;
          
        await fetch(itemEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ itemReviews })
        });
      }

      showNotification(showEditMode ? 'Reviews updated successfully! 🎉' : 'Thank you for your feedback! 🎉');
      setShowRatingModal(false);
      setShowEditMode(false);
      setHasRated(true);
      fetchTrackingData();
    } catch (error) {
      console.error('Error submitting ratings:', error);
      showNotification('Error submitting ratings');
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const getStageIcon = (stage) => {
    const icons = {
      'To Restaurant': '🏍️',
      'Preparing': '👨‍🍳',
      'Ready to Pickup': '📦',
      'Rider En Route': '🚚',
      'Reached': '✅'
    };
    return icons[stage] || '📍';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="tracking-container">
        <div className="loading-spinner"></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="tracking-container">
        <h2>Order not found</h2>
        <button onClick={() => navigate('/my-orders')}>Back to Orders</button>
      </div>
    );
  }

  const { order, restaurant, customer, deliveryPerson } = orderData;
  const currentStageIndex = stages.indexOf(order.currentStage);

  return (
    <div className="tracking-container">
      {notification && <div className="notification-toast">{notification}</div>}

      <div className="tracking-header">
        <button className="back-btn" onClick={() => navigate('/my-orders')}>
          ← Back to Orders
        </button>
        <h1>Track Your Order</h1>
        <p className="order-number">Order #{order.orderNumber}</p>
      </div>

      {/* Stage Progress Bar with Timer */}
      <div className="stage-progress-section">
        <div className="timer-display">
          <span className="timer-label">Current Stage Time:</span>
          <span className="timer-value">{formatTime(timeRemaining)}</span>
        </div>

        <div className="stages-bar">
          {stages.map((stage, index) => (
            <div 
              key={stage} 
              className={`stage-item ${index <= currentStageIndex ? 'completed' : ''} ${index === currentStageIndex ? 'active' : ''}`}
            >
              <div className="stage-icon">{getStageIcon(stage)}</div>
              <div className="stage-label">{stage}</div>
              {index < stages.length - 1 && (
                <div className={`stage-connector ${index < currentStageIndex ? 'completed' : ''}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Map with 3 Pointers */}
      <div className="map-container">
        <div className="map-header">
          <h3>📍 Live Tracking</h3>
        </div>
        <div className="map-canvas" id="tracking-map">
          <div className="map-marker restaurant-marker" 
               style={{
                 left: '20%',
                 top: '30%'
               }}>
            <div className="marker-pin">🍽️</div>
            <div className="marker-label">{restaurant.name}</div>
          </div>

          {deliveryPerson && (
            <div className="map-marker delivery-marker"
                 style={{
                   left: currentStageIndex === 0 ? '35%' : 
                         currentStageIndex === 1 ? '25%' :
                         currentStageIndex === 2 ? '25%' :
                         currentStageIndex === 3 ? '60%' : '80%',
                   top: currentStageIndex === 0 ? '45%' :
                        currentStageIndex === 1 ? '30%' :
                        currentStageIndex === 2 ? '30%' :
                        currentStageIndex === 3 ? '50%' : '70%',
                   transition: 'all 2s ease-in-out'
                 }}>
              <div className="marker-pin delivery-pin">🏍️</div>
              <div className="marker-label">{deliveryPerson.name}</div>
            </div>
          )}

          <div className="map-marker customer-marker"
               style={{
                 left: '80%',
                 top: '70%'
               }}>
            <div className="marker-pin">🏠</div>
            <div className="marker-label">Your Location</div>
          </div>

          {/* Path Line */}
          <svg className="path-svg" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
            <path
              d="M 20% 30% Q 50% 20% 80% 70%"
              stroke="#667eea"
              strokeWidth="3"
              strokeDasharray="10,5"
              fill="none"
              opacity="0.5"
            />
          </svg>
        </div>
      </div>

      {/* Order Info Cards */}
      <div className="info-cards-grid">
        {/* Delivery Person Card */}
        {deliveryPerson && (
          <div className="info-card delivery-card">
            <h3>🏍️ Delivery Person</h3>
            <div className="delivery-info">
              {deliveryPerson.profilePicture && (
                <img 
                  src={`http://localhost:5000${deliveryPerson.profilePicture}`} 
                  alt={deliveryPerson.name}
                  className="delivery-avatar"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div className="delivery-details">
                <p className="delivery-name">{deliveryPerson.name}</p>
                <p className="delivery-rating">
                  ⭐ {deliveryPerson.rating.toFixed(1)} 
                  ({deliveryPerson.totalRatings || 0} ratings)
                </p>
                <p className="delivery-stats">
                  {deliveryPerson.totalDeliveries} deliveries completed
                </p>
                <p className="delivery-vehicle">
                  {deliveryPerson.vehicleType} - {deliveryPerson.vehicleNumber}
                </p>
                <a href={`tel:${deliveryPerson.phone}`} className="call-btn">
                  📞 Call {deliveryPerson.phone}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Card */}
        <div className="info-card restaurant-card">
          <h3>🍽️ Restaurant</h3>
          {restaurant.image && (
            <img 
              src={restaurant.image?.startsWith('http') ? restaurant.image : `http://localhost:5000${restaurant.image}`}
              alt={restaurant.name}
              className="restaurant-img"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/200x100'; }}
            />
          )}
          <p className="restaurant-name">{restaurant.name}</p>
          <p className="restaurant-address">{restaurant.address?.fullAddress || restaurant.address?.area}</p>
          {restaurant.phone && (
            <a href={`tel:${restaurant.phone}`} className="call-btn">
              📞 Call Restaurant
            </a>
          )}
        </div>

        {/* Order Items Card */}
        <div className="info-card items-card">
          <h3>📦 Order Items</h3>
          <div className="items-list">
            {order.items.map((item, index) => (
              <div key={index} className="order-item">
                <span className="item-name">{item.name} x{item.quantity}</span>
                <span className="item-price">৳{item.subtotal}</span>
              </div>
            ))}
          </div>
          <div className="order-total">
            <strong>Total:</strong>
            <strong>৳{order.pricing.total}</strong>
          </div>
        </div>
      </div>

      {/* Existing Reviews Display */}
      {hasRated && order.status === 'delivered' && !showRatingModal && (
        <div className="existing-reviews-section">
          <div className="reviews-header">
            <h3>Your Reviews</h3>
            <button 
              className="edit-reviews-btn"
              onClick={() => {
                setShowEditMode(true);
                setShowRatingModal(true);
              }}
            >
              ✏️ Edit Reviews
            </button>
          </div>

          {deliveryPerson && order.deliveryPersonRating && (
            <div className="existing-review-card">
              <h4>🏍️ Delivery Person Review</h4>
              <div className="review-content">
                <div className="review-stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={`star ${star <= order.deliveryPersonRating ? 'filled' : ''}`}>
                      ★
                    </span>
                  ))}
                  <span className="rating-value">({order.deliveryPersonRating}/5)</span>
                </div>
                {order.deliveryPersonReview && (
                  <p className="review-text">{order.deliveryPersonReview}</p>
                )}
                <p className="review-date">
                  Reviewed on {new Date(order.deliveryPersonReviewedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {order.itemReviews && order.itemReviews.length > 0 && (
            <div className="existing-review-card">
              <h4>🍽️ Food Items Reviews</h4>
              {order.itemReviews.map((review, index) => {
                const item = order.items.find(i => i.menuItem === review.menuItem);
                return (
                  <div key={index} className="item-review-summary">
                    <p className="item-name">{item?.name || 'Item'}</p>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star} className={`star ${star <= review.rating ? 'filled' : ''}`}>
                          ★
                        </span>
                      ))}
                      <span className="rating-value">({review.rating}/5)</span>
                    </div>
                    {review.review && <p className="review-text">{review.review}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{showEditMode ? 'Edit Your Reviews' : 'Rate Your Experience'}</h2>
            
            {deliveryPerson && (
              <div className="rating-section">
                <h3>Delivery Person: {deliveryPerson.name}</h3>
                <div className="star-rating-input">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={`star ${star <= deliveryRating ? 'filled' : ''}`}
                      onClick={() => setDeliveryRating(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <textarea
                  placeholder="Share your feedback about the delivery..."
                  value={deliveryReview}
                  onChange={(e) => setDeliveryReview(e.target.value)}
                  rows="3"
                />
              </div>
            )}

            <div className="rating-section">
              <h3>Rate Food Items</h3>
              {order.items.map((item) => (
                <div key={item._id || item.menuItem} className="item-rating">
                  <p>{item.name}</p>
                  <div className="star-rating-input">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        className={`star ${star <= (itemRatings[item.menuItem]?.rating || 0) ? 'filled' : ''}`}
                        onClick={() => setItemRatings({
                          ...itemRatings,
                          [item.menuItem]: {
                            ...itemRatings[item.menuItem],
                            rating: star
                          }
                        })}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Your review (optional)"
                    value={itemRatings[item.menuItem]?.review || ''}
                    onChange={(e) => setItemRatings({
                      ...itemRatings,
                      [item.menuItem]: {
                        ...itemRatings[item.menuItem],
                        review: e.target.value
                      }
                    })}
                  />
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="submit-btn" onClick={submitRatings}>
                {showEditMode ? 'Update Reviews' : 'Submit Ratings'}
              </button>
              <button className="skip-btn" onClick={() => {
                setShowRatingModal(false);
                setShowEditMode(false);
              }}>
                {showEditMode ? 'Cancel' : 'Skip for Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingDetail;
