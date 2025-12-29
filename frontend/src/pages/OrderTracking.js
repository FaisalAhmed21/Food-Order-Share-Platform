import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './OrderTracking.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const OrderTracking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId } = location.state || {};
  
  const [order, setOrder] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [eta, setEta] = useState(30);
  const [orderStatus, setOrderStatus] = useState('preparing');
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const riderMarker = useRef(null);

  const statusSteps = [
    { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
    { key: 'ready', label: 'Ready for Pickup', icon: '📦' },
    { key: 'picked', label: 'Rider En Route', icon: '🏍️' },
    { key: 'arrived', label: 'Arrived', icon: '✅' }
  ];

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!orderId) {
      navigate('/home');
      return;
    }

    fetchOrderDetails();
    initializeMap();

    // WebSocket connection for real-time updates
    const ws = new WebSocket('ws://localhost:5000');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ 
        type: 'SUBSCRIBE_ORDER', 
        orderId 
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'ORDER_UPDATE') {
        handleOrderUpdate(data);
      } else if (data.type === 'RIDER_LOCATION') {
        handleRiderLocationUpdate(data);
      } else if (data.type === 'ETA_UPDATE') {
        setEta(data.eta);
      }
    };

    return () => {
      ws.close();
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/payments/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('Order data received:', data.order);
        console.log('Delivery Address:', data.order.deliveryAddress);
        setOrder(data.order);
        setOrderStatus(data.order.status);
        if (data.order.rider && data.order.rider.location) {
          setRiderLocation(data.order.rider.location);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map centered on a default location
    mapInstance.current = L.map(mapRef.current).setView([23.8103, 90.4125], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    // Add restaurant marker
    const restaurantIcon = L.divIcon({
      className: 'custom-marker restaurant-marker',
      html: '<div class="marker-icon">🏪</div>',
      iconSize: [40, 40]
    });

    L.marker([23.8103, 90.4125], { icon: restaurantIcon })
      .addTo(mapInstance.current)
      .bindPopup('Restaurant');

    // Add customer marker
    const customerIcon = L.divIcon({
      className: 'custom-marker customer-marker',
      html: '<div class="marker-icon">🏠</div>',
      iconSize: [40, 40]
    });

    L.marker([23.7500, 90.3667], { icon: customerIcon })
      .addTo(mapInstance.current)
      .bindPopup('Your Location');
  };

  const handleOrderUpdate = (data) => {
    setOrderStatus(data.status);
    setOrder(prev => ({ ...prev, status: data.status }));

    // Show notification
    showNotification(getStatusMessage(data.status));
  };

  const handleRiderLocationUpdate = (data) => {
    setRiderLocation(data.location);

    if (mapInstance.current && data.location) {
      // Update or create rider marker
      if (riderMarker.current) {
        riderMarker.current.setLatLng([data.location.lat, data.location.lng]);
      } else {
        const riderIcon = L.divIcon({
          className: 'custom-marker rider-marker',
          html: '<div class="marker-icon animated">🏍️</div>',
          iconSize: [40, 40]
        });

        riderMarker.current = L.marker([data.location.lat, data.location.lng], { 
          icon: riderIcon 
        }).addTo(mapInstance.current);
      }

      // Update map bounds to show all markers
      const bounds = L.latLngBounds([
        [23.8103, 90.4125], // Restaurant
        [23.7500, 90.3667], // Customer
        [data.location.lat, data.location.lng] // Rider
      ]);
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const getStatusMessage = (status) => {
    const messages = {
      preparing: 'Your order is being prepared! 👨‍🍳',
      ready: 'Order ready! Waiting for rider pickup 📦',
      picked: 'Rider is on the way to you! 🏍️',
      arrived: 'Rider has arrived! 🎉',
      delivered: 'Order delivered! Enjoy your meal! 😋'
    };
    return messages[status] || 'Order status updated';
  };

  const showNotification = (message) => {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'tracking-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const confirmReceived = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        navigate('/order-rating', { state: { orderId, order } });
      }
    } catch (error) {
      console.error('Error confirming order:', error);
    }
  };

  const contactRider = () => {
    if (order && order.rider && order.rider.phone) {
      window.location.href = `tel:${order.rider.phone}`;
    }
  };

  const messageRider = () => {
    // In a real app, this would open a chat interface
    alert('Chat feature would open here');
  };

  if (!order) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(step => step.key === orderStatus);

  return (
    <div className="order-tracking-container">
      {/* Header */}
      <div className="tracking-header">
        <button className="back-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <h1>Track Your Order</h1>
        <div className="order-number">
          Order #{order.orderNumber || 'Loading...'}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="status-timeline">
        {statusSteps.map((step, index) => (
          <div 
            key={step.key} 
            className={`timeline-step ${index <= currentStepIndex ? 'completed' : ''} ${index === currentStepIndex ? 'active' : ''}`}
          >
            <div className="step-icon">{step.icon}</div>
            <div className="step-label">{step.label}</div>
            {index < statusSteps.length - 1 && (
              <div className="step-connector"></div>
            )}
          </div>
        ))}
      </div>

      {/* ETA Banner */}
      <div className="eta-banner">
        <div className="eta-icon">⏱️</div>
        <div className="eta-content">
          <h3>Estimated Delivery Time</h3>
          <p className="eta-time">{eta} minutes</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="tracking-content">
        {/* Map Section */}
        <div className="map-section">
          <div ref={mapRef} className="order-map"></div>
          
          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-icon">🏪</span>
              <span>Restaurant</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">🏍️</span>
              <span>Rider</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">🏠</span>
              <span>You</span>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="details-section">
          {/* Rider Info */}
          {order.rider && orderStatus !== 'preparing' && (
            <div className="rider-card">
              <div className="rider-avatar">
                <img 
                  src={order.rider.avatar || 'https://via.placeholder.com/80'} 
                  alt={order.rider.name} 
                />
              </div>
              <div className="rider-info">
                <h3>{order.rider.name}</h3>
                <p className="rider-vehicle">{order.rider.vehicle} • {order.rider.vehicleNumber}</p>
                <div className="rider-rating">
                  ⭐ {order.rider.rating || 4.8} ({order.rider.deliveries || 150} deliveries)
                </div>
              </div>
              <div className="rider-actions">
                <button className="contact-btn" onClick={contactRider}>
                  Call
                </button>
                <button className="message-btn" onClick={messageRider}>
                  💬 Message
                </button>
              </div>
            </div>
          )}

          {/* Order Details */}
          <div className="order-details-card">
            <h3>Order Details</h3>
            
            <div className="restaurant-info">
              <h4>{order.restaurant?.name || 'Restaurant'}</h4>
              <p>{order.restaurant?.address?.fullAddress || order.restaurant?.address?.street || ''}</p>
            </div>

            <div className="order-items">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <span className="item-name">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="item-price">৳{(item.subtotal || (item.price * item.quantity)).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p>No items found</p>
              )}
            </div>

            <div className="order-totals">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>৳{order.pricing?.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="total-row">
                <span>Delivery Fee:</span>
                <span>৳{order.pricing?.deliveryFee?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="total-row">
                <span>Tax:</span>
                <span>৳{order.pricing?.tax?.toFixed(2) || '0.00'}</span>
              </div>
              {order.pricing?.discount > 0 && (
                <div className="total-row discount">
                  <span>💰 Discount:</span>
                  <span>-৳{order.pricing.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="total-row final">
                <span>Total:</span>
                <span>৳{order.pricing?.total?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="delivery-address-card">
            <h3>📍 Delivery Address</h3>
            <p>
              {order.deliveryAddress && typeof order.deliveryAddress === 'object'
                ? (order.deliveryAddress.fullAddress || order.deliveryAddress.street || order.deliveryAddress.area || 'Address not available')
                : order.deliveryAddress || 'Address not provided'}
            </p>
            <p className="contact-info">Contact: {order.contactPhone || 'N/A'}</p>
          </div>

          {/* Actions */}
          {orderStatus === 'arrived' && (
            <button className="confirm-delivery-btn" onClick={confirmReceived}>
              ✅ Confirm Received
            </button>
          )}

          {orderStatus === 'delivered' && (
            <div className="delivered-message">
              <div className="success-icon">✅</div>
              <h3>Order Delivered!</h3>
              <p>Thank you for your order. Enjoy your meal!</p>
              <button 
                className="rate-order-btn" 
                onClick={() => navigate('/order-rating', { state: { orderId, order } })}
              >
                ⭐ Rate Your Experience
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="help-section">
        <p>Need help with your order?</p>
        <button className="help-btn">Contact Support</button>
      </div>
    </div>
  );
};

export default OrderTracking;
