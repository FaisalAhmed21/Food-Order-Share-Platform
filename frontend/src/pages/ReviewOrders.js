import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReviewOrders.css';

const ReviewOrders = () => {
  const navigate = useNavigate();
  const [reviewableItems, setReviewableItems] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending, completed
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch reviewable items
      const reviewableRes = await fetch('http://localhost:5000/api/reviews/reviewable-items', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reviewableData = await reviewableRes.json();
      
      // Fetch user's reviews
      const myReviewsRes = await fetch('http://localhost:5000/api/reviews/my-reviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const myReviewsData = await myReviewsRes.json();
      
      if (reviewableData.success) {
        setReviewableItems(reviewableData.reviewableItems);
      }
      if (myReviewsData.success) {
        setMyReviews(myReviewsData.reviews);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (item) => {
    setSelectedItem(item);
    setReviewForm({ rating: 5, comment: '' });
    setShowReviewForm(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          menuItemId: selectedItem.menuItem._id,
          orderId: selectedItem.orderId,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Review submitted successfully!');
        setShowReviewForm(false);
        fetchData(); // Refresh data
      } else {
        alert(data.message || 'Error submitting review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Review deleted successfully!');
        fetchData();
      } else {
        alert(data.message || 'Error deleting review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Error deleting review');
    }
  };

  const renderStars = (rating, interactive = false, onChange = null) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={() => interactive && onChange && onChange(star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="review-orders-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="review-orders-container">
      <div className="review-header">
        <button className="back-btn" onClick={() => navigate('/my-orders')}>
          ← Back to Orders
        </button>
        <h1>⭐ Rate & Review</h1>
      </div>

      <div className="review-tabs">
        <button
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Reviews ({reviewableItems.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          My Reviews ({myReviews.length})
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="reviewable-items">
          {reviewableItems.length === 0 ? (
            <div className="no-items">
              <div className="no-items-icon">✅</div>
              <h2>All Caught Up!</h2>
              <p>You've reviewed all your delivered orders</p>
              <button className="browse-btn" onClick={() => navigate('/restaurants')}>
                Order More Food
              </button>
            </div>
          ) : (
            <div className="items-grid">
              {reviewableItems.map((item, index) => (
                <div key={index} className="reviewable-item-card">
                  <img
                    src={item.menuItem.image || '/placeholder-food.jpg'}
                    alt={item.menuItem.name}
                    className="item-image"
                  />
                  <div className="item-details">
                    <h3>{item.menuItem.name}</h3>
                    <p className="restaurant-name">
                      {item.menuItem.restaurant?.name || 'Restaurant'}
                    </p>
                    <p className="order-info">
                      Order #{item.orderNumber} • {new Date(item.orderDate).toLocaleDateString()}
                    </p>
                    <p className="quantity">Quantity: {item.quantity}</p>
                    <button
                      className="review-btn"
                      onClick={() => handleReviewClick(item)}
                    >
                      ⭐ Write Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="my-reviews">
          {myReviews.length === 0 ? (
            <div className="no-items">
              <div className="no-items-icon">📝</div>
              <h2>No Reviews Yet</h2>
              <p>Start reviewing your orders to help others!</p>
            </div>
          ) : (
            <div className="reviews-list">
              {myReviews.map((review) => (
                <div key={review._id} className="review-card">
                  <div className="review-header-row">
                    <img
                      src={review.menuItem?.image || '/placeholder-food.jpg'}
                      alt={review.menuItem?.name}
                      className="review-item-image"
                    />
                    <div className="review-info">
                      <h3>{review.menuItem?.name}</h3>
                      <p className="restaurant-name">
                        {review.menuItem?.restaurant?.name || 'Restaurant'}
                      </p>
                      {renderStars(review.rating)}
                      <p className="review-date">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                  <button
                    className="delete-review-btn"
                    onClick={() => handleDeleteReview(review._id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowReviewForm(false)}>
          <div className="modal-content review-form-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowReviewForm(false)}>
              ×
            </button>
            <h2>Write Your Review</h2>
            
            <div className="review-item-info">
              <img
                src={selectedItem.menuItem.image || '/placeholder-food.jpg'}
                alt={selectedItem.menuItem.name}
                className="modal-item-image"
              />
              <div>
                <h3>{selectedItem.menuItem.name}</h3>
                <p>{selectedItem.menuItem.restaurant?.name || 'Restaurant'}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>Your Rating *</label>
                {renderStars(reviewForm.rating, true, (rating) => 
                  setReviewForm({...reviewForm, rating})
                )}
              </div>

              <div className="form-group">
                <label>Your Review *</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                  placeholder="Share your experience with this dish..."
                  rows="5"
                  maxLength="500"
                  required
                />
                <small>{reviewForm.comment.length}/500 characters</small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowReviewForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting || !reviewForm.comment.trim()}
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewOrders;
