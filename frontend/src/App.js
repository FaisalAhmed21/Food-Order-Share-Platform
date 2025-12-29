import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Profile from './pages/Profile'; // Import Profile
import EditProfile from './pages/EditProfile'; // Import EditProfile
import ForgotPassword from './pages/ForgotPassword'; // Import ForgotPassword
import ResetPassword from './pages/ResetPassword'; // Import ResetPassword
import DonationTracker from './pages/DonationTracker'; // Import DonationTracker
import OrderAnalytics from './pages/OrderAnalytics'; // Import OrderAnalytics
import VolunteerPanel from './pages/VolunteerPanel'; // Import VolunteerPanel
import DonationAcknowledgement from './pages/DonationAcknowledgement'; // Import DonationAcknowledgement

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} /> {/* Add Profile route */}
          <Route path="/edit-profile" element={<EditProfile />} /> {/* Add EditProfile route */}
          <Route path="/forgot-password" element={<ForgotPassword />} /> {/* Add ForgotPassword route */}
          <Route path="/reset-password" element={<ResetPassword />} /> {/* Add ResetPassword route */}
          <Route path="/donation-tracker" element={<DonationTracker />} /> {/* Add DonationTracker route */}
          <Route path="/order-analytics" element={<OrderAnalytics />} /> {/* Add OrderAnalytics route */}
          <Route path="/volunteer-panel" element={<VolunteerPanel />} /> {/* Add VolunteerPanel route */}
          <Route path="/donation-acknowledgement" element={<DonationAcknowledgement />} /> {/* Add DonationAcknowledgement route */}
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
