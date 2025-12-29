import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '../components/StripePaymentForm';
import MapPicker from '../components/MapPicker';
import './Checkout.css';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe('pk_test_51SbgAcRERhI20F80TAWMtdl1FNCHE46JnyECb6LDPk5tVtEAuRpfwQMf8fJFWtgl6DFQBF4hpMxc9sicedA0bVLN00MuMefN4Z');

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, restaurant } = location.state || { cart: [], restaurant: {} };

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [newAddress, setNewAddress] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    area: '',
    city: 'Dhaka',
    zipCode: '',
    fullAddress: '',
    coordinates: { lat: 23.8103, lng: 90.4125 }
  });
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  const [orderMode, setOrderMode] = useState('self'); // 'self', 'donate', 'both'
  const [donateAmount, setDonateAmount] = useState(0);
  const [selectedNGO, setSelectedNGO] = useState('auto');
  
  const [deliveryTime, setDeliveryTime] = useState('asap');
  const [scheduledTime, setScheduledTime] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [contactNumber, setContactNumber] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      navigate('/restaurants');
      return;
    }
    fetchAddresses();
    fetchUserContact();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user/addresses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAddresses(data.addresses || []);
      if (data.addresses && data.addresses.length > 0) {
        setSelectedAddress(data.addresses[0]._id);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const fetchUserContact = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setContactNumber(data.user?.phone || '');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const addNewAddress = async () => {
    if (!newAddress.trim()) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/user/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ address: newAddress })
      });
      const data = await response.json();
      
      if (data.success) {
        setAddresses([...addresses, data.address]);
        setSelectedAddress(data.address._id);
        setNewAddress('');
        setShowAddressModal(false);
      }
    } catch (error) {
      console.error('Error adding address:', error);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
  };

  const getDeliveryFee = () => {
    return restaurant.deliveryFee || 50;
  };

  const getTax = () => {
    return (getCartTotal() + getDeliveryFee()) * 0.05;
  };

  const getFinalTotal = () => {
    let total = getCartTotal() + getDeliveryFee() + getTax();
    if (orderMode === 'donate' || orderMode === 'both') {
      total += donateAmount;
    }
    return total;
  };

  const validateOrder = () => {
    if (!selectedAddress) {
      alert('Please select a delivery address');
      return false;
    }
    if (!contactNumber) {
      alert('Please provide a contact number');
      return false;
    }
    if (!paymentMethod) {
      alert('Please select a payment method');
      return false;
    }
    if (deliveryTime === 'scheduled' && !scheduledTime) {
      alert('Please select a delivery time');
      return false;
    }
    return true;
  };

  const processPayment = async () => {
    if (!validateOrder()) return;

    // Check if OTP required for large donations
    if ((orderMode === 'donate' || orderMode === 'both') && donateAmount > 50 && !otpRequired) {
      setOtpRequired(true);
      // Send OTP
      await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: contactNumber })
      });
      return;
    }

    if (otpRequired && !otp) {
      alert('Please enter the OTP sent to your phone');
      return;
    }

    const orderData = {
      restaurant,
      cart,
      address: selectedAddress,
      contactNumber,
      orderMode,
      donateAmount,
      selectedNGO,
      deliveryTime,
      scheduledTime,
      paymentMethod,
      totals: {
        subtotal: getCartTotal(),
        deliveryFee: getDeliveryFee(),
        tax: getTax(),
        donation: donateAmount,
        total: getFinalTotal()
      }
    };

    try {
      if (paymentMethod === 'bkash') {
        navigate('/bkash-payment', { state: { orderData } });
      } else if (paymentMethod === 'stripe') {
        // Use new Stripe payment API
        setIsProcessing(true);
        await processStripePayment();
      } else if (paymentMethod === 'cod') {
        // For COD, directly create order
        setIsProcessing(true);
        completeOrder();
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setIsProcessing(false);
      alert('Payment failed. Please try again.');
    }
  };

  const processStripePayment = async () => {
    try {
      // Validate delivery address
      if (!deliveryAddress.fullAddress || !deliveryAddress.coordinates.lat || !deliveryAddress.coordinates.lng) {
        alert('Please provide a complete delivery address with location');
        setIsProcessing(false);
        return;
      }
      
      // Create payment intent
      const paymentResponse = await fetch('http://localhost:5000/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          restaurantId: restaurant._id,
          items: cart.map(item => ({
            menuItemId: item._id,
            quantity: item.quantity,
            price: item.finalPrice,
            name: item.name
          })),
          deliveryAddress: {
            fullAddress: deliveryAddress.fullAddress,
            street: deliveryAddress.street,
            area: deliveryAddress.area,
            city: deliveryAddress.city,
            zipCode: deliveryAddress.zipCode,
            coordinates: deliveryAddress.coordinates
          },
          contactPhone: contactNumber
        })
      });

      const paymentData = await paymentResponse.json();

      if (!paymentData.success) {
        throw new Error(paymentData.message || 'Failed to create payment');
      }

      // Store client secret and order ID, then show payment form
      setClientSecret(paymentData.clientSecret);
      setCurrentOrderId(paymentData.orderId);
      setIsProcessing(false);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Payment setup error:', error);
      setIsProcessing(false);
      alert('Failed to setup payment: ' + error.message);
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      setIsProcessing(true);
      
      // Confirm payment on backend
      const confirmResponse = await fetch('http://localhost:5000/api/payments/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderId: currentOrderId,
          paymentIntentId: paymentIntent.id,
          testMode: false // Real payment mode
        })
      });

      const confirmData = await confirmResponse.json();

      if (confirmData.success) {
        // Clear cart
        await fetch('http://localhost:5000/api/cart/clear', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        setIsProcessing(false);
        setShowPaymentModal(false);

        // Navigate to order confirmation
        navigate('/order-confirmation', { 
          state: { 
            orderId: confirmData.order._id,
            orderNumber: confirmData.order.orderNumber,
            estimatedTime: 30,
            total: getFinalTotal()
          } 
        });
      } else {
        throw new Error(confirmData.message || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      setIsProcessing(false);
      alert('Payment confirmation failed: ' + error.message);
    }
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    setIsProcessing(false);
    alert('Payment failed: ' + error.message);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setClientSecret('');
    setCurrentOrderId('');
  };

  const completeOrder = async () => {
    try {
      const orderData = {
        restaurant: restaurant._id,
        items: cart,
        deliveryAddress: selectedAddress,
        contactNumber,
        orderMode,
        donateAmount: orderMode !== 'self' ? donateAmount : 0,
        selectedNGO: orderMode !== 'self' ? selectedNGO : null,
        deliveryTime: deliveryTime === 'asap' ? 'ASAP' : scheduledTime,
        paymentMethod,
        totals: {
          subtotal: getCartTotal(),
          deliveryFee: getDeliveryFee(),
          tax: getTax(),
          donation: orderMode !== 'self' ? donateAmount : 0,
          total: getFinalTotal()
        }
      };

      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (data.success) {
        // Clear cart
        await fetch('http://localhost:5000/api/cart/clear', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        setIsProcessing(false);
        setShowPaymentModal(false);

        // Navigate to order confirmation
        navigate('/order-confirmation', { 
          state: { 
            orderId: data.order._id,
            orderNumber: data.order.orderNumber,
            estimatedTime: data.order.estimatedTime,
            qrCode: data.order.qrCode
          } 
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error completing order:', error);
      setIsProcessing(false);
      setShowPaymentModal(false);
      alert('Order failed. Please try again.');
    }
  };

  const ngos = [
    { id: 'auto', name: 'Let Platform Decide' },
    { id: 'ngo1', name: 'Food For All Bangladesh' },
    { id: 'ngo2', name: 'Hunger Free World' },
    { id: 'ngo3', name: 'Share A Meal Foundation' }
  ];

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1>Checkout</h1>
      </div>

      <div className="checkout-content">
        {/* Left Column */}
        <div className="checkout-form">
          {/* Delivery Address */}
          <div className="checkout-section">
            <h2>📍 Delivery Address</h2>
            
            <div className="address-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Street Address *</label>
                  <input
                    type="text"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                    placeholder="House/Flat No, Street Name"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Area/Neighborhood *</label>
                  <input
                    type="text"
                    value={deliveryAddress.area}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, area: e.target.value})}
                    placeholder="e.g., Gulshan, Dhanmondi"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                    placeholder="Dhaka"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Zip Code</label>
                  <input
                    type="text"
                    value={deliveryAddress.zipCode}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, zipCode: e.target.value})}
                    placeholder="1212"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Full Address *</label>
                <textarea
                  value={deliveryAddress.fullAddress}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, fullAddress: e.target.value})}
                  placeholder="Complete delivery address with landmarks"
                  rows="3"
                  required
                />
              </div>
              
              <button 
                type="button"
                className="map-picker-btn"
                onClick={() => setShowMapPicker(true)}
              >
                📍 Pick Location on Map
              </button>
              
              {deliveryAddress.coordinates.lat && deliveryAddress.coordinates.lng && (
                <div className="coordinates-display">
                  <small>
                    📌 Location: {deliveryAddress.coordinates.lat.toFixed(6)}, {deliveryAddress.coordinates.lng.toFixed(6)}
                  </small>
                </div>
              )}
            </div>

            <div className="contact-input">
              <label>Contact Number *</label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Enter your contact number"
                required
              />
            </div>
          </div>

          {/* Order Mode */}
          <div className="checkout-section">
            <h2>🍽️ Order Mode</h2>
            
            <div className="order-mode-options">
              <label className={`mode-card ${orderMode === 'self' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="orderMode"
                  value="self"
                  checked={orderMode === 'self'}
                  onChange={() => setOrderMode('self')}
                />
                <div className="mode-content">
                  <span className="mode-icon">🛍️</span>
                  <h3>Order for Me</h3>
                  <p>Regular food order</p>
                </div>
              </label>

              <label className={`mode-card ${orderMode === 'donate' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="orderMode"
                  value="donate"
                  checked={orderMode === 'donate'}
                  onChange={() => setOrderMode('donate')}
                />
                <div className="mode-content">
                  <span className="mode-icon">❤️</span>
                  <h3>Donate a Meal</h3>
                  <p>Help feed someone in need</p>
                </div>
              </label>

              <label className={`mode-card ${orderMode === 'both' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="orderMode"
                  value="both"
                  checked={orderMode === 'both'}
                  onChange={() => setOrderMode('both')}
                />
                <div className="mode-content">
                  <span className="mode-icon">🤝</span>
                  <h3>Order + Donate</h3>
                  <p>Get your meal and donate too</p>
                </div>
              </label>
            </div>

            {(orderMode === 'donate' || orderMode === 'both') && (
              <div className="donation-details">
                <div className="donation-info">
                  <p>💝 Your donation will provide meals to those in need</p>
                </div>

                <div className="donation-amount">
                  <label>Donation Amount (BDT):</label>
                  <input
                    type="number"
                    min="5"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="ngo-selection">
                  <label>Select NGO:</label>
                  <select value={selectedNGO} onChange={(e) => setSelectedNGO(e.target.value)}>
                    {ngos.map(ngo => (
                      <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Time */}
          <div className="checkout-section">
            <h2>🕒 Delivery Time</h2>
            
            <div className="delivery-time-options">
              <label className={`time-option ${deliveryTime === 'asap' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="deliveryTime"
                  value="asap"
                  checked={deliveryTime === 'asap'}
                  onChange={() => setDeliveryTime('asap')}
                />
                <span>⚡ ASAP (~{restaurant.deliveryTime || 30} mins)</span>
              </label>

              <label className={`time-option ${deliveryTime === 'scheduled' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="deliveryTime"
                  value="scheduled"
                  checked={deliveryTime === 'scheduled'}
                  onChange={() => setDeliveryTime('scheduled')}
                />
                <span>📅 Schedule for later</span>
              </label>
            </div>

            {deliveryTime === 'scheduled' && (
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="datetime-input"
              />
            )}
          </div>

          {/* Payment Method */}
          <div className="checkout-section">
            <h2>💳 Payment Method</h2>
            
            <div className="payment-methods">
              <label className={`payment-option ${paymentMethod === 'bkash' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="bkash"
                  checked={paymentMethod === 'bkash'}
                  onChange={() => setPaymentMethod('bkash')}
                />
                <div className="payment-content">
                  <span className="payment-icon">💰</span>
                  <span>bKash</span>
                </div>
              </label>

              <label className={`payment-option ${paymentMethod === 'stripe' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => setPaymentMethod('stripe')}
                />
                <div className="payment-content">
                  <span className="payment-icon">💳</span>
                  <span>Card (Stripe)</span>
                </div>
              </label>

              <label className={`payment-option ${paymentMethod === 'cod' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div className="payment-content">
                  <span className="payment-icon">💵</span>
                  <span>Cash on Delivery</span>
                </div>
              </label>
            </div>

            {otpRequired && (
              <div className="otp-section">
                <p>⚠️ OTP verification required for large donations</p>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="otp-input"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="order-summary-sidebar">
          <h2>Order Summary</h2>
          
          <div className="summary-restaurant">
            <h3>{restaurant.name}</h3>
            <p>{restaurant.address?.fullAddress || restaurant.address?.area || 'Address not available'}</p>
          </div>

          <div className="summary-items">
            {cart.map(item => (
              <div key={item.cartId} className="summary-item">
                <div className="item-info">
                  <span className="item-name">{item.name} x{item.quantity}</span>
                  {item.customization.size && (
                    <span className="item-detail">Size: {item.customization.size}</span>
                  )}
                </div>
                <span className="item-price">৳{(item.finalPrice * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="summary-totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>৳{getCartTotal().toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Delivery Fee:</span>
              <span>৳{getDeliveryFee().toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Tax (5%):</span>
              <span>৳{getTax().toFixed(2)}</span>
            </div>
            {(orderMode === 'donate' || orderMode === 'both') && donateAmount > 0 && (
              <div className="total-row donation-row">
                <span>❤️ Donation:</span>
                <span>৳{donateAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="total-row final-total">
              <span>Total:</span>
              <span>৳{getFinalTotal().toFixed(2)}</span>
            </div>
          </div>

          <button 
            className="place-order-btn" 
            onClick={processPayment}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : `Place Order - ৳${getFinalTotal().toFixed(2)}`}
          </button>

          <div className="security-note">
            <p>🔒 Your payment information is secure</p>
          </div>
        </div>
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPicker
          initialLat={deliveryAddress.coordinates.lat}
          initialLng={deliveryAddress.coordinates.lng}
          onLocationSelect={(location) => {
            setDeliveryAddress({
              ...deliveryAddress,
              coordinates: location
            });
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="modal-overlay" onClick={() => setShowAddressModal(false)}>
          <div className="address-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Address</h2>
            <textarea
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Enter your full delivery address..."
              rows={5}
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowAddressModal(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={addNewAddress}>
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      {showPaymentModal && clientSecret && (
        <div className="modal-overlay">
          <div className="payment-modal stripe-modal">
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripePaymentForm
                clientSecret={clientSecret}
                amount={getFinalTotal()}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handlePaymentCancel}
              />
            </Elements>
          </div>
        </div>
      )}

      {/* Processing Modal */}
      {isProcessing && !showPaymentModal && (
        <div className="modal-overlay">
          <div className="payment-modal">
            <div className="processing-animation">
              <div className="spinner"></div>
              <h2>Processing...</h2>
              <p>Please wait</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
