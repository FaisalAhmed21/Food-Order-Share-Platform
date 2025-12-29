import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyOrders.css';

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed, cancelled

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/payments/my-orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        // Sort by most recent first
        const sortedOrders = data.orders.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffa500',
      confirmed: '#2196f3',
      preparing: '#ff9800',
      ready: '#9c27b0',
      out_for_delivery: '#00bcd4',
      delivered: '#4caf50',
      cancelled: '#f44336'
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✓',
      preparing: '👨‍🍳',
      ready: '📦',
      out_for_delivery: '🏍️',
      delivered: '✅',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  const getDeliveryStatusBadge = (order) => {
    if (order.status === 'cancelled') {
      return <span className="delivery-badge cancelled">Cancelled</span>;
    }
    
    if (order.deliveryAssignmentStatus === 'assigned') {
      return <span className="delivery-badge assigned">✓ Delivery Person Assigned</span>;
    } else if (order.deliveryAssignmentStatus === 'searching') {
      return <span className="delivery-badge searching">🔍 Searching for Delivery Person...</span>;
    } else if (order.deliveryAssignmentStatus === 'no_delivery_person') {
      return <span className="delivery-badge no-delivery">❌ No Delivery Person Available</span>;
    }
    return null;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(order.status);
    if (filter === 'completed') return order.status === 'delivered';
    if (filter === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  if (loading) {
    return (
      <div className="my-orders-container">
        <div className="loading-spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="my-orders-container">
      <div className="orders-header">
        <button className="back-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <h1>My Orders</h1>
      </div>

      <div className="orders-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Orders ({orders.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)).length})
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({orders.filter(o => o.status === 'delivered').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled ({orders.filter(o => o.status === 'cancelled').length})
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          <div className="no-orders-icon">📦</div>
          <h2>No Orders Found</h2>
          <p>You haven't placed any orders yet</p>
          <button className="browse-btn" onClick={() => navigate('/restaurants')}>
            Browse Restaurants
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map(order => (
            <div key={order._id} className="order-card">
              <div className="order-header-row">
                <div className="order-info-left">
                  <h3>{order.restaurant?.name || 'Restaurant'}</h3>
                  <p className="order-number">Order #{order.orderNumber}</p>
                </div>
                <div className="order-status">
                  <span 
                    className="status-badge" 
                    style={{ background: getStatusColor(order.status) }}
                  >
                    {getStatusIcon(order.status)} {order.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="order-details">
                <div className="order-items">
                  <strong>Items:</strong>
                  <ul>
                    {order.items?.map((item, idx) => (
                      <li key={idx}>
                        {item.name} x{item.quantity} - ৳{(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="order-meta">
                  <div className="meta-item">
                    <span className="meta-label">Total:</span>
                    <span className="meta-value">৳{order.pricing?.total?.toFixed(2)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Ordered:</span>
                    <span className="meta-value">{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Payment:</span>
                    <span className={`meta-value ${order.payment?.status}`}>
                      {order.payment?.status?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="delivery-status-section">
                  {getDeliveryStatusBadge(order)}
                  {order.deliveryAssignmentMessage && (
                    <p className="delivery-message">{order.deliveryAssignmentMessage}</p>
                  )}
                  {order.cancellationReason && (
                    <p className="cancellation-reason">❌ {order.cancellationReason}</p>
                  )}
                  {order.deliveryPerson && (
                    <div className="delivery-person-info">
                      <strong>🏍️ Delivery Person:</strong>
                      <div className="delivery-person-details">
                        {order.deliveryPerson.profilePicture && (
                          <img 
                            src={`http://localhost:5000${order.deliveryPerson.profilePicture}`}
                            alt={order.deliveryPerson.name}
                            className="delivery-person-avatar"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <p className="delivery-person-name">{order.deliveryPerson.name}</p>
                          <p className="delivery-person-rating">
                            ⭐ {order.deliveryPerson.rating?.toFixed(1)} 
                            ({order.deliveryPerson.totalRatings || 0} ratings)
                          </p>
                          <p className="delivery-person-phone">📞 {order.deliveryPerson.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {order.deliveryAddress && (
                  <div className="delivery-address">
                    <strong>📍 Delivery Address:</strong>
                    <p>{order.deliveryAddress.fullAddress || order.deliveryAddress.street}</p>
                  </div>
                )}
              </div>

              <div className="order-actions">
                {['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(order.status) && (
                  <button 
                    className="track-btn"
                    onClick={() => navigate(`/order-tracking/${order._id}`)}
                  >
                    📍 Track Order
                  </button>
                )}
                <button 
                  className="view-details-btn"
                  onClick={() => navigate(`/order-tracking/${order._id}`)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
