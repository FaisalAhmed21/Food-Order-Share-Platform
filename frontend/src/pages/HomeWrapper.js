import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Home from './Home';
import CustomerHome from './CustomerHome';

export default function HomeWrapper() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('userData');
    
    if (token && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        const role = userData.role?.toLowerCase();
        setUserRole(role);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid rgba(255,255,255,0.3)',
            borderTop: '5px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show CustomerHome for customers, original Home for others
  if (userRole === 'customer') {
    return <CustomerHome />;
  }
  
  return <Home />;
}

