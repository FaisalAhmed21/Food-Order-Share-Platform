import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './StripePaymentForm.css';

const StripePaymentForm = ({ clientSecret, amount, onSuccess, onError, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        setIsProcessing(false);
        onError(stripeError);
      } else if (paymentIntent.status === 'succeeded') {
        setIsProcessing(false);
        onSuccess(paymentIntent);
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
      onError(err);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSmoothing: 'antialiased',
      },
      invalid: {
        color: '#9e2146',
        iconColor: '#fa755a',
      },
    },
    hidePostalCode: true,
  };

  return (
    <div className="stripe-payment-form">
      <div className="payment-header">
        <h3>💳 Enter Card Details</h3>
        <p className="amount-display">Total Amount: ৳{amount}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card-element-container">
          <label>Card Information</label>
          <CardElement options={cardElementOptions} />
        </div>

        {error && (
          <div className="payment-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="payment-info-box">
          <p>🔒 Your payment is secure and encrypted</p>
          <p>💰 You will be charged ${(amount / 110).toFixed(2)} USD</p>
          <p>📧 Receipt will be sent to your email</p>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="pay-btn"
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              <>
                💳 Pay ৳{amount}
              </>
            )}
          </button>
        </div>

        <div className="test-cards-info">
          <details>
            <summary>🧪 Test Card Numbers</summary>
            <ul>
              <li><strong>Success:</strong> 4242 4242 4242 4242</li>
              <li><strong>Decline:</strong> 4000 0000 0000 0002</li>
              <li><strong>Requires Auth:</strong> 4000 0025 0000 3155</li>
              <li>Use any future expiry date and any 3-digit CVV</li>
            </ul>
          </details>
        </div>
      </form>
    </div>
  );
};

export default StripePaymentForm;
