import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyDonations.css';

const MyDonations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('userData');
    if (!token || !userDataStr) {
      navigate('/login');
      return;
    }

    fetchDonations();
  }, [navigate]);

  const fetchDonations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/donations/my-donations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        // The backend already limits to 10, but we'll ensure it here too
        const recentDonations = (data.donations || []).slice(0, 10);
        setDonations(recentDonations);
      }
    } catch (err) {
      console.error('Failed to fetch donations', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="my-donations-container"><p>Loading...</p></div>;

  return (
    <div className="my-donations-container">
      <div className="header-row">
        <button className="back-btn" onClick={() => navigate('/home')}>← Back</button>
        <h1>My Donations</h1>
      </div>

      {donations.length === 0 ? (
        <div className="no-donations">
          <p>No donations yet. Start by donating surplus food.</p>
          <button onClick={() => navigate('/donate-food')} className="donate-now">Donate Now</button>
        </div>
      ) : (
        <div className="donations-list">
          {donations.map(d => (
            <div className="donation-card" key={d._id}>
              <div className="donation-left">
                <h3>{d.title}</h3>
                <p className="meta">{d.quantity} • {d.servings} servings • {d.foodType}</p>
                <p className="status">Status: <strong>{d.status}</strong></p>
                <p className="expiry">Expires: {new Date(d.expiryDateTime).toLocaleString()}</p>
              </div>
              <div className="donation-right">
                {d.photos && d.photos[0] && (
                  <img src={d.photos[0].url} alt="food" />
                )}
                <div className="card-actions">
                  <button onClick={() => navigate('/donate-food', { state: { donationId: d._id } })}>Edit</button>
                  <button onClick={() => navigate(`/donation-tracking/${d._id}`)}>View Details</button>
                  {d.assignedVolunteer ? (
                    <div className="assigned-volunteer-small" style={{ color: '#28a745', fontWeight: 'bold' }}>
                      ✅ Volunteer: {d.assignedVolunteer.name || 'Assigned'}
                    </div>
                  ) : (
                    <div className="assigned-volunteer-small" style={{ color: '#999' }}>
                      ⏳ No volunteer yet
                    </div>
                  )}
                  <button 
                    className="btn-track" 
                    onClick={() => navigate('/donation-tracking', { state: { donationId: d._id } })}
                    style={{ 
                      background: d.assignedVolunteer ? '#28a745' : '#6c757d',
                      color: 'white',
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {d.assignedVolunteer ? '📍 Track Live' : '👁️ View Details'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDonations;
