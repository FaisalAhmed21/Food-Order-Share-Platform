import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ScheduledPickups.css';

const ScheduledPickups = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    frequency: 'Weekly',
    pickupWindow: { startTime: '19:00', endTime: '21:00' },
    weekDays: ['Monday'],
    dayOfMonth: 1,
    expectedFoodAmount: '',
    notesForNGO: '',
    foodTypes: ['Veg'],
    pickupAddress: {
      street: '',
      area: '',
      city: 'Dhaka',
      zipCode: '',
      fullAddress: '',
      coordinates: { lat: 23.8103, lng: 90.4125 }
    },
    visibilityRadius: 20
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/scheduled-pickups/my-schedules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSchedules(data.schedules);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleWeekDaysChange = (day) => {
    setFormData(prev => ({
      ...prev,
      weekDays: prev.weekDays.includes(day)
        ? prev.weekDays.filter(d => d !== day)
        : [...prev.weekDays, day]
    }));
  };

  const handleFoodTypesChange = (type) => {
    setFormData(prev => ({
      ...prev,
      foodTypes: prev.foodTypes.includes(type)
        ? prev.foodTypes.filter(t => t !== type)
        : [...prev.foodTypes, type]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/api/scheduled-pickups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert('Scheduled pickup created successfully!');
        setShowCreateForm(false);
        fetchSchedules();
      } else {
        alert(data.message || 'Failed to create schedule');
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Failed to create schedule');
    }
  };

  const handlePauseResume = async (scheduleId, currentStatus) => {
    const endpoint = currentStatus === 'Active' ? 'pause' : 'resume';
    
    try {
      const response = await fetch(`http://localhost:5000/api/scheduled-pickups/${scheduleId}/${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const handleCancel = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to cancel this schedule?')) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/scheduled-pickups/${scheduleId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error cancelling schedule:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading scheduled pickups...</div>;
  }

  return (
    <div className="scheduled-pickups-container">
      <div className="header-section">
        <button className="back-btn" onClick={() => navigate('/home')}>← Back</button>
        <h1>📅 Scheduled Donation Pickups</h1>
        <button className="create-btn" onClick={() => setShowCreateForm(true)}>+ Create Schedule</button>
      </div>

      {schedules.length === 0 ? (
        <div className="empty-state">
          <p>No scheduled pickups yet</p>
          <button className="primary-btn" onClick={() => setShowCreateForm(true)}>
            Create Your First Schedule
          </button>
        </div>
      ) : (
        <div className="schedules-grid">
          {schedules.map(schedule => (
            <div key={schedule._id} className={`schedule-card ${schedule.status.toLowerCase()}`}>
              <div className="schedule-header">
                <h3>{schedule.frequency} Pickup</h3>
                <span className={`status-badge ${schedule.status.toLowerCase()}`}>
                  {schedule.status}
                </span>
              </div>
              
              <div className="schedule-details">
                <div className="detail-row">
                  <span className="label">⏰ Time:</span>
                  <span>{schedule.pickupWindow.startTime} - {schedule.pickupWindow.endTime}</span>
                </div>
                
                {schedule.frequency === 'Weekly' && schedule.weekDays && (
                  <div className="detail-row">
                    <span className="label">📆 Days:</span>
                    <span>{schedule.weekDays.join(', ')}</span>
                  </div>
                )}
                
                {schedule.frequency === 'Monthly' && (
                  <div className="detail-row">
                    <span className="label">📆 Day:</span>
                    <span>{schedule.dayOfMonth}th of month</span>
                  </div>
                )}
                
                <div className="detail-row">
                  <span className="label">🍽️ Food Types:</span>
                  <span>{schedule.foodTypes?.join(', ') || 'Not specified'}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">📦 Amount:</span>
                  <span>{schedule.expectedFoodAmount || 'Not specified'}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">📍 Location:</span>
                  <span>{schedule.pickupAddress?.city || 'Not specified'}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">📊 Stats:</span>
                  <span>{schedule.totalPickups || 0} completed, {schedule.missedPickups || 0} missed</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">👥 NGOs:</span>
                  <span>{schedule.subscribedNGOs?.length || 0} subscribed</span>
                </div>
                
                {schedule.notesForNGO && (
                  <div className="notes">
                    <strong>Notes:</strong> {schedule.notesForNGO}
                  </div>
                )}
              </div>
              
              <div className="schedule-actions">
                {schedule.status === 'Active' ? (
                  <button 
                    className="pause-btn"
                    onClick={() => handlePauseResume(schedule._id, schedule.status)}
                  >
                    ⏸️ Pause
                  </button>
                ) : schedule.status === 'Paused' ? (
                  <button 
                    className="resume-btn"
                    onClick={() => handlePauseResume(schedule._id, schedule.status)}
                  >
                    ▶️ Resume
                  </button>
                ) : null}
                
                {schedule.status !== 'Cancelled' && (
                  <button 
                    className="cancel-btn"
                    onClick={() => handleCancel(schedule._id)}
                  >
                    ❌ Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Scheduled Pickup</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Frequency *</label>
                <select name="frequency" value={formData.frequency} onChange={handleInputChange} required>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              {formData.frequency === 'Weekly' && (
                <div className="form-group">
                  <label>Select Days *</label>
                  <div className="checkbox-group">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <label key={day} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.weekDays.includes(day)}
                          onChange={() => handleWeekDaysChange(day)}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.frequency === 'Monthly' && (
                <div className="form-group">
                  <label>Day of Month *</label>
                  <input
                    type="number"
                    name="dayOfMonth"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Pickup Start Time *</label>
                  <input
                    type="time"
                    name="pickupWindow.startTime"
                    value={formData.pickupWindow.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pickup End Time *</label>
                  <input
                    type="time"
                    name="pickupWindow.endTime"
                    value={formData.pickupWindow.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Food Types *</label>
                <div className="checkbox-group">
                  {['Veg', 'Non-Veg', 'Vegan', 'Mixed'].map(type => (
                    <label key={type} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.foodTypes.includes(type)}
                        onChange={() => handleFoodTypesChange(type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Expected Food Amount (Optional)</label>
                <input
                  type="text"
                  name="expectedFoodAmount"
                  value={formData.expectedFoodAmount}
                  onChange={handleInputChange}
                  placeholder="e.g., 10-15 servings, 5kg"
                />
              </div>

              <div className="form-group">
                <label>Full Pickup Address *</label>
                <textarea
                  name="pickupAddress.fullAddress"
                  value={formData.pickupAddress.fullAddress}
                  onChange={handleInputChange}
                  placeholder="Complete address with landmarks"
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes for NGO (Optional)</label>
                <textarea
                  name="notesForNGO"
                  value={formData.notesForNGO}
                  onChange={handleInputChange}
                  placeholder="Any special instructions or information"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Visibility Radius (km)</label>
                <input
                  type="number"
                  name="visibilityRadius"
                  min="1"
                  max="50"
                  value={formData.visibilityRadius}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledPickups;
