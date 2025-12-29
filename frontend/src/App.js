import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Restaurants from './pages/Restaurants';
import RestaurantMenu from './pages/RestaurantMenu';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderTracking from './pages/OrderTracking';
import RestaurantDashboard from './pages/RestaurantDashboard';
import BkashPayment from './pages/BkashPayment';
import StripePayment from './pages/StripePayment';
import OwnerLogin from './pages/OwnerLogin';
import OwnerRegister from './pages/OwnerRegister';
import OwnerDashboard from './pages/OwnerDashboard';
import MyOrders from './pages/MyOrders';
import ReviewOrders from './pages/ReviewOrders';
import DonateFoodForm from './pages/DonateFoodForm';
import MyDonations from './pages/MyDonations';
import NGOMap from './pages/NGOMap';
import NearbyMap from './pages/NearbyMap';
import RestaurantNGOMap from './pages/RestaurantNGOMap';
import VolunteerDashboard from './pages/VolunteerDashboard';
import DonationDetails from './pages/DonationDetails';
import DonationTracking from './pages/DonationTracking';
import DonationTrackingDetail from './pages/DonationTrackingDetail';
import ScheduledPickups from './pages/ScheduledPickups';
import Campaigns from './pages/Campaigns';
import NGOCampaigns from './pages/NGOCampaigns';
import AdminDashboard from './pages/AdminDashboard';
import AdminRestaurants from './pages/AdminRestaurants';
import AdminRestaurantDetail from './pages/AdminRestaurantDetail';
import AdminNGOs from './pages/AdminNGOs';
import AdminCampaigns from './pages/AdminCampaigns';
import AdminManageRestaurants from './pages/AdminManageRestaurants';
import AdminRestaurantMenu from './pages/AdminRestaurantMenu';
import OrderTrackingDetail from './pages/OrderTrackingDetail';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/restaurant/:id" element={<RestaurantMenu />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/bkash-payment" element={<BkashPayment />} />
          <Route path="/stripe-payment" element={<StripePayment />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/order-tracking" element={<OrderTracking />} />
          <Route path="/order-tracking/:orderId" element={<ProtectedRoute><OrderTrackingDetail /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
          <Route path="/review-orders" element={<ProtectedRoute><ReviewOrders /></ProtectedRoute>} />
          <Route path="/donate-food" element={<ProtectedRoute allowedRoles={["Customer","Restaurant"]}><DonateFoodForm /></ProtectedRoute>} />
          <Route path="/my-donations" element={<ProtectedRoute allowedRoles={["Customer","Restaurant"]}><MyDonations /></ProtectedRoute>} />
          <Route path="/donation-tracking" element={<ProtectedRoute><DonationTracking /></ProtectedRoute>} />
          <Route path="/donation-tracking/:donationId" element={<ProtectedRoute><DonationTrackingDetail /></ProtectedRoute>} />

          {/* NGO / Volunteer pages */}
          <Route path="/ngo-map" element={<ProtectedRoute allowedRoles={["NGO","Customer","Restaurant"]}><NGOMap /></ProtectedRoute>} />
          <Route path="/nearby-map" element={<ProtectedRoute allowedRoles={["Customer"]}><NearbyMap /></ProtectedRoute>} />
          <Route path="/restaurant-ngo-map" element={<ProtectedRoute allowedRoles={["Restaurant"]}><RestaurantNGOMap /></ProtectedRoute>} />
          <Route path="/volunteer-dashboard" element={<ProtectedRoute allowedRoles={["Volunteer"]}><VolunteerDashboard /></ProtectedRoute>} />
          <Route path="/donation-details" element={<ProtectedRoute><DonationDetails /></ProtectedRoute>} />
          <Route path="/scheduled-pickups" element={<ProtectedRoute allowedRoles={["Customer","Restaurant"]}><ScheduledPickups /></ProtectedRoute>} />
          <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
          <Route path="/ngo/campaigns" element={<ProtectedRoute allowedRoles={["NGO"]}><NGOCampaigns /></ProtectedRoute>} />
          <Route path="/restaurant-dashboard" element={<RestaurantDashboard />} />
          
          {/* Owner Routes */}
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/owner/register" element={<OwnerRegister />} />
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/manage-restaurants" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminManageRestaurants /></ProtectedRoute>} />
          <Route path="/admin/restaurant/:id/menu" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminRestaurantMenu /></ProtectedRoute>} />
          <Route path="/admin/campaigns" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminCampaigns /></ProtectedRoute>} />
          <Route path="/admin/ngos" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminNGOs /></ProtectedRoute>} />
          <Route path="/admin/ngos-manage" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminNGOs /></ProtectedRoute>} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
