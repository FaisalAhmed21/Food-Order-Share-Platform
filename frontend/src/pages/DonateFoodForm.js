import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapPicker from '../components/MapPicker';
import './DonateFoodForm.css';
import { useEffect } from 'react';

const DonateFoodForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  
  const [formData, setFormData] = useState({
    // Food Details
    title: '',
    quantity: '',
    servings: '',
    foodType: 'Veg',
    freshnessLevel: 'Just Cooked',
    expiryDateTime: '',
    description: '',
    
    // Smart Expiry Management
    productionTime: '',
    shelfLifeDuration: '',
    storageCondition: 'Room Temperature',
    
    // Photos
    photos: [],
    photoFiles: [],
    
    // Pickup Details
    pickupAddress: {
      street: '',
      area: '',
      city: 'Dhaka',
      zipCode: '',
      fullAddress: '',
      coordinates: { lat: 23.8103, lng: 90.4125 }
    },
    pickupWindow: {
      from: '',
      to: ''
    },
    // Packaging
    packagingProvided: false,
    packagingInfo: '',
    
    // Safety Checklist
    safetyChecklist: {
      properlyPacked: false,
      noContamination: false,
      safeTempStorage: false,
      correctExpiry: false,
      pickupReady: false
    },
    hasUncertainty: false,
    warningAccepted: false
  });
  
  const [errors, setErrors] = useState({});

  // Protect route: ensure user logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('userData');
    if (!token || !userDataStr) {
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(userDataStr);
      // If the user is Restaurant, prefill some fields (optional)
      if (user.role && user.role.toLowerCase() === 'restaurant') {
        setFormData(prev => ({
          ...prev,
          donorType: 'Restaurant'
        }));
      }
    } catch (err) {
      console.error('Invalid userData in localStorage', err);
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      const newFormData = {
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Auto-calculate expiry if production time and shelf life are provided
      if ((name === 'productionTime' || name === 'shelfLifeDuration') && 
          newFormData.productionTime && newFormData.shelfLifeDuration) {
        const prodTime = new Date(newFormData.productionTime);
        const shelfHours = parseFloat(newFormData.shelfLifeDuration);
        if (!isNaN(shelfHours) && shelfHours > 0) {
          const expiryTime = new Date(prodTime.getTime() + shelfHours * 60 * 60 * 1000);
          newFormData.expiryDateTime = expiryTime.toISOString().slice(0, 16);
        }
      }
      
      setFormData(newFormData);
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
    const validFiles = files.filter(file => {
      // Check file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        alert(`${file.name} is not a valid image type. Please use JPG or PNG.`);
        return false;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    // Create preview URLs
    const newPhotoPreviews = validFiles.map(file => ({
      url: URL.createObjectURL(file),
      file: file
    }));
    
    setFormData(prev => ({
      ...prev,
      photoFiles: [...prev.photoFiles, ...validFiles],
      photos: [...prev.photos, ...newPhotoPreviews.map(p => p.url)]
    }));
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoFiles: prev.photoFiles.filter((_, i) => i !== index)
    }));
  };

  const handleLocationSelect = (location) => {
    setFormData(prev => ({
      ...prev,
      pickupAddress: {
        ...prev.pickupAddress,
        coordinates: location
      }
    }));
    setShowMapPicker(false);
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.title) newErrors.title = 'Title is required';
      if (!formData.quantity) newErrors.quantity = 'Quantity is required';
      if (!formData.servings || formData.servings < 1) newErrors.servings = 'Valid servings count required';
      if (!formData.foodType) newErrors.foodType = 'Food type is required';
      if (!formData.freshnessLevel) newErrors.freshnessLevel = 'Freshness level is required';
    }
    
    if (step === 2) {
      if (!formData.expiryDateTime) {
        newErrors.expiryDateTime = 'Expiry date and time is required';
      } else {
        const expiryDate = new Date(formData.expiryDateTime);
        const now = new Date();
        
        if (expiryDate < now) {
          newErrors.expiryDateTime = 'Expiry time cannot be in the past';
        }
      }
    }
    
    if (step === 3) {
      if (formData.photos.length < 2) {
        newErrors.photos = 'Please upload at least 2 photos';
      }
    }

    // Packaging enforcement: if freshness is Leftover, require packaging provided at packaging step
    if (step === 3.5 && String(formData.freshnessLevel) === 'Leftover') {
      if (!formData.packagingProvided) {
        newErrors.packagingProvided = 'Packaging is required for Leftover items';
      }
    }
    
    if (step === 4) {
      if (!formData.pickupAddress.fullAddress) newErrors.fullAddress = 'Full address is required';
      if (!formData.pickupAddress.coordinates.lat || !formData.pickupAddress.coordinates.lng) {
        newErrors.coordinates = 'Please select location on map';
      }
    }
    
    if (step === 5) {
      if (!formData.pickupWindow.from) newErrors.pickupFrom = 'Pickup start time is required';
      if (!formData.pickupWindow.to) newErrors.pickupTo = 'Pickup end time is required';
      
      if (formData.pickupWindow.from && formData.pickupWindow.to) {
        const from = new Date(formData.pickupWindow.from);
        const to = new Date(formData.pickupWindow.to);
        const expiry = new Date(formData.expiryDateTime);
        
        if (to <= from) {
          newErrors.pickupTo = 'End time must be after start time';
        }
        
        if (to > expiry) {
          newErrors.pickupTo = 'Pickup window cannot end after expiry time';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      // If currently at step 3, move to 3.5 (packaging) next
      if (currentStep === 3) {
        setCurrentStep(3.5);
        return;
      }
      // If currently at 3.5, go to 4
      if (currentStep === 3.5) {
        setCurrentStep(4);
        return;
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check expiry warning
    const expiryDate = new Date(formData.expiryDateTime);
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    
    if (expiryDate < oneHourFromNow && !formData.warningAccepted) {
      setWarningMessage('Your expiry time is less than 1 hour away. This may make it difficult to find a receiver. Do you want to proceed?');
      setShowWarning(true);
      return;
    }
    
    try {
      console.log('Starting donation submission...');
      console.log('Form data:', {
        title: formData.title,
        photoFiles: formData.photoFiles?.length,
        photos: formData.photos?.length,
        pickupAddress: formData.pickupAddress,
        pickupWindow: formData.pickupWindow
      });

      // Validate required fields before sending
      if (!formData.title || !formData.quantity || !formData.servings) {
        alert('Please fill all required fields');
        return;
      }

      if (!formData.photoFiles || formData.photoFiles.length < 2) {
        alert('Please upload at least 2 photos');
        return;
      }

      if (!formData.pickupAddress?.coordinates?.lat || !formData.pickupAddress?.coordinates?.lng) {
        alert('Please select pickup location on map');
        return;
      }

      // Validate pickup window dates
      if (!formData.pickupWindow?.from || !formData.pickupWindow?.to) {
        alert('Please select pickup window start and end times');
        return;
      }

      // Check if dates are valid
      const pickupFromDate = new Date(formData.pickupWindow.from);
      const pickupToDate = new Date(formData.pickupWindow.to);
      
      if (isNaN(pickupFromDate.getTime()) || isNaN(pickupToDate.getTime())) {
        alert('Invalid pickup window dates. Please select valid date and time.');
        return;
      }

      if (pickupFromDate >= pickupToDate) {
        alert('Pickup end time must be after start time');
        return;
      }

      console.log('Pickup window validation passed:', {
        from: pickupFromDate.toISOString(),
        to: pickupToDate.toISOString()
      });

      // Build multipart/form-data request with photos and JSON fields
      const formPayload = new FormData();
      formPayload.append('title', formData.title);
      formPayload.append('quantity', formData.quantity);
      formPayload.append('servings', parseInt(formData.servings));
      formPayload.append('foodType', formData.foodType);
      formPayload.append('freshnessLevel', formData.freshnessLevel);
      formPayload.append('expiryDateTime', formData.expiryDateTime);
      formPayload.append('description', formData.description || '');
      
      // Smart Expiry Management fields
      if (formData.productionTime) {
        formPayload.append('productionTime', formData.productionTime);
      }
      if (formData.shelfLifeDuration) {
        formPayload.append('shelfLifeDuration', formData.shelfLifeDuration);
      }
      formPayload.append('storageCondition', formData.storageCondition);
      
      formPayload.append('pickupAddress', JSON.stringify(formData.pickupAddress));
      formPayload.append('pickupWindow', JSON.stringify(formData.pickupWindow));
      formPayload.append('safetyChecklist', JSON.stringify(formData.safetyChecklist));
      formPayload.append('packagingProvided', formData.packagingProvided ? 'true' : 'false');
      formPayload.append('packagingInfo', formData.packagingInfo || '');
      formPayload.append('hasUncertainty', formData.hasUncertainty ? 'true' : 'false');
      formPayload.append('warningAccepted', formData.warningAccepted ? 'true' : 'false');

      // Attach photo files (if any). field name 'photos' matches server expectation
      if (formData.photoFiles && formData.photoFiles.length > 0) {
        console.log('Attaching photo files:', formData.photoFiles.length);
        formData.photoFiles.forEach((file, idx) => {
          formPayload.append('photos', file, file.name || `photo-${idx}.jpg`);
        });
      }

      console.log('Sending request to backend...');
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login first');
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/donations/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formPayload
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        alert('✅ Donation published successfully! Nearby NGOs have been notified.');
        // Navigate to my-donations page
        navigate('/my-donations');
      } else {
        if (data.requiresWarning) {
          setWarningMessage(data.message);
          setShowWarning(true);
        } else {
          console.error('Server error:', data.message, data.error);
          alert(data.message || 'Failed to publish donation');
        }
      }
    } catch (error) {
      console.error('Error submitting donation:', error);
      alert('Failed to submit donation. Please try again. Error: ' + error.message);
    }
  };

  const handleWarningAccept = () => {
    setFormData(prev => ({ ...prev, warningAccepted: true }));
    setShowWarning(false);
    // Re-submit
    handleSubmit({ preventDefault: () => {} });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="form-step">
            <h3>📦 Food Details</h3>
            
            <div className="form-group">
              <label>Title / Name of Food *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Mixed Vegetable Curry"
                className={errors.title ? 'error' : ''}
              />
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="text"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="e.g., 5 kg, 10 plates"
                  className={errors.quantity ? 'error' : ''}
                />
                {errors.quantity && <span className="error-text">{errors.quantity}</span>}
              </div>
              
              <div className="form-group">
                <label>Servings *</label>
                <input
                  type="number"
                  name="servings"
                  value={formData.servings}
                  onChange={handleInputChange}
                  placeholder="Number of people"
                  min="1"
                  className={errors.servings ? 'error' : ''}
                />
                {errors.servings && <span className="error-text">{errors.servings}</span>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Food Type *</label>
                <select name="foodType" value={formData.foodType} onChange={handleInputChange}>
                  <option value="Veg">Vegetarian</option>
                  <option value="Non-Veg">Non-Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Freshness Level *</label>
                <select name="freshnessLevel" value={formData.freshnessLevel} onChange={handleInputChange}>
                  <option value="Just Cooked">Just Cooked</option>
                  <option value="Today">Cooked Today</option>
                  <option value="Leftover">Leftover (Yesterday)</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add any additional details about the food..."
                rows="3"
              />
            </div>
          </div>
        );
      
      case 2:
        // Calculate time left for countdown
        const getTimeLeft = () => {
          if (!formData.expiryDateTime) return null;
          const expiry = new Date(formData.expiryDateTime);
          const now = new Date();
          const diffMs = expiry - now;
          if (diffMs < 0) return { status: 'expired', text: 'Expired' };
          
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours >= 6) return { status: 'good', text: `${hours}h ${minutes}m remaining` };
          if (hours >= 2) return { status: 'warning', text: `⚠️ ${hours}h ${minutes}m remaining` };
          return { status: 'critical', text: `🚨 ${hours}h ${minutes}m remaining - URGENT` };
        };
        
        const timeLeft = getTimeLeft();
        
        return (
          <div className="form-step">
            <h3>⏰ Smart Expiry Management</h3>
            
            <div className="info-box" style={{ backgroundColor: '#e8f5e9', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                💡 <strong>Pro Tip:</strong> Enter when the food was prepared and how long it stays fresh. 
                We'll auto-calculate the expiry and send you alerts at 6h, 2h, and 30min before expiry!
              </p>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Production/Cooking Time</label>
                <input
                  type="datetime-local"
                  name="productionTime"
                  value={formData.productionTime}
                  onChange={handleInputChange}
                />
                <small className="help-text">When was this food prepared?</small>
              </div>
              
              <div className="form-group">
                <label>Shelf Life (Hours)</label>
                <input
                  type="number"
                  name="shelfLifeDuration"
                  value={formData.shelfLifeDuration}
                  onChange={handleInputChange}
                  placeholder="e.g., 4, 8, 12"
                  min="0.5"
                  step="0.5"
                />
                <small className="help-text">How many hours until it expires?</small>
              </div>
            </div>
            
            <div className="form-group">
              <label>Storage Condition</label>
              <select 
                name="storageCondition" 
                value={formData.storageCondition} 
                onChange={handleInputChange}
              >
                <option value="Room Temperature">Room Temperature (20-25°C)</option>
                <option value="Refrigerated">Refrigerated (2-8°C)</option>
                <option value="Frozen">Frozen (Below 0°C)</option>
              </select>
              <small className="help-text">How is the food currently stored?</small>
            </div>
            
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '8px',
              marginTop: '15px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>📅 Calculated Expiry</h4>
              <div className="form-group">
                <label>Expiry Date & Time *</label>
                <input
                  type="datetime-local"
                  name="expiryDateTime"
                  value={formData.expiryDateTime}
                  onChange={handleInputChange}
                  className={errors.expiryDateTime ? 'error' : ''}
                />
                {errors.expiryDateTime && <span className="error-text">{errors.expiryDateTime}</span>}
                <small className="help-text">
                  {formData.productionTime && formData.shelfLifeDuration ? 
                    '✅ Auto-calculated from production time + shelf life (you can adjust manually)' : 
                    'Or enter expiry manually if you prefer'
                  }
                </small>
              </div>
              
              {timeLeft && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '10px', 
                  borderRadius: '5px',
                  backgroundColor: timeLeft.status === 'expired' ? '#ffebee' : 
                                  timeLeft.status === 'critical' ? '#fff3e0' : 
                                  timeLeft.status === 'warning' ? '#fff9c4' : '#e8f5e9',
                  border: `2px solid ${timeLeft.status === 'expired' ? '#f44336' : 
                                       timeLeft.status === 'critical' ? '#ff9800' : 
                                       timeLeft.status === 'warning' ? '#ffc107' : '#4caf50'}`
                }}>
                  <strong style={{ fontSize: '16px' }}>{timeLeft.text}</strong>
                </div>
              )}
            </div>
            
            <div className="info-box" style={{ marginTop: '20px' }}>
              <h4>🔔 Alert System</h4>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li><strong>6 Hours Before:</strong> Early warning - consider flash discount or quick pickup</li>
                <li><strong>2 Hours Before:</strong> Priority alert - mark as urgent donation</li>
                <li><strong>30 Minutes Before:</strong> Critical alert - immediate action needed</li>
              </ul>
            </div>
            
            <div className="info-box">
              <h4>🍽️ Freshness Guidelines</h4>
              <ul>
                <li><strong>Just Cooked:</strong> 2-4 hours at room temp, 24h refrigerated</li>
                <li><strong>Today:</strong> 6-8 hours at room temp, 2-3 days refrigerated</li>
                <li><strong>Leftover:</strong> 12-24 hours refrigerated, not room temp</li>
              </ul>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="form-step">
            <h3>📸 Photos</h3>
            
            <div className="photo-upload-section">
              <label className="upload-btn">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                📷 Upload Photos (Min 2)
              </label>
              
              {errors.photos && <span className="error-text">{errors.photos}</span>}
              
              <div className="photo-preview-grid">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="photo-preview">
                    <img src={photo} alt={`Food ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-photo"
                      onClick={() => removePhoto(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="photo-count">
                {formData.photos.length} / 2 minimum photos uploaded
              </div>
            </div>
            
            <div className="info-box">
              <h4>📸 Photo Tips</h4>
              <ul>
                <li>Take clear, well-lit photos</li>
                <li>Show the actual food (not stock images)</li>
                <li>Include packaging if applicable</li>
                <li>Maximum file size: 5MB per photo</li>
              </ul>
            </div>
          </div>
        );
      
        case 3.5:
          return (
            <div className="form-step">
              <h3>📦 Packaging Details</h3>
              <div className="form-group">
                <label>
                  <input type="checkbox" name="packagingProvided" checked={formData.packagingProvided} onChange={handleInputChange} /> Packaging provided {String(formData.freshnessLevel) === 'Leftover' && <span style={{color: 'red', marginLeft: '8px'}}>required for Leftover</span>}
                </label>
              </div>
              <div className="form-group">
                <label>Packaging Notes (optional)</label>
                <input type="text" name="packagingInfo" value={formData.packagingInfo} onChange={handleInputChange} placeholder="e.g., Sealed plastic container" />
              </div>
              <div className="info-box">
                <p>If freshness is 'Leftover', packaging details help volunteers/NGOs assess safety.</p>
              </div>
            </div>
          );
      
      case 4:
        return (
          <div className="form-step">
            <h3>📍 Pickup Location</h3>
            
            <div className="form-group">
              <label>Street Address *</label>
              <input
                type="text"
                name="pickupAddress.street"
                value={formData.pickupAddress.street}
                onChange={handleInputChange}
                placeholder="House/Building number and street"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Area *</label>
                <input
                  type="text"
                  name="pickupAddress.area"
                  value={formData.pickupAddress.area}
                  onChange={handleInputChange}
                  placeholder="e.g., Gulshan, Banani"
                />
              </div>
              
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="pickupAddress.city"
                  value={formData.pickupAddress.city}
                  onChange={handleInputChange}
                  placeholder="Dhaka"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Full Address *</label>
              <textarea
                name="pickupAddress.fullAddress"
                value={formData.pickupAddress.fullAddress}
                onChange={handleInputChange}
                placeholder="Complete pickup address with landmarks"
                rows="3"
                className={errors.fullAddress ? 'error' : ''}
              />
              {errors.fullAddress && <span className="error-text">{errors.fullAddress}</span>}
            </div>
            
            <div className="form-group">
              <label>Select Location on Map *</label>
              <button
                type="button"
                className="map-picker-btn"
                onClick={() => setShowMapPicker(true)}
              >
                🗺️ Open Map Picker
              </button>
              {errors.coordinates && <span className="error-text">{errors.coordinates}</span>}
              {formData.pickupAddress.coordinates.lat && (
                <div className="coordinates-display">
                  ✓ Location set: {formData.pickupAddress.coordinates.lat.toFixed(4)}, {formData.pickupAddress.coordinates.lng.toFixed(4)}
                </div>
              )}
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="form-step">
            <h3>🕒 Pickup Window</h3>
            
            <div className="form-group">
              <label>Pickup Available From *</label>
              <input
                type="datetime-local"
                name="pickupWindow.from"
                value={formData.pickupWindow.from}
                onChange={handleInputChange}
                className={errors.pickupFrom ? 'error' : ''}
              />
              {errors.pickupFrom && <span className="error-text">{errors.pickupFrom}</span>}
            </div>
            
            <div className="form-group">
              <label>Pickup Available Until *</label>
              <input
                type="datetime-local"
                name="pickupWindow.to"
                value={formData.pickupWindow.to}
                onChange={handleInputChange}
                className={errors.pickupTo ? 'error' : ''}
              />
              {errors.pickupTo && <span className="error-text">{errors.pickupTo}</span>}
            </div>
            
            <div className="info-box warning">
              <strong>⚠️ Important:</strong> Pickup window must end before the expiry time
            </div>
          </div>
        );
      
      
      
      default:
        return null;
    }
  };

  return (
    <div className="donate-food-container">
      <div className="donate-food-wrapper">
        <button className="back-btn" onClick={() => navigate('/home')}>
          ← Back
        </button>
        
        <div className="donation-header">
          <h1>🍽️ Donate Surplus Food</h1>
          <p>Help fight hunger by sharing your surplus food with those in need</p>
        </div>
        
        <div className="stepper">
          {[1, 2, 3, 3.5, 4, 5].map(step => (
            <div key={step} className={`step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}>
              <div className="step-number">{step}</div>
              <div className="step-label">
                {step === 1 && 'Food Details'}
                {step === 2 && 'Expiry'}
                {step === 3 && 'Photos'}
                {step === 3.5 && 'Packaging'}
                {step === 4 && 'Location'}
                {step === 5 && 'Pickup Time'}
              </div>
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSubmit}>
          {renderStep()}
          
          <div className="form-actions">
            {currentStep > 1 && (
              <button type="button" className="btn-secondary" onClick={prevStep}>
                ← Previous
              </button>
            )}
            
            {currentStep < 5 ? (
              <button type="button" className="btn-primary" onClick={nextStep}>
                Next →
              </button>
            ) : (
              <button type="submit" className="btn-submit">
                📤 Publish Donation
              </button>
            )}
          </div>
        </form>
      </div>
      
      {showMapPicker && (
        <MapPicker
          initialLocation={formData.pickupAddress.coordinates}
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowMapPicker(false)}
        />
      )}
      
      {showWarning && (
        <div className="warning-modal-overlay">
          <div className="warning-modal">
            <h3>⚠️ Warning</h3>
            <p>{warningMessage}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowWarning(false)}>
                Go Back and Fix
              </button>
              <button className="btn-warning" onClick={handleWarningAccept}>
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonateFoodForm;
