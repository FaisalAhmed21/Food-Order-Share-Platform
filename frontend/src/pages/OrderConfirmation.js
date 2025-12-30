import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, orderNumber, estimatedTime, qrCode } = location.state || {};
  const [showNotification, setShowNotification] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  useEffect(() => {
    if (!orderId) {
      navigate('/home');
      return;
    }

    // Show notification for 3 seconds
    const notificationTimer = setTimeout(() => {
      setShowNotification(false);
    }, 3000);

    // Countdown for redirect
    const countdownInterval = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          navigate(`/order-tracking/${orderId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(notificationTimer);
      clearInterval(countdownInterval);
    };
  }, [orderId, navigate]);

  if (!orderId) {
    return null;
  }

  return (
    <div className="order-confirmation-container">
      {showNotification && (
        <div className="success-notification">
          🎉 Your order has been placed successfully! Searching for delivery person...
        </div>
      )}

      <div className="confirmation-card">
        <div className="success-animation">
          <div className="checkmark-circle">
            <div className="checkmark">✓</div>
          </div>
        </div>

        <h1>Order Placed Successfully!</h1>
        <p className="confirmation-message">
          Thank you for your order. We've received your order and are assigning a delivery person.
        </p>

        <div className="redirect-notice">
          <p>Redirecting to order tracking in <strong>{redirectCountdown}</strong> seconds...</p>
        </div>

        <div className="order-info">
          <div className="info-item">
            <span className="info-label">Order Number</span>
            <span className="info-value">#{orderNumber}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Estimated Time</span>
            <span className="info-value">{estimatedTime} minutes</span>
          </div>
        </div>

        {qrCode && (
          <div className="qr-section">
            <h3>Order QR Code</h3>
            <div className="qr-code">
              <img src={qrCode} alt="Order QR Code" />
            </div>
            <p className="qr-description">
              Show this code for pickup or verification
            </p>
          </div>
        )}

        <div className="action-buttons">
          <button 
            className="track-order-btn" 
            onClick={() => navigate(`/order-tracking/${orderId}`)}
          >
            Track Order Now
          </button>
          <button 
            className="my-orders-btn" 
            onClick={() => navigate('/my-orders')}
          >
            View All Orders
          </button>
          <button 
            className="home-btn" 
            onClick={() => navigate('/home')}
          >
            Back to Home
          </button>
        </div>

        <div className="email-notification">
          <p>📧 A confirmation email has been sent to your registered email address</p>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
