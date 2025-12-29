import React, { useEffect, useState, useRef } from 'react';
import './VolunteerDashboard.css';
import { useNavigate } from 'react-router-dom';

const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    fetchMyAssignments();
  }, [navigate]);
  const [pending, setPending] = useState([]);

  // WebSocket for sending live location updates
  const wsRef = useRef(null);
  const geoWatchId = useRef(null);

  useEffect(() => {
    try {
      const userDataStr = localStorage.getItem('userData');
      const user = userDataStr ? JSON.parse(userDataStr) : null;
      if (!user) return;

      const ws = new WebSocket('ws://localhost:5000');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Volunteer WS connected');
      };

      ws.onerror = (e) => { console.error('Volunteer WS error', e); };

      // Start geolocation watch if available
      if (navigator.geolocation) {
        const volunteerId = user.id || user._id;
        geoWatchId.current = navigator.geolocation.watchPosition((pos) => {
          const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'VOLUNTEER_LOCATION', volunteerId, location }));
          }
        }, (err) => {
          console.error('Geolocation error', err);
        }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
      }

      return () => {
        if (geoWatchId.current !== null) navigator.geolocation.clearWatch(geoWatchId.current);
        if (wsRef.current) wsRef.current.close();
      };
    } catch (err) {
      console.error('Error setting up volunteer location WS', err);
    }
  }, []);

  const fetchMyAssignments = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/volunteers/my-assignments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments || []);
        setPending(data.pending || []);
      }
    } catch (err) {
      console.error('Failed to fetch assignments', err);
    } finally { setLoading(false); }
  };

  const acceptAssignment = async (donationId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/volunteers/assignment/${donationId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        fetchMyAssignments();
      } else {
        alert(data.message || 'Failed to accept assignment');
      }
    } catch (err) {
      console.error('Error accepting assignment', err);
      alert('Error accepting assignment');
    }
  };

  const declineAssignment = async (donationId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/volunteers/assignment/${donationId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        fetchMyAssignments();
      } else {
        alert(data.message || 'Failed to decline assignment');
      }
    } catch (err) {
      console.error('Error declining assignment', err);
      alert('Error declining assignment');
    }
  };

  return (
    <div className="volunteer-container">
      <div className="header-row">
        <button className="back-btn" onClick={() => navigate('/home')}>← Back</button>
        <h1>Volunteer Dashboard</h1>
      </div>

      {loading ? <p>Loading...</p> : (
        <div className="assignments-list">
          <h2>Pending Assignments</h2>
          {pending.length === 0 ? <p>No pending assignments</p> : pending.map((p, idx) => (
            <div key={idx} className="assignment-card pending">
              <div>
                <h3>{p.donation?.title || 'Donation'}</h3>
                <p>Donor: {p.donation?.donor?.name || 'Unknown'}</p>
                <p>Pickup: {p.donation?.pickupAddress?.fullAddress}</p>
                <p>Notified: {new Date(p.notifiedAt).toLocaleString()}</p>
              </div>
              <div className="assignment-actions">
                <button onClick={() => navigate('/donation-details', { state: { donationId: p.donation?._id } })}>View</button>
                <button onClick={() => acceptAssignment(p.donation?._id)}>Accept</button>
                <button onClick={() => declineAssignment(p.donation?._id)}>Decline</button>
              </div>
            </div>
          ))}

          <h2>Active Assignments</h2>
          {assignments.length === 0 ? <p>No active assignments</p> : assignments.map((a, idx) => (
            <div key={idx} className="assignment-card">
              <div>
                <h3>{a.donation?.title || 'Donation'}</h3>
                <p>Donor: {a.donation?.donor?.name || 'Unknown'}</p>
                <p>Pickup: {a.donation?.pickupAddress?.fullAddress}</p>
                <p>Status: {a.status}</p>
              </div>
              <div className="assignment-actions">
                <button onClick={() => navigate('/donation-details', { state: { donationId: a.donation?._id } })}>View</button>
                <button onClick={() => alert('Mark as picked up (stub)')}>Confirm Pickup</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
