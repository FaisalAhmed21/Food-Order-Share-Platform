import React, { useState, useEffect } from 'react';
import './VolunteerPanel.css';
import { useNavigate } from 'react-router-dom';

const VolunteerPanel = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [claimedDonations, setClaimedDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('volunteers'); // volunteers or assignments
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [volunteerForm, setVolunteerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    availability: 'Flexible',
    skills: ''
  });
  const [assignmentForm, setAssignmentForm] = useState({
    volunteerId: '',
    donationId: '',
    taskType: 'Pickup',
    taskDescription: '',
    pickupAddress: '',
    distributionAddress: '',
    scheduledDate: '',
    estimatedDuration: '',
    priority: 'medium',
    notes: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch volunteers
      const volunteersResponse = await fetch('http://localhost:5000/api/volunteers/volunteers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (volunteersResponse.ok) {
        const volunteersData = await volunteersResponse.json();
        setVolunteers(volunteersData.volunteers);
      }

      // Fetch assignments
      const assignmentsResponse = await fetch('http://localhost:5000/api/volunteers/assignments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData.assignments);
      }

      // Fetch stats
      const statsResponse = await fetch('http://localhost:5000/api/volunteers/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch claimed donations for assignment linking
      const donationsResponse = await fetch('http://localhost:5000/api/donations/my-claimed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (donationsResponse.ok) {
        const donationsData = await donationsResponse.json();
        // Filter only claimed donations that haven't been picked up yet
        const availableForPickup = donationsData.donations.filter(d => d.status === 'claimed');
        setClaimedDonations(availableForPickup);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch data');
      setLoading(false);
    }
  };

  const handleVolunteerSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/volunteers/volunteers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...volunteerForm,
          skills: volunteerForm.skills.split(',').map(s => s.trim()).filter(s => s)
        })
      });

      if (response.ok) {
        setShowVolunteerForm(false);
        setVolunteerForm({
          name: '',
          email: '',
          phone: '',
          address: '',
          availability: 'Flexible',
          skills: ''
        });
        fetchData();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to add volunteer');
      }
    } catch (err) {
      setError('Failed to add volunteer');
    }
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/volunteers/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...assignmentForm,
          pickupLocation: assignmentForm.pickupAddress ? {
            address: assignmentForm.pickupAddress
          } : undefined,
          distributionLocation: assignmentForm.distributionAddress ? {
            address: assignmentForm.distributionAddress
          } : undefined
        })
      });

      if (response.ok) {
        setShowAssignmentForm(false);
        setAssignmentForm({
          volunteerId: '',
          donationId: '',
          taskType: 'Pickup',
          taskDescription: '',
          pickupAddress: '',
          distributionAddress: '',
          scheduledDate: '',
          estimatedDuration: '',
          priority: 'medium',
          notes: ''
        });
        fetchData();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create assignment');
      }
    } catch (err) {
      setError('Failed to create assignment');
    }
  };

  const updateAssignmentStatus = async (assignmentId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/volunteers/assignments/${assignmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      setError('Failed to update assignment status');
    }
  };

  const deleteVolunteer = async (volunteerId) => {
    if (!window.confirm('Are you sure you want to delete this volunteer?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/volunteers/volunteers/${volunteerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      setError('Failed to delete volunteer');
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      'active': 'status-active',
      'inactive': 'status-inactive',
      'on-assignment': 'status-busy',
      'assigned': 'status-assigned',
      'accepted': 'status-accepted',
      'in-progress': 'status-progress',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return classes[status] || '';
  };

  const getPriorityClass = (priority) => {
    const classes = {
      'low': 'priority-low',
      'medium': 'priority-medium',
      'high': 'priority-high',
      'urgent': 'priority-urgent'
    };
    return classes[priority] || '';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="volunteer-panel">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="volunteer-panel">
      <div className="panel-header">
        <h1>Volunteer Management</h1>
        <div className="header-actions">
          <button 
            className="btn-primary" 
            onClick={() => setShowVolunteerForm(!showVolunteerForm)}
          >
            + Add Volunteer
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => setShowAssignmentForm(!showAssignmentForm)}
          >
            + Create Assignment
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {stats && (
        <div className="stats-grid">
          <div className="stat-box volunteers">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{stats.totalVolunteers}</h3>
              <p>Total Volunteers</p>
            </div>
          </div>
          <div className="stat-box active">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{stats.activeVolunteers}</h3>
              <p>Active</p>
            </div>
          </div>
          <div className="stat-box busy">
            <div className="stat-icon">📍</div>
            <div className="stat-info">
              <h3>{stats.onAssignment}</h3>
              <p>On Assignment</p>
            </div>
          </div>
          <div className="stat-box assignments">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <h3>{stats.totalAssignments}</h3>
              <p>Total Assignments</p>
            </div>
          </div>
        </div>
      )}

      {showVolunteerForm && (
        <div className="form-modal">
          <div className="form-container">
            <h2>Add New Volunteer</h2>
            <form onSubmit={handleVolunteerSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={volunteerForm.name}
                    onChange={(e) => setVolunteerForm({...volunteerForm, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={volunteerForm.email}
                    onChange={(e) => setVolunteerForm({...volunteerForm, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={volunteerForm.phone}
                    onChange={(e) => setVolunteerForm({...volunteerForm, phone: e.target.value})}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Availability</label>
                  <select
                    value={volunteerForm.availability}
                    onChange={(e) => setVolunteerForm({...volunteerForm, availability: e.target.value})}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Weekends">Weekends</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Address</label>
                <input
                  type="text"
                  value={volunteerForm.address}
                  onChange={(e) => setVolunteerForm({...volunteerForm, address: e.target.value})}
                />
              </div>
              <div className="form-field">
                <label>Skills (comma-separated)</label>
                <input
                  type="text"
                  value={volunteerForm.skills}
                  onChange={(e) => setVolunteerForm({...volunteerForm, skills: e.target.value})}
                  placeholder="e.g., Driving, Cooking, First Aid"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit">Add Volunteer</button>
                <button type="button" className="btn-cancel" onClick={() => setShowVolunteerForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignmentForm && (
        <div className="form-modal">
          <div className="form-container">
            <h2>Create New Assignment</h2>
            <form onSubmit={handleAssignmentSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Select Volunteer *</label>
                  <select
                    value={assignmentForm.volunteerId}
                    onChange={(e) => setAssignmentForm({...assignmentForm, volunteerId: e.target.value})}
                    required
                  >
                    <option value="">Choose a volunteer...</option>
                    {volunteers.filter(v => v.status !== 'on-assignment').map(v => (
                      <option key={v._id} value={v._id}>{v.name} - {v.availability}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Link to Donation (Optional)</label>
                  <select
                    value={assignmentForm.donationId}
                    onChange={(e) => {
                      const donation = claimedDonations.find(d => d._id === e.target.value);
                      setAssignmentForm({
                        ...assignmentForm, 
                        donationId: e.target.value,
                        pickupAddress: donation ? donation.pickupAddress : assignmentForm.pickupAddress
                      });
                    }}
                  >
                    <option value="">None (Manual Task)</option>
                    {claimedDonations.map(d => (
                      <option key={d._id} value={d._id}>
                        {d.foodType} - {d.quantity} {d.unit} from {d.restaurantName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Task Type *</label>
                  <select
                    value={assignmentForm.taskType}
                    onChange={(e) => setAssignmentForm({...assignmentForm, taskType: e.target.value})}
                  >
                    <option value="Pickup">Pickup</option>
                    <option value="Distribution">Distribution</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Priority</label>
                  <select
                    value={assignmentForm.priority}
                    onChange={(e) => setAssignmentForm({...assignmentForm, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Scheduled Date *</label>
                  <input
                    type="datetime-local"
                    value={assignmentForm.scheduledDate}
                    onChange={(e) => setAssignmentForm({...assignmentForm, scheduledDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Task Description *</label>
                <textarea
                  value={assignmentForm.taskDescription}
                  onChange={(e) => setAssignmentForm({...assignmentForm, taskDescription: e.target.value})}
                  rows="3"
                  required
                />
              </div>
              <div className="form-grid">
                <div className="form-field">
                  <label>Pickup Address</label>
                  <input
                    type="text"
                    value={assignmentForm.pickupAddress}
                    onChange={(e) => setAssignmentForm({...assignmentForm, pickupAddress: e.target.value})}
                  />
                </div>
                <div className="form-field">
                  <label>Distribution Address</label>
                  <input
                    type="text"
                    value={assignmentForm.distributionAddress}
                    onChange={(e) => setAssignmentForm({...assignmentForm, distributionAddress: e.target.value})}
                  />
                </div>
                <div className="form-field">
                  <label>Estimated Duration</label>
                  <input
                    type="text"
                    value={assignmentForm.estimatedDuration}
                    onChange={(e) => setAssignmentForm({...assignmentForm, estimatedDuration: e.target.value})}
                    placeholder="e.g., 2 hours"
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Notes</label>
                <textarea
                  value={assignmentForm.notes}
                  onChange={(e) => setAssignmentForm({...assignmentForm, notes: e.target.value})}
                  rows="2"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit">Create Assignment</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAssignmentForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="tabs">
        <button 
          className={activeTab === 'volunteers' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('volunteers')}
        >
          Volunteers ({volunteers.length})
        </button>
        <button 
          className={activeTab === 'assignments' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments ({assignments.length})
        </button>
      </div>

      {activeTab === 'volunteers' && (
        <div className="volunteers-section">
          {volunteers.length === 0 ? (
            <p className="no-data">No volunteers yet. Add your first volunteer!</p>
          ) : (
            <div className="volunteers-grid">
              {volunteers.map((volunteer) => (
                <div key={volunteer._id} className="volunteer-card">
                  <div className="card-header">
                    <h3>{volunteer.name}</h3>
                    <span className={`status-badge ${getStatusClass(volunteer.status)}`}>
                      {volunteer.status}
                    </span>
                  </div>
                  <div className="card-body">
                    <p><strong>Email:</strong> {volunteer.email}</p>
                    <p><strong>Phone:</strong> {volunteer.phone}</p>
                    <p><strong>Availability:</strong> {volunteer.availability}</p>
                    {volunteer.skills && volunteer.skills.length > 0 && (
                      <div className="skills-tags">
                        {volunteer.skills.map((skill, idx) => (
                          <span key={idx} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                    )}
                    <div className="volunteer-stats">
                      <span>Total: {volunteer.totalAssignments}</span>
                      <span>Completed: {volunteer.completedAssignments}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button 
                      className="btn-delete"
                      onClick={() => deleteVolunteer(volunteer._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="assignments-section">
          {assignments.length === 0 ? (
            <p className="no-data">No assignments yet. Create your first assignment!</p>
          ) : (
            <div className="assignments-list">
              {assignments.map((assignment) => (
                <div key={assignment._id} className="assignment-card">
                  <div className="assignment-header">
                    <div>
                      <h3>{assignment.taskDescription}</h3>
                      <p className="volunteer-name">👤 {assignment.volunteerName}</p>
                    </div>
                    <div className="assignment-badges">
                      <span className={`priority-badge ${getPriorityClass(assignment.priority)}`}>
                        {assignment.priority}
                      </span>
                      <span className={`status-badge ${getStatusClass(assignment.status)}`}>
                        {assignment.status}
                      </span>
                    </div>
                  </div>
                  <div className="assignment-body">
                    <div className="assignment-info">
                      <p><strong>Task Type:</strong> {assignment.taskType}</p>
                      <p><strong>Scheduled:</strong> {formatDate(assignment.scheduledDate)}</p>
                      {assignment.estimatedDuration && (
                        <p><strong>Duration:</strong> {assignment.estimatedDuration}</p>
                      )}
                    </div>
                    {assignment.pickupLocation && (
                      <p><strong>📍 Pickup:</strong> {assignment.pickupLocation.address}</p>
                    )}
                    {assignment.distributionLocation && (
                      <p><strong>🎯 Distribution:</strong> {assignment.distributionLocation.address}</p>
                    )}
                    {assignment.notes && (
                      <p className="notes"><strong>Notes:</strong> {assignment.notes}</p>
                    )}
                  </div>
                  {assignment.status !== 'completed' && assignment.status !== 'cancelled' && (
                    <div className="assignment-actions">
                      {assignment.status === 'assigned' && (
                        <button 
                          className="btn-action accept"
                          onClick={() => updateAssignmentStatus(assignment._id, 'in-progress')}
                        >
                          Start
                        </button>
                      )}
                      {assignment.status === 'in-progress' && (
                        <button 
                          className="btn-action complete"
                          onClick={() => updateAssignmentStatus(assignment._id, 'completed')}
                        >
                          Complete
                        </button>
                      )}
                      <button 
                        className="btn-action cancel"
                        onClick={() => updateAssignmentStatus(assignment._id, 'cancelled')}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VolunteerPanel;
