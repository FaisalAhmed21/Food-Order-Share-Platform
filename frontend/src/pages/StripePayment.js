import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './StripePayment.css';

const StripePayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderData } = location.state || {};
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderData) {
      navigate('/checkout');
    }
  }, [orderData, navigate]);

  const bdtToUsd = (bdt) => {
    const exchangeRate = 110; // 1 USD = 110 BDT (approximate)
    return (bdt / exchangeRate).toFixed(2);
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // 16 digits + 3 spaces
  };

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateCardWithLuhn = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cleaned)) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const validateForm = () => {
    const newErrors = {};

    const cleanedCardNumber = cardNumber.replace(/\s/g, '');
    if (!cardNumber || cleanedCardNumber.length !== 16) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number';
    } else if (!validateCardWithLuhn(cardNumber)) {
      newErrors.cardNumber = 'Invalid card number. Please check and try again';
    }

    if (!cardName || cardName.trim().length < 3) {
      newErrors.cardName = 'Please enter cardholder name';
    }

    if (!expiryDate || expiryDate.length !== 5) {
      newErrors.expiryDate = 'Please enter valid expiry date (MM/YY)';
    } else {
      const [month, year] = expiryDate.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (parseInt(month) < 1 || parseInt(month) > 12) {
        newErrors.expiryDate = 'Invalid month';
      } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiryDate = 'Card has expired';
      }
    }

    if (!cvv || cvv.length < 3) {
      newErrors.cvv = 'Please enter valid CVV';
    }

    if (!zipCode || zipCode.length < 4) {
      newErrors.zipCode = 'Please enter valid ZIP code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setLoading(true);

    // Simulate Stripe payment processing
    setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...orderData,
            paymentStatus: 'paid',
            paymentMethod: 'stripe',
            stripePaymentId: `pi_${Date.now()}`,
            amountUSD: parseFloat(bdtToUsd(orderData.totals.total))
          })
        });

        const data = await response.json();
        
        if (data.success) {
          setLoading(false);
          // Navigate directly to order tracking page
          navigate(`/order-tracking/${data.order._id}`);
        } else {
          setLoading(false);
          setErrors({ general: 'Payment failed. Please try again.' });
        }
      } catch (error) {
        setLoading(false);
        setErrors({ general: 'Something went wrong. Please try again.' });
      }
    }, 2000);
  };

  if (!orderData) return null;

  return (
    <div className="stripe-container">
      <div className="stripe-header">
        <button className="back-btn" onClick={() => navigate('/checkout')}>
          ← Back to Checkout
        </button>
        <div className="stripe-logo">
          <svg viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" width="60" height="25">
            <path fill="#635BFF" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"/>
          </svg>
        </div>
      </div>

      <div className="stripe-content">
        <div className="payment-container">
          <div className="payment-form-card">
            <h2>Payment Details</h2>
            
            {errors.general && (
              <div className="error-banner">{errors.general}</div>
            )}

            <div className="form-group">
              <label>Card Number</label>
              <div className="card-input-wrapper">
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className={errors.cardNumber ? 'error' : ''}
                />
                <div className="card-icons">
                  <span className="card-icon">💳</span>
                </div>
              </div>
              {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
            </div>

            <div className="form-group">
              <label>Cardholder Name</label>
              <input
                type="text"
                placeholder="JOHN DOE"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                className={errors.cardName ? 'error' : ''}
              />
              {errors.cardName && <span className="error-text">{errors.cardName}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  maxLength="5"
                  className={errors.expiryDate ? 'error' : ''}
                />
                {errors.expiryDate && <span className="error-text">{errors.expiryDate}</span>}
              </div>

              <div className="form-group">
                <label>CVV</label>
                <input
                  type="password"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength="4"
                  className={errors.cvv ? 'error' : ''}
                />
                {errors.cvv && <span className="error-text">{errors.cvv}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>ZIP Code</label>
              <input
                type="text"
                placeholder="12345"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={errors.zipCode ? 'error' : ''}
              />
              {errors.zipCode && <span className="error-text">{errors.zipCode}</span>}
            </div>

            <button 
              className="pay-button"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? 'Processing...' : `Pay $${bdtToUsd(orderData.totals.total)} USD`}
            </button>

            <div className="security-info">
              <span>🔒 Secured by Stripe</span>
              <p>Your payment information is encrypted and secure</p>
            </div>
          </div>

          <div className="order-summary-card">
            <h3>Order Summary</h3>
            
            <div className="summary-items">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>৳{orderData.totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>৳{orderData.totals.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax</span>
                <span>৳{orderData.totals.tax.toFixed(2)}</span>
              </div>
              {orderData.totals.donation > 0 && (
                <div className="summary-row">
                  <span>Donation</span>
                  <span>৳{orderData.totals.donation.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="summary-total">
              <div className="total-row">
                <span>Total (BDT)</span>
                <span>৳{orderData.totals.total.toFixed(2)}</span>
              </div>
              <div className="total-row usd">
                <span>Total (USD)</span>
                <span>${bdtToUsd(orderData.totals.total)}</span>
              </div>
            </div>

            <div className="conversion-note">
              <small>Exchange rate: 1 USD = 110 BDT (approx.)</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripePayment;
