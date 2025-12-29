import React, { useState, useEffect } from 'react';
import './OrderAnalytics.css';
import { useNavigate } from 'react-router-dom';

const OrderAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch analytics
      const analyticsResponse = await fetch(`http://localhost:5000/api/orders/analytics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.analytics);
      }

      // Fetch feedbacks
      const feedbacksResponse = await fetch('http://localhost:5000/api/orders/feedbacks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (feedbacksResponse.ok) {
        const feedbacksData = await feedbacksResponse.json();
        setFeedbacks(feedbacksData.feedbacks);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch analytics data');
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStarRating = (rating) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= rating ? 'star filled' : 'star'}>
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="order-analytics">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="order-analytics">
      <div className="analytics-header">
        <h1>Order Analytics Dashboard</h1>
        <div className="period-selector">
          <button 
            className={period === 'week' ? 'active' : ''} 
            onClick={() => setPeriod('week')}
          >
            Week
          </button>
          <button 
            className={period === 'month' ? 'active' : ''} 
            onClick={() => setPeriod('month')}
          >
            Month
          </button>
          <button 
            className={period === 'year' ? 'active' : ''} 
            onClick={() => setPeriod('year')}
          >
            Year
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="metrics-container">
            <div className="metric-card revenue">
              <div className="metric-icon">💰</div>
              <div className="metric-content">
                <h3>{formatCurrency(analytics.totalRevenue)}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
            <div className="metric-card orders">
              <div className="metric-icon">📦</div>
              <div className="metric-content">
                <h3>{analytics.totalOrders}</h3>
                <p>Total Orders</p>
              </div>
            </div>
            <div className="metric-card average">
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <h3>{formatCurrency(analytics.averageOrderValue)}</h3>
                <p>Average Order Value</p>
              </div>
            </div>
            <div className="metric-card rating">
              <div className="metric-icon">⭐</div>
              <div className="metric-content">
                <h3>{analytics.feedback.averageRating.toFixed(1)}</h3>
                <p>Average Rating</p>
              </div>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="chart-section">
            <h2>Revenue Trend</h2>
            <div className="line-chart">
              {Object.entries(analytics.trends).map(([date, data], index) => {
                const maxRevenue = Math.max(...Object.values(analytics.trends).map(d => d.revenue));
                const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 200 : 0;
                
                return (
                  <div key={date} className="chart-bar-group">
                    <div className="chart-bar-wrapper">
                      <div 
                        className="chart-bar revenue-bar"
                        style={{ height: `${height}px` }}
                        title={`${formatDate(date)}: ${formatCurrency(data.revenue)}`}
                      >
                        {data.revenue > 0 && (
                          <span className="bar-value">{formatCurrency(data.revenue)}</span>
                        )}
                      </div>
                    </div>
                    <div className="chart-label">
                      {new Date(date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Type Breakdown */}
          <div className="breakdown-section">
            <div className="breakdown-card">
              <h2>Order Types</h2>
              <div className="pie-chart-container">
                <div className="pie-stats">
                  <div className="pie-stat-item">
                    <div className="pie-color regular"></div>
                    <span>Order for Me: {analytics.orderForMe}</span>
                  </div>
                  <div className="pie-stat-item">
                    <div className="pie-color donation"></div>
                    <span>Donated Meals: {analytics.donatedMeals}</span>
                  </div>
                </div>
                <div className="donut-chart">
                  <svg viewBox="0 0 100 100">
                    {analytics.completedOrders > 0 && (
                      <>
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#667eea"
                          strokeWidth="20"
                          strokeDasharray={`${(analytics.orderForMe / analytics.completedOrders) * 251.2} 251.2`}
                          transform="rotate(-90 50 50)"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#38ef7d"
                          strokeWidth="20"
                          strokeDasharray={`${(analytics.donatedMeals / analytics.completedOrders) * 251.2} 251.2`}
                          strokeDashoffset={`-${(analytics.orderForMe / analytics.completedOrders) * 251.2}`}
                          transform="rotate(-90 50 50)"
                        />
                      </>
                    )}
                    <text x="50" y="50" textAnchor="middle" dy=".3em" fontSize="16" fill="#2c3e50" fontWeight="bold">
                      {analytics.completedOrders}
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            <div className="breakdown-card">
              <h2>Order Status</h2>
              <div className="status-list">
                <div className="status-row">
                  <span className="status-label">Pending</span>
                  <div className="status-bar-bg">
                    <div 
                      className="status-bar pending-bar" 
                      style={{ width: `${(analytics.statusCounts.pending / analytics.totalOrders) * 100}%` }}
                    ></div>
                  </div>
                  <span className="status-count">{analytics.statusCounts.pending}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Confirmed</span>
                  <div className="status-bar-bg">
                    <div 
                      className="status-bar confirmed-bar" 
                      style={{ width: `${(analytics.statusCounts.confirmed / analytics.totalOrders) * 100}%` }}
                    ></div>
                  </div>
                  <span className="status-count">{analytics.statusCounts.confirmed}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Preparing</span>
                  <div className="status-bar-bg">
                    <div 
                      className="status-bar preparing-bar" 
                      style={{ width: `${(analytics.statusCounts.preparing / analytics.totalOrders) * 100}%` }}
                    ></div>
                  </div>
                  <span className="status-count">{analytics.statusCounts.preparing}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Delivered</span>
                  <div className="status-bar-bg">
                    <div 
                      className="status-bar delivered-bar" 
                      style={{ width: `${(analytics.statusCounts.delivered / analytics.totalOrders) * 100}%` }}
                    ></div>
                  </div>
                  <span className="status-count">{analytics.statusCounts.delivered}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Cancelled</span>
                  <div className="status-bar-bg">
                    <div 
                      className="status-bar cancelled-bar" 
                      style={{ width: `${(analytics.statusCounts.cancelled / analytics.totalOrders) * 100}%` }}
                    ></div>
                  </div>
                  <span className="status-count">{analytics.statusCounts.cancelled}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Items */}
          {analytics.popularItems && analytics.popularItems.length > 0 && (
            <div className="popular-items-section">
              <h2>Most Popular Items</h2>
              <div className="popular-items-grid">
                {analytics.popularItems.map((item, index) => (
                  <div key={index} className="popular-item-card">
                    <div className="item-rank">#{index + 1}</div>
                    <div className="item-info">
                      <h3>{item.name}</h3>
                      <p>{item.count} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating Distribution */}
          <div className="rating-section">
            <h2>Customer Ratings Distribution</h2>
            <div className="rating-bars">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className="rating-bar-row">
                  <span className="rating-label">{star} ⭐</span>
                  <div className="rating-bar-bg">
                    <div 
                      className={`rating-bar rating-${star}`}
                      style={{ 
                        width: analytics.feedback.totalFeedbacks > 0 
                          ? `${(analytics.feedback.ratingDistribution[star] / analytics.feedback.totalFeedbacks) * 100}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                  <span className="rating-count">{analytics.feedback.ratingDistribution[star]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Feedbacks */}
          {feedbacks.length > 0 && (
            <div className="feedbacks-section">
              <h2>Recent Customer Feedback</h2>
              <div className="feedbacks-grid">
                {feedbacks.map((feedback, index) => (
                  <div key={index} className="feedback-card">
                    <div className="feedback-header">
                      <div className="customer-info">
                        <strong>{feedback.customerName}</strong>
                        <span className="feedback-date">{formatDate(feedback.addedAt || feedback.orderDate)}</span>
                      </div>
                      {renderStarRating(feedback.rating)}
                    </div>
                    {feedback.comment && (
                      <p className="feedback-comment">"{feedback.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderAnalytics;
