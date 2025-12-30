import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './BkashPayment.css';

const BkashPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderData } = location.state || {};
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderData) {
      navigate('/checkout');
    }
  }, [orderData, navigate]);

  const formatCurrency = (amount) => {
    return `৳${amount.toFixed(2)}`;
  };

  const validateBkashNumber = (number) => {
    // bKash numbers in Bangladesh start with 01 and are 11 digits
    const validPrefixes = ['013', '014', '015', '016', '017', '018', '019'];
    if (number.length !== 11) return false;
    const prefix = number.substring(0, 3);
    return validPrefixes.includes(prefix);
  };

  const handleSendOTP = () => {
    setError('');
    if (!phoneNumber || phoneNumber.length !== 11) {
      setError('Please enter a valid 11-digit mobile number');
      return;
    }
    if (!validateBkashNumber(phoneNumber)) {
      setError('Please enter a valid bKash number (must start with 013/014/015/016/017/018/019)');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1500);
  };

  const handleVerifyPIN = () => {
    setError('');
    if (!pin || pin.length !== 5) {
      setError('Please enter your 5-digit PIN');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1500);
  };

  const handleConfirmPayment = async () => {
    setError('');
    if (!otp || otp.length !== 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }
    
    setLoading(true);
    
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
          paymentMethod: 'bkash',
          bkashTransactionId: `TXN${Date.now()}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Navigate directly to order tracking page
        navigate(`/order-tracking/${data.order._id}`);
      } else {
        setLoading(false);
        setError('Payment failed. Please try again.');
      }
    } catch (error) {
      setLoading(false);
      setError('Something went wrong. Please try again.');
    }
  };

  if (!orderData) return null;

  return (
    <div className="bkash-container">
      <div className="bkash-header">
        <button className="back-btn" onClick={() => navigate('/checkout')}>
          ← Back
        </button>
        <img src="https://seeklogo.com/images/B/bkash-logo-835789094C-seeklogo.com.png" alt="bKash" className="bkash-logo" />
      </div>

      <div className="bkash-content">
        <div className="payment-card">
          {/* Step 1: Enter Phone Number */}
          {step === 1 && (
            <div className="payment-step">
              <div className="step-header">
                <h2>Payment with bKash</h2>
                <p className="amount-display">{formatCurrency(orderData.totals.total)}</p>
              </div>

              <div className="form-section">
                <label>Your bKash Account Number</label>
                <div className="phone-input-wrapper">
                  <span className="country-code">+880</span>
                  <input
                    type="tel"
                    placeholder="1XXXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    maxLength="11"
                    className="phone-input"
                  />
                </div>
                {error && <p className="error-message">{error}</p>}

                <div className="info-box">
                  <p>📱 A verification code will be sent to this number</p>
                </div>

                <button 
                  className="bkash-btn primary"
                  onClick={handleSendOTP}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Proceed'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Enter PIN */}
          {step === 2 && (
            <div className="payment-step">
              <div className="step-header">
                <h2>Enter Your bKash PIN</h2>
                <p className="phone-display">+880 {phoneNumber}</p>
              </div>

              <div className="form-section">
                <label>bKash PIN</label>
                <input
                  type="password"
                  placeholder="* * * * *"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  maxLength="5"
                  className="pin-input"
                />
                {error && <p className="error-message">{error}</p>}

                <div className="payment-details">
                  <div className="detail-row">
                    <span>Merchant:</span>
                    <span>FoodShare Bangladesh</span>
                  </div>
                  <div className="detail-row">
                    <span>Invoice:</span>
                    <span>#{Date.now().toString().slice(-8)}</span>
                  </div>
                  <div className="detail-row total">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(orderData.totals.total)}</span>
                  </div>
                </div>

                <button 
                  className="bkash-btn primary"
                  onClick={handleVerifyPIN}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Confirm'}
                </button>
                <button 
                  className="bkash-btn secondary"
                  onClick={() => setStep(1)}
                >
                  Change Number
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Enter OTP */}
          {step === 3 && (
            <div className="payment-step">
              <div className="step-header">
                <h2>Enter OTP</h2>
                <p className="phone-display">Code sent to +880 {phoneNumber}</p>
              </div>

              <div className="form-section">
                <label>Enter 4-digit OTP</label>
                <input
                  type="text"
                  placeholder="* * * *"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength="4"
                  className="otp-input"
                />
                {error && <p className="error-message">{error}</p>}

                <div className="info-box">
                  <p>⏱️ OTP will expire in 2:00 minutes</p>
                  <button className="resend-btn">Resend OTP</button>
                </div>

                <button 
                  className="bkash-btn primary"
                  onClick={handleConfirmPayment}
                  disabled={loading}
                >
                  {loading ? 'Processing Payment...' : 'Confirm Payment'}
                </button>
                <button 
                  className="bkash-btn secondary"
                  onClick={() => setStep(2)}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="security-badge">
          <span>🔒 Secured by bKash</span>
        </div>
      </div>
    </div>
  );
};

export default BkashPayment;
