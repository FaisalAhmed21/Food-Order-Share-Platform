import React from 'react';
import { Navigate } from 'react-router-dom';

// Usage: <ProtectedRoute allowedRoles={["Customer","Restaurant"]}><MyComponent/></ProtectedRoute>
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const token = localStorage.getItem('token');
  const userDataStr = localStorage.getItem('userData');

  if (!token || !userDataStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userDataStr);
    // Normalize role string comparisons
    const userRole = (user.role || '').toString().toLowerCase();
    if (allowedRoles.length === 0) {
      // Any logged in user allowed
      return children;
    }

    const normalizedAllowed = allowedRoles.map(r => r.toString().toLowerCase());
    if (normalizedAllowed.includes(userRole)) {
      return children;
    }

    // Not authorized for this route
    return <Navigate to="/" replace />;
  } catch (err) {
    console.error('ProtectedRoute parse error', err);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
