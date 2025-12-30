import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyAssignments.css';

const MyAssignments = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAssignments();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchAssignments, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/volunteers/my-delivery-assignments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'To Restaurant': '#2196f3',
      'Preparing': '#ff9800',
      'Ready to Pickup': '#9c27b0',
      'Rider En Route': '#00bcd4',
      'Reached': '#4caf50',
      'delivered': '#4caf50',
      'cancelled': '#f44336'
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'To Restaurant': '🏍️',
      'Preparing': '👨‍🍳',
      'Ready to Pickup': '📦',
      'Rider En Route': '🚚',
      'Reached': '✅',
      'delivered': '✅',
      'cancelled': '❌'
    };
    return icons[status] || '📋';
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['delivered', 'cancelled'].includes(assignment.status);
    if (filter === 'completed') return assignment.status === 'delivered';
    return true;
  });

  if (loading) {
    return (
      <div className="assignments-container">
        <div className="loading-spinner"></div>
        <p>Loading assignments...</p>
      </div>
    );
  }

  return (
    <div className="assignments-container">
      <div className="assignments-header">
        <button className="back-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <h1>📦 My Assignments</h1>
      </div>

      <div className="assignments-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({assignments.length})
        </button>
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({assignments.filter(a => !['delivered', 'cancelled'].includes(a.status)).length})
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({assignments.filter(a => a.status === 'delivered').length})
        </button>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="no-assignments">
          <div className="no-assignments-icon">📦</div>
          <h2>No Assignments Found</h2>
          <p>You don't have any {filter !== 'all' ? filter : ''} assignments yet</p>
          <button className="home-btn" onClick={() => navigate('/home')}>
            Go to Home
          </button>
        </div>
      ) : (
        <div className="assignments-list">
          {filteredAssignments.map(assignment => (
            <div key={assignment._id} className="assignment-card">
              <div className="assignment-header-row">
                <div className="assignment-info-left">
                  <h3>🍽️ {assignment.restaurant?.name || 'Restaurant'}</h3>
                  <p className="order-number">Order #{assignment.orderNumber}</p>
                </div>
                <div className="assignment-status">
                  <span 
                    className="status-badge" 
                    style={{ background: getStatusColor(assignment.currentStage || assignment.status) }}
                  >
                    {getStatusIcon(assignment.currentStage || assignment.status)} {(assignment.currentStage || assignment.status).replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="assignment-details">
                <div className="assignment-items">
                  <strong>Items:</strong>
                  <ul>
                    {assignment.items?.map((item, idx) => (
                      <li key={idx}>
                        {item.name} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="assignment-meta">
                  <div className="meta-item">
                    <span className="meta-label">Total:</span>
                    <span className="meta-value">৳{assignment.pricing?.total?.toFixed(2)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Assigned:</span>
                    <span className="meta-value">{new Date(assignment.createdAt).toLocaleString()}</span>
                  </div>
                  {assignment.stageStartTime && (
                    <div className="meta-item">
                      <span className="meta-label">Stage Started:</span>
                      <span className="meta-value">{new Date(assignment.stageStartTime).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>

                <div className="location-section">
                  <div className="location-item">
                    <strong>📍 Pickup Location:</strong>
                    <p>{assignment.restaurant?.address?.fullAddress || assignment.restaurant?.address?.area || 'N/A'}</p>
                  </div>
                  <div className="location-item">
                    <strong>🏠 Delivery Location:</strong>
                    <p>{assignment.deliveryAddress?.fullAddress || assignment.deliveryAddress?.street || 'N/A'}</p>
                  </div>
                </div>

                {assignment.customer && (
                  <div className="customer-info">
                    <strong>👤 Customer:</strong>
                    <div className="customer-details">
                      <p>{assignment.customer.name}</p>
                      <p>📞 {assignment.customer.phone}</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAssignments;

