import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Chatbot from '../components/Chatbot';
import './RestaurantDashboard.css';

const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'profile', 'branches', 'ngos', 'orders'
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [creationStep, setCreationStep] = useState(1); // 1: Basic Info, 2: Branches, 3: Menu Items
  const [tempBranches, setTempBranches] = useState([{ name: 'Main Branch', address: '', phone: '' }]);
  const [tempMenuItems, setTempMenuItems] = useState([]);
  const [restaurantOrders, setRestaurantOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketRef = React.useRef(null);

  const [menuItemFormData, setMenuItemFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Mains',
    available: true,
    image: '',
    preparationTime: 15,
    isVegetarian: false,
    isVegan: false,
    spiceLevel: 0,
    branch: 'All Branches',
    badges: [],
    dietary: ['Halal']
  });

  const [restaurantFormData, setRestaurantFormData] = useState({
    name: '',
    cuisine: [],
    description: '',
    deliveryTime: 30,
    minimumOrder: 100,
    priceRange: '৳৳',
    status: 'Open',
    image: '',
    heroImage: '',
    logo: '',
    address: {
      street: '',
      area: '',
      city: 'Dhaka',
      zipCode: '',
      fullAddress: ''
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    openingHours: {
      monday: { open: '10:00', close: '22:00' },
      tuesday: { open: '10:00', close: '22:00' },
      wednesday: { open: '10:00', close: '22:00' },
      thursday: { open: '10:00', close: '22:00' },
      friday: { open: '10:00', close: '22:00' },
      saturday: { open: '10:00', close: '22:00' },
      sunday: { open: '10:00', close: '22:00' }
    },
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    },
    bankAccount: {
      accountNumber: '',
      accountHolderName: '',
      bankName: '',
      routingNumber: ''
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('userData');

    if (!token || !userDataStr) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userDataStr);
    if (user.role !== 'Restaurant' && user.role !== 'restaurant') {
      navigate('/home');
      return;
    }

    setUserData(user);
    fetchRestaurant();
  }, [navigate]);

  const fetchRestaurant = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching restaurant with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch('http://localhost:5000/api/restaurants/owner/my-restaurants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Restaurant data:', data);
      
      if (data.success) {
        if (data.restaurants && data.restaurants.length > 0) {
          const myRestaurant = data.restaurants[0];
          console.log('Found restaurant:', myRestaurant.name);
          setRestaurant(myRestaurant);
          setRestaurantFormData(myRestaurant);
          
          // Load branches from restaurant data
          if (myRestaurant.branches && myRestaurant.branches.length > 0) {
            const branchNames = myRestaurant.branches.map(b => b.name);
            setBranches(['All Branches', ...branchNames]);
            setTempBranches(myRestaurant.branches);
          } else {
            // Set default branch if none exist
            const defaultBranch = [{ name: 'Main Branch', address: myRestaurant.address?.street || '', phone: myRestaurant.contact?.phone || '' }];
            setTempBranches(defaultBranch);
            setBranches(['All Branches', 'Main Branch']);
          }
          
          fetchMenuItems(myRestaurant._id);
        } else {
          // No restaurant found - show creation form
          console.log('No restaurant found for this user');
          setLoading(false);
        }
      } else {
        console.log('API returned success: false');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      setLoading(false);
    }
  };

  const fetchMenuItems = async (restaurantId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/restaurants/owner/restaurants/${restaurantId}/menu`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setMenuItems(data.menuItems);
        // Extract unique branches from menu items, excluding 'All Branches'
        const uniqueBranches = [...new Set(data.menuItems.map(item => item.branch).filter(b => b && b !== 'All Branches'))];
        if (uniqueBranches.length > 0) {
          setBranches(['All Branches', ...uniqueBranches]);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setLoading(false);
    }
  };

  const fetchRestaurantOrders = async () => {
    if (!restaurant || !restaurant._id) return;
    
    setOrdersLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/payments/restaurant-orders/${restaurant._id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        console.log('📦 Fetched restaurant orders:', data.orders.length);
        // Log donation info for debugging
        data.orders.forEach(order => {
          if (order.donation && order.donation.amount > 0) {
            console.log('💝 Order with donation:', {
              orderId: order._id,
              donationAmount: order.donation.amount,
              ngoName: order.donation.ngoName,
              ngoObject: order.donation.ngo,
              fullDonation: order.donation
            });
          }
        });
        setRestaurantOrders(data.orders || []);
      } else {
        console.error('Failed to fetch orders:', data.message);
        setRestaurantOrders([]);
      }
    } catch (error) {
      console.error('Error fetching restaurant orders:', error);
      setRestaurantOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Setup Socket.io connection for real-time order notifications
  React.useEffect(() => {
    if (restaurant && restaurant._id) {
      // Initialize Socket.io connection
      const socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        withCredentials: true
      });
      
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket.io connected:', socket.id);
        // Join restaurant-specific room
        socket.emit('join-restaurant', restaurant._id);
      });

      socket.on('disconnect', () => {
        console.log('Socket.io disconnected');
      });

      // Listen for new order events
      socket.on('new-order', (orderData) => {
        console.log('🔔 New order received via Socket.io:', orderData);
        
        const notification = {
          id: orderData.orderId,
          customerName: orderData.customer?.name || 'Customer',
          items: orderData.items,
          totalItems: orderData.items.reduce((sum, item) => sum + item.quantity, 0),
          total: orderData.pricing?.total || 0,
          timestamp: new Date()
        };
        
        setNotifications(prev => [...prev, notification]);
        
        // Auto-remove notification after 10 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 10000);
      });
      
      return () => {
        console.log('Cleaning up Socket.io connection');
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [restaurant]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const handleAddMenuItem = () => {
    setEditingItem(null);
    setMenuItemFormData({
      name: '',
      description: '',
      price: '',
      category: 'Mains',
      available: true,
      image: '',
      imageFile: null,
      preparationTime: 15,
      isVegetarian: false,
      isVegan: false,
      spiceLevel: 0,
      branch: selectedBranch === 'All Branches' ? 'All Branches' : selectedBranch,
      badges: [],
      dietary: ['Halal']
    });
    setShowMenuForm(true);
  };

  const handleEditMenuItem = (item) => {
    setEditingItem(item);
    setMenuItemFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      available: item.available,
      image: item.image,
      currentImage: item.image,
      imageFile: null,
      preparationTime: item.preparationTime,
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      spiceLevel: item.spiceLevel,
      branch: item.branch || 'All Branches',
      badges: item.badges || [],
      dietary: item.dietary || ['Halal']
    });
    setShowMenuForm(true);
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingItem
        ? `http://localhost:5000/api/restaurants/owner/menu-items/${editingItem._id}`
        : `http://localhost:5000/api/restaurants/owner/restaurants/${restaurant._id}/menu`;

      const formData = new FormData();
      formData.append('name', menuItemFormData.name);
      formData.append('description', menuItemFormData.description);
      formData.append('price', menuItemFormData.price);
      formData.append('category', menuItemFormData.category);
      formData.append('branch', menuItemFormData.branch);
      
      if (menuItemFormData.badges) {
        formData.append('badges', JSON.stringify(menuItemFormData.badges));
      }
      if (menuItemFormData.dietary) {
        formData.append('dietary', JSON.stringify(menuItemFormData.dietary));
      }
      
      if (menuItemFormData.imageFile) {
        formData.append('image', menuItemFormData.imageFile);
      } else if (editingItem && menuItemFormData.currentImage) {
        // Keep existing image - send only relative path
        let relativePath = menuItemFormData.currentImage;
        if (relativePath.includes('/uploads/')) {
          relativePath = relativePath.substring(relativePath.indexOf('/uploads/'));
        }
        formData.append('existingImage', relativePath);
      }

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        alert(editingItem ? 'Menu item updated!' : 'Menu item added!');
        setShowMenuForm(false);
        fetchMenuItems(restaurant._id);
      } else {
        alert(data.message || 'Error saving menu item');
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Error saving menu item');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/restaurants/owner/menu-items/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        alert('Menu item deleted!');
        fetchMenuItems(restaurant._id);
      } else {
        alert(data.message || 'Error deleting item');
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Error deleting menu item');
    }
  };

  const toggleAvailability = async (itemId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/restaurants/owner/menu-items/${itemId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ available: !currentStatus })
        }
      );

      const data = await response.json();
      if (data.success) {
        fetchMenuItems(restaurant._id);
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const handleSaveRestaurantProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      
      // Handle image file
      if (restaurantFormData.imageFile) {
        formData.append('image', restaurantFormData.imageFile);
      } else if (restaurantFormData.image) {
        // If no new image, send the existing image path
        formData.append('existingImage', restaurantFormData.image);
      }
      
      // Handle license PDF file
      if (restaurantFormData.verificationDocuments?.[0]?.documentPDFFile) {
        formData.append('licensePDF', restaurantFormData.verificationDocuments[0].documentPDFFile);
      }
      
      // Handle simple fields
      const simpleFields = ['name', 'description', 'status', 'priceRange', 'deliveryTime', 'deliveryFee', 'minimumOrder'];
      simpleFields.forEach(field => {
        if (restaurantFormData[field] !== undefined && restaurantFormData[field] !== null) {
          formData.append(field, restaurantFormData[field]);
        }
      });
      
      // Handle cuisine array
      if (restaurantFormData.cuisine) {
        const cuisineArray = Array.isArray(restaurantFormData.cuisine) 
          ? restaurantFormData.cuisine 
          : (typeof restaurantFormData.cuisine === 'string' 
              ? restaurantFormData.cuisine.split(',').map(c => c.trim()).filter(c => c)
              : []);
        formData.append('cuisine', JSON.stringify(cuisineArray));
      }
      
      // Handle nested objects (contact, address)
      if (restaurantFormData.contact) {
        formData.append('contact', JSON.stringify(restaurantFormData.contact));
      }
      if (restaurantFormData.address) {
        formData.append('address', JSON.stringify(restaurantFormData.address));
      }
      
      // Handle social media
      if (restaurantFormData.socialMedia) {
        formData.append('socialMedia', JSON.stringify(restaurantFormData.socialMedia));
      }
      
      // Handle branches
      if (tempBranches && tempBranches.length > 0) {
        formData.append('branches', JSON.stringify(tempBranches));
      }
      
      // Handle verification documents (exclude the File object itself, only send data)
      if (restaurantFormData.verificationDocuments) {
        const docsToSend = restaurantFormData.verificationDocuments.map(doc => {
          const { documentPDFFile, ...rest } = doc; // Exclude File object
          return rest;
        });
        formData.append('verificationDocuments', JSON.stringify(docsToSend));
      }
      
      const response = await fetch(
        `http://localhost:5000/api/restaurants/owner/restaurants/${restaurant._id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();
      console.log('Restaurant update response:', data);
      console.log('Response status:', response.status);
      
      if (response.ok && data.success) {
        alert('Restaurant profile updated successfully!');
        setRestaurant(data.restaurant);
        setRestaurantFormData({...data.restaurant, imageFile: null});
        
        // Update branches from saved restaurant data
        if (data.restaurant.branches && data.restaurant.branches.length > 0) {
          const branchNames = data.restaurant.branches.map(b => b.name);
          setBranches(['All Branches', ...branchNames]);
          setTempBranches(data.restaurant.branches);
        }
        
        setShowRestaurantForm(false);
      } else {
        console.error('Restaurant update error:', data);
        console.error('Full error message:', data.message);
        alert(`Error updating profile: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Error updating profile: ${error.message}`);
    }
  };

  const filteredMenuItems = selectedBranch === 'All Branches'
    ? menuItems
    : menuItems.filter(item => item.branch === selectedBranch || item.branch === 'All Branches');

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  if (!restaurant) {
    return (
      <div className="owner-dashboard">
        {/* Navbar */}
        <header className="navbar" style={{background: '#2c3e50', padding: '1rem 2rem', marginBottom: '0'}}>
          <div className="navbar-content" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto'}}>
            <h1 className="logo" style={{color: 'white', margin: 0, marginRight: 'auto'}}>🍽️ FoodShare</h1>
            <nav className="nav-links" style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
              <button className="nav-btn" onClick={() => navigate('/home')} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Home</button>
              <button className="nav-btn" onClick={() => navigate('/campaigns')} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Campaigns</button>
              <button className="nav-btn nav-btn-primary" onClick={handleLogout} style={{background: '#e74c3c', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>Log Out</button>
            </nav>
          </div>
        </header>

        <div className="dashboard-header">
          <div className="header-left">
            <h1>Welcome to Restaurant Management</h1>
          </div>
        </div>
        <div className="no-restaurant-container">
          <div className="create-restaurant-card">
            <h2>Create Your Restaurant Profile</h2>
            <p>Start by adding information about your restaurant. Once created, your restaurant will appear in the customer's restaurant list.</p>
            <button onClick={() => setShowRestaurantForm(true)} className="create-restaurant-btn">
              + Create Restaurant Profile
            </button>
          </div>
        </div>

        {/* Multi-Step Restaurant Creation Form */}
        {showRestaurantForm && (
          <div className="modal-overlay" onClick={() => {
            setShowRestaurantForm(false);
            setCreationStep(1);
          }}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create Your Restaurant - Step {creationStep} of 3</h2>
                <button className="close-btn" onClick={() => {
                  setShowRestaurantForm(false);
                  setCreationStep(1);
                }}>×</button>
              </div>

              {/* Step Indicator */}
              <div className="step-indicator">
                <div className={`step ${creationStep >= 1 ? 'active' : ''}`}>
                  <div className="step-number">1</div>
                  <div className="step-label">Basic Info</div>
                </div>
                <div className={`step ${creationStep >= 2 ? 'active' : ''}`}>
                  <div className="step-number">2</div>
                  <div className="step-label">Branches</div>
                </div>
                <div className={`step ${creationStep >= 3 ? 'active' : ''}`}>
                  <div className="step-number">3</div>
                  <div className="step-label">Menu Items</div>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                
                if (creationStep < 3) {
                  // Move to next step
                  setCreationStep(creationStep + 1);
                  return;
                }

                // Final step - create restaurant with all data
                try {
                  const token = localStorage.getItem('token');
                  
                  // Prepare restaurant data
                  const formData = new FormData();
                  
                  // Handle cuisine array
                  const cuisineArray = Array.isArray(restaurantFormData.cuisine) 
                    ? restaurantFormData.cuisine 
                    : (typeof restaurantFormData.cuisine === 'string' 
                        ? restaurantFormData.cuisine.split(',').map(c => c.trim()).filter(c => c)
                        : []);
                  
                  // Add image if exists
                  if (restaurantFormData.imageFile) {
                    formData.append('image', restaurantFormData.imageFile);
                  }
                  
                  // Add license PDF if exists
                  if (restaurantFormData.verificationDocuments?.[0]?.documentPDFFile) {
                    formData.append('licensePDF', restaurantFormData.verificationDocuments[0].documentPDFFile);
                  }
                  
                  // Add simple fields
                  const simpleFields = ['name', 'description', 'status', 'priceRange', 'deliveryTime', 'deliveryFee', 'minimumOrder'];
                  simpleFields.forEach(field => {
                    if (restaurantFormData[field] !== undefined && restaurantFormData[field] !== null) {
                      formData.append(field, restaurantFormData[field]);
                    }
                  });
                  
                  // Add cuisine as JSON
                  formData.append('cuisine', JSON.stringify(cuisineArray));
                  
                  // Add contact as JSON if exists
                  if (restaurantFormData.contact) {
                    formData.append('contact', JSON.stringify(restaurantFormData.contact));
                  }
                  
                  // Add address as JSON if exists
                  if (restaurantFormData.address) {
                    formData.append('address', JSON.stringify(restaurantFormData.address));
                  }
                  
                  // Add verification documents as JSON (exclude File object)
                  if (restaurantFormData.verificationDocuments) {
                    const docsToSend = restaurantFormData.verificationDocuments.map(doc => {
                      const { documentPDFFile, ...rest } = doc;
                      return rest;
                    });
                    formData.append('verificationDocuments', JSON.stringify(docsToSend));
                  }
                  
                  // Add branches as JSON
                  if (restaurantFormData.branches && restaurantFormData.branches.length > 0) {
                    formData.append('branches', JSON.stringify(restaurantFormData.branches));
                  }
                  
                  const restaurantResponse = await fetch('http://localhost:5000/api/restaurants/owner/restaurants', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    },
                    body: formData
                  });

                  const restaurantData = await restaurantResponse.json();
                  console.log('Restaurant creation response:', restaurantData);
                  
                  if (!restaurantData.success) {
                    console.error('Restaurant creation error:', restaurantData);
                    alert(`Error creating restaurant: ${restaurantData.message || 'Unknown error'}`);
                    return;
                  }

                  const restaurantId = restaurantData.restaurant._id;

                  // Create menu items for each branch
                  for (const menuItem of tempMenuItems) {
                    const menuFormData = new FormData();
                    Object.keys(menuItem).forEach(key => {
                      if (key === 'imageFile' && menuItem.imageFile) {
                        menuFormData.append('image', menuItem.imageFile);
                      } else if (key !== 'imageFile') {
                        menuFormData.append(key, menuItem[key]);
                      }
                    });
                    
                    await fetch(`http://localhost:5000/api/restaurants/owner/restaurants/${restaurantId}/menu`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`
                      },
                      body: menuFormData
                    });
                  }

                  alert('Restaurant created successfully with all branches and menu items!');
                  setShowRestaurantForm(false);
                  setCreationStep(1);
                  setTempBranches([{ name: 'Main Branch', address: '', phone: '' }]);
                  setTempMenuItems([]);
                  fetchRestaurant();
                } catch (error) {
                  console.error('Error creating restaurant:', error);
                  alert('Error creating restaurant');
                }
              }} className="restaurant-form">
                
                {/* STEP 1: Basic Information */}
                {creationStep === 1 && (
                  <div className="form-step">
                    <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Restaurant Name *</label>
                    <input
                      type="text"
                      value={restaurantFormData.name}
                      onChange={(e) => setRestaurantFormData({...restaurantFormData, name: e.target.value})}
                      required
                      placeholder="Enter your restaurant name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Status *</label>
                    <select
                      value={restaurantFormData.status}
                      onChange={(e) => setRestaurantFormData({...restaurantFormData, status: e.target.value})}
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Temporarily Closed">Temporarily Closed</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={restaurantFormData.description}
                    onChange={(e) => setRestaurantFormData({...restaurantFormData, description: e.target.value})}
                    rows="3"
                    required
                    placeholder="Describe your restaurant"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Cuisine Types (comma-separated) *</label>
                    <input
                      type="text"
                      value={Array.isArray(restaurantFormData.cuisine) ? restaurantFormData.cuisine.join(', ') : restaurantFormData.cuisine || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData, 
                        cuisine: e.target.value
                      })}
                      onBlur={(e) => {
                        // Convert to array only on blur
                        const cuisineArray = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                        setRestaurantFormData({...restaurantFormData, cuisine: cuisineArray});
                      }}
                      required
                      placeholder="e.g. Italian, Pizza, Pasta"
                    />
                  </div>
                  <div className="form-group">
                    <label>Price Range</label>
                    <select
                      value={restaurantFormData.priceRange}
                      onChange={(e) => setRestaurantFormData({...restaurantFormData, priceRange: e.target.value})}
                    >
                      <option value="৳">৳ (Budget)</option>
                      <option value="৳৳">৳৳ (Moderate)</option>
                      <option value="৳৳৳">৳৳৳ (Premium)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Delivery Time (minutes) *</label>
                    <input
                      type="number"
                      value={restaurantFormData.deliveryTime}
                      onChange={(e) => setRestaurantFormData({...restaurantFormData, deliveryTime: e.target.value})}
                      required
                      placeholder="30"
                      min="10"
                    />
                  </div>
                  <div className="form-group">
                    <label>Minimum Order (৳)</label>
                    <input
                      type="number"
                      value={restaurantFormData.minimumOrder}
                      onChange={(e) => setRestaurantFormData({...restaurantFormData, minimumOrder: e.target.value})}
                      placeholder="100"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Restaurant Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setRestaurantFormData({...restaurantFormData, imageFile: file});
                      }
                    }}
                  />
                  {restaurantFormData.imageFile && <small style={{color: '#22c55e'}}>✓ Selected: {restaurantFormData.imageFile.name}</small>}
                  {restaurantFormData.image && !restaurantFormData.imageFile && (
                    <div style={{marginTop: '0.5rem'}}>
                      <small style={{color: '#718096'}}>Current image:</small><br/>
                      <img 
                        src={restaurantFormData.image?.startsWith('http') ? restaurantFormData.image : `http://localhost:5000${restaurantFormData.image}`}
                        alt="Current"
                        style={{width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem'}}
                      />
                    </div>
                  )}
                </div>

                <h3>License & Verification Documents</h3>
                <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '1rem'}}>
                  You can either enter license numbers manually OR upload a PDF document with all licenses. Both are optional.
                </p>
                
                <div className="form-group">
                  <label>Trade License Number (Optional)</label>
                  <input
                    type="text"
                    value={restaurantFormData.verificationDocuments?.[0]?.tradeLicenseNumber || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      verificationDocuments: [{
                        ...restaurantFormData.verificationDocuments?.[0],
                        tradeLicenseNumber: e.target.value
                      }]
                    })}
                    placeholder="e.g., TRAD/DHAKA/2024/12345"
                  />
                </div>
                <div className="form-group">
                  <label>Food Safety License Number (Optional)</label>
                  <input
                    type="text"
                    value={restaurantFormData.verificationDocuments?.[0]?.foodSafetyLicense || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      verificationDocuments: [{
                        ...restaurantFormData.verificationDocuments?.[0],
                        foodSafetyLicense: e.target.value
                      }]
                    })}
                    placeholder="e.g., FSL/2024/5678"
                  />
                </div>
                <div className="form-group">
                  <label>Business Registration Number (BRN) (Optional)</label>
                  <input
                    type="text"
                    value={restaurantFormData.verificationDocuments?.[0]?.businessRegistration || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      verificationDocuments: [{
                        ...restaurantFormData.verificationDocuments?.[0],
                        businessRegistration: e.target.value
                      }]
                    })}
                    placeholder="e.g., BRN-123456789"
                  />
                </div>
                <div className="form-group">
                  <label>TIN Number (Optional)</label>
                  <input
                    type="text"
                    value={restaurantFormData.verificationDocuments?.[0]?.tinNumber || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      verificationDocuments: [{
                        ...restaurantFormData.verificationDocuments?.[0],
                        tinNumber: e.target.value
                      }]
                    })}
                    placeholder="e.g., 123-456-789-000"
                  />
                </div>
                
                <div className="form-group">
                  <label>OR Upload License Documents (PDF) (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setRestaurantFormData({
                          ...restaurantFormData,
                          verificationDocuments: [{
                            ...restaurantFormData.verificationDocuments?.[0],
                            documentPDFFile: file
                          }]
                        });
                      }
                    }}
                  />
                  {restaurantFormData.verificationDocuments?.[0]?.documentPDF && (
                    <div style={{marginTop: '0.5rem'}}>
                      <a 
                        href={`http://localhost:5000${restaurantFormData.verificationDocuments[0].documentPDF}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{color: '#667eea', textDecoration: 'none'}}
                      >
                        📄 View Current PDF Document
                      </a>
                    </div>
                  )}
                </div>

                <h3>Contact Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={restaurantFormData.contact?.phone || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        contact: {...restaurantFormData.contact, phone: e.target.value}
                      })}
                      placeholder="+880 1XXX-XXXXXX"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={restaurantFormData.contact?.email || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        contact: {...restaurantFormData.contact, email: e.target.value}
                      })}
                      placeholder="contact@restaurant.com"
                    />
                  </div>
                </div>

                <h3>Address</h3>
                <div className="form-group">
                  <label>Full Address *</label>
                  <input
                    type="text"
                    value={restaurantFormData.address?.fullAddress || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      address: {...restaurantFormData.address, fullAddress: e.target.value}
                    })}
                    required
                    placeholder="House/Road, Area, City"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Area *</label>
                    <input
                      type="text"
                      value={restaurantFormData.address?.area || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        address: {...restaurantFormData.address, area: e.target.value}
                      })}
                      required
                      placeholder="e.g. Gulshan, Dhanmondi"
                    />
                  </div>
                  <div className="form-group">
                    <label>City *</label>
                    <input
                      type="text"
                      value={restaurantFormData.address?.city || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        address: {...restaurantFormData.address, city: e.target.value}
                      })}
                      required
                      placeholder="Dhaka"
                    />
                  </div>
                </div>

                <h3>Social Media (Optional)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Facebook Page</label>
                    <input
                      type="url"
                      value={restaurantFormData.socialMedia?.facebook || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        socialMedia: {...restaurantFormData.socialMedia, facebook: e.target.value}
                      })}
                      placeholder="https://facebook.com/yourrestaurant"
                    />
                  </div>
                  <div className="form-group">
                    <label>Instagram</label>
                    <input
                      type="url"
                      value={restaurantFormData.socialMedia?.instagram || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        socialMedia: {...restaurantFormData.socialMedia, instagram: e.target.value}
                      })}
                      placeholder="https://instagram.com/yourrestaurant"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Twitter</label>
                  <input
                    type="url"
                    value={restaurantFormData.socialMedia?.twitter || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      socialMedia: {...restaurantFormData.socialMedia, twitter: e.target.value}
                    })}
                    placeholder="https://twitter.com/yourrestaurant"
                  />
                </div>

                <div className="form-group">
                  <h4 style={{marginTop: '2rem', marginBottom: '1rem'}}>Bank Account Information (For Payments)</h4>
                  <p style={{color: '#666', fontSize: '0.9rem', marginBottom: '1rem'}}>Add your bank account to receive payments from customers via Stripe</p>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Account Holder Name *</label>
                    <input
                      type="text"
                      value={restaurantFormData.bankAccount?.accountHolderName || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        bankAccount: {...restaurantFormData.bankAccount, accountHolderName: e.target.value}
                      })}
                      required
                      placeholder="Full name as per bank account"
                    />
                  </div>
                  <div className="form-group">
                    <label>Bank Name *</label>
                    <input
                      type="text"
                      value={restaurantFormData.bankAccount?.bankName || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        bankAccount: {...restaurantFormData.bankAccount, bankName: e.target.value}
                      })}
                      required
                      placeholder="e.g. Dutch-Bangla Bank, Brac Bank"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Account Number *</label>
                    <input
                      type="text"
                      value={restaurantFormData.bankAccount?.accountNumber || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        bankAccount: {...restaurantFormData.bankAccount, accountNumber: e.target.value}
                      })}
                      required
                      placeholder="Bank account number"
                    />
                  </div>
                  <div className="form-group">
                    <label>Routing Number</label>
                    <input
                      type="text"
                      value={restaurantFormData.bankAccount?.routingNumber || ''}
                      onChange={(e) => setRestaurantFormData({
                        ...restaurantFormData,
                        bankAccount: {...restaurantFormData.bankAccount, routingNumber: e.target.value}
                      })}
                      placeholder="Bank routing number (optional)"
                    />
                  </div>
                </div>
                  </div>
                )}

                {/* STEP 2: Branches */}
                {creationStep === 2 && (
                  <div className="form-step">
                    <h3>Restaurant Branches</h3>
                    <p>Add all your restaurant branches. Each branch can have different menu items.</p>
                    
                    {tempBranches.map((branch, index) => (
                      <div key={index} className="branch-card">
                        <h4>Branch {index + 1}</h4>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Branch Name *</label>
                            <input
                              type="text"
                              value={branch.name}
                              onChange={(e) => {
                                const newBranches = [...tempBranches];
                                newBranches[index].name = e.target.value;
                                setTempBranches(newBranches);
                              }}
                              required
                              placeholder="e.g. Main Branch, Gulshan Branch"
                            />
                          </div>
                          <div className="form-group">
                            <label>Branch Phone</label>
                            <input
                              type="tel"
                              value={branch.phone}
                              onChange={(e) => {
                                const newBranches = [...tempBranches];
                                newBranches[index].phone = e.target.value;
                                setTempBranches(newBranches);
                              }}
                              placeholder="+880 1XXX-XXXXXX"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Branch Address</label>
                          <input
                            type="text"
                            value={branch.address}
                            onChange={(e) => {
                              const newBranches = [...tempBranches];
                              newBranches[index].address = e.target.value;
                              setTempBranches(newBranches);
                            }}
                            placeholder="Branch specific address"
                          />
                        </div>
                        {tempBranches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTempBranches(tempBranches.filter((_, i) => i !== index))}
                            className="remove-branch-btn"
                          >
                            Remove Branch
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => setTempBranches([...tempBranches, { name: '', address: '', phone: '' }])}
                      className="add-branch-btn"
                    >
                      + Add Another Branch
                    </button>
                  </div>
                )}

                {/* STEP 3: Menu Items */}
                {creationStep === 3 && (
                  <div className="form-step">
                    <h3>Menu Items</h3>
                    <p>Add initial menu items for your branches. You can add more later from the dashboard.</p>
                    
                    {tempMenuItems.map((item, index) => (
                      <div key={index} className="menu-item-card">
                        <h4>Item {index + 1}</h4>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Item Name *</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...tempMenuItems];
                                newItems[index].name = e.target.value;
                                setTempMenuItems(newItems);
                              }}
                              required
                              placeholder="e.g. Margherita Pizza"
                            />
                          </div>
                          <div className="form-group">
                            <label>Price (৳) *</label>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...tempMenuItems];
                                newItems[index].price = e.target.value;
                                setTempMenuItems(newItems);
                              }}
                              required
                              placeholder="350"
                            />
                          </div>
                          <div className="form-group">
                            <label>Branch</label>
                            <select
                              value={item.branch}
                              onChange={(e) => {
                                const newItems = [...tempMenuItems];
                                newItems[index].branch = e.target.value;
                                setTempMenuItems(newItems);
                              }}
                            >
                              {tempBranches.map((branch, idx) => (
                                <option key={idx} value={branch.name}>{branch.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Category</label>
                            <select
                              value={item.category}
                              onChange={(e) => {
                                const newItems = [...tempMenuItems];
                                newItems[index].category = e.target.value;
                                setTempMenuItems(newItems);
                              }}
                            >
                              <option value="Appetizers">Appetizers</option>
                              <option value="Mains">Mains</option>
                              <option value="Desserts">Desserts</option>
                              <option value="Beverages">Beverages</option>
                              <option value="Sides">Sides</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Preparation Time (min)</label>
                            <input
                              type="number"
                              value={item.preparationTime}
                              onChange={(e) => {
                                const newItems = [...tempMenuItems];
                                newItems[index].preparationTime = e.target.value;
                                setTempMenuItems(newItems);
                              }}
                              placeholder="15"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...tempMenuItems];
                              newItems[index].description = e.target.value;
                              setTempMenuItems(newItems);
                            }}
                            rows="2"
                            placeholder="Describe the dish"
                          />
                        </div>
                        <div className="form-group">
                          <label>Image Upload *</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const newItems = [...tempMenuItems];
                                newItems[index].imageFile = file;
                                setTempMenuItems(newItems);
                              }
                            }}
                            required
                          />
                          {item.imageFile && <small>Selected: {item.imageFile.name}</small>}
                        </div>
                        <div className="form-row">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={item.available}
                              onChange={(e) => {
                                const newItems = [...tempMenuItems];
                                newItems[index].available = e.target.checked;
                                setTempMenuItems(newItems);
                              }}
                            />
                            Available
                          </label>
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={item.isVegetarian}
                              onChange={(e) => {
                                const newItems = [...tempMenuItems];
                                newItems[index].isVegetarian = e.target.checked;
                                setTempMenuItems(newItems);
                              }}
                            />
                            Vegetarian
                          </label>
                        </div>

                        <div className="form-group">
                          <label>Display Badges (Select all that apply)</label>
                          <div className="checkbox-group">
                            {['Popular', 'New', 'Discounted', 'Best Seller', 'Chef Special'].map(badge => (
                              <label key={badge} className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={item.badges?.includes(badge)}
                                  onChange={(e) => {
                                    const newItems = [...tempMenuItems];
                                    if (e.target.checked) {
                                      newItems[index].badges = [...(newItems[index].badges || []), badge];
                                    } else {
                                      newItems[index].badges = (newItems[index].badges || []).filter(b => b !== badge);
                                    }
                                    setTempMenuItems(newItems);
                                  }}
                                />
                                {badge}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Dietary Tags (Select all that apply)</label>
                          <div className="checkbox-group">
                            {['Halal', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Keto', 'Paleo'].map(tag => (
                              <label key={tag} className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={item.dietary?.includes(tag)}
                                  onChange={(e) => {
                                    const newItems = [...tempMenuItems];
                                    if (e.target.checked) {
                                      newItems[index].dietary = [...(newItems[index].dietary || []), tag];
                                    } else {
                                      newItems[index].dietary = (newItems[index].dietary || []).filter(d => d !== tag);
                                    }
                                    setTempMenuItems(newItems);
                                  }}
                                />
                                {tag}
                              </label>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTempMenuItems(tempMenuItems.filter((_, i) => i !== index))}
                          className="remove-item-btn"
                        >
                          Remove Item
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => setTempMenuItems([...tempMenuItems, {
                        name: '',
                        description: '',
                        price: '',
                        category: 'Mains',
                        available: true,
                        image: '',
                        preparationTime: 15,
                        isVegetarian: false,
                        branch: tempBranches[0]?.name || 'Main Branch',
                        badges: [],
                        dietary: ['Halal']
                      }])}
                      className="add-item-btn"
                    >
                      + Add Menu Item
                    </button>
                  </div>
                )}

                <div className="form-actions">
                  {creationStep > 1 && (
                    <button type="button" onClick={() => setCreationStep(creationStep - 1)} className="back-btn">
                      ← Back
                    </button>
                  )}
                  <button type="button" onClick={() => {
                    setShowRestaurantForm(false);
                    setCreationStep(1);
                  }} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    {creationStep < 3 ? 'Next →' : 'Create Restaurant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="owner-dashboard">
      {/* Navbar */}
      <header className="navbar" style={{background: '#2c3e50', padding: '1rem 2rem', marginBottom: '0'}}>
        <div className="navbar-content" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto'}}>
          <h1 className="logo" style={{color: 'white', margin: 0, marginRight: 'auto'}}>🍽️ FoodShare</h1>
          <nav className="nav-links" style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <button className="nav-btn" onClick={() => navigate('/home')} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Home</button>
            <button className="nav-btn" onClick={() => setActiveTab('orders')} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Orders</button>
            <button className="nav-btn" onClick={() => navigate('/donate-food')} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Donate Food</button>
            <button className="nav-btn" onClick={() => navigate('/my-donations')} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>My Donations</button>
            <button className="nav-btn" onClick={() => navigate('/restaurant-ngo-map')} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Nearby NGOs</button>
            <button className="nav-btn" onClick={() => navigate('/campaigns')} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Campaigns</button>
            <button className="nav-btn" onClick={() => setActiveTab('profile')} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Profile</button>
            <button className="nav-btn nav-btn-primary" onClick={handleLogout} style={{background: '#e74c3c', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>Log Out</button>
          </nav>
        </div>
      </header>

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="restaurant-header-info">
            <img 
              src={restaurant.image?.startsWith('http') ? restaurant.image : `http://localhost:5000${restaurant.image}`} 
              alt={restaurant.name} 
              className="restaurant-logo-header"
              onError={(e) => {e.target.src = 'https://via.placeholder.com/60?text=Logo'}}
            />
            <div>
              <h1>
                {restaurant.name}
                {restaurant.verificationMark && (
                  <span className="verified-badge" style={{marginLeft: '8px', fontSize: '14px'}} title="Verified Restaurant">✅</span>
                )}
              </h1>
              <span className="restaurant-mode-badge">Restaurant Owner</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-container-single">
        {/* Main Content */}
        <div className="dashboard-main-full">
          {(
            <>
              {/* Tabs */}
              <div className="dashboard-tabs">
                <button
                  className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
                  onClick={() => setActiveTab('menu')}
                >
                  Menu Management
                </button>
                <button
                  className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  Restaurant Profile
                </button>
                <button
                  className={`tab-btn ${activeTab === 'branches' ? 'active' : ''}`}
                  onClick={() => setActiveTab('branches')}
                >
                  Branch Management
                </button>
                <button
                  className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('orders');
                    fetchRestaurantOrders();
                  }}
                >
                  📦 Orders
                </button>
              </div>

              {/* Menu Management Tab */}
              {activeTab === 'menu' && (
                <div className="menu-management">
                  <div className="menu-header">
                    <div className="branch-filter">
                      <label>Filter by Branch:</label>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                      >
                        {branches.map((branch, index) => (
                          <option key={`branch-filter-${index}-${branch}`} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={handleAddMenuItem} className="add-menu-btn">
                      + Add Menu Item
                    </button>
                  </div>

                  <div className="menu-items-grid">
                    {filteredMenuItems.length === 0 ? (
                      <div className="no-items">
                        <p>No menu items found for {selectedBranch}</p>
                        <button onClick={handleAddMenuItem} className="add-first-item-btn">
                          Add Your First Menu Item
                        </button>
                      </div>
                    ) : (
                      filteredMenuItems.map(item => (
                        <div key={item._id} className="menu-item-card">
                          <div className="item-image">
                            <img src={item.image?.startsWith('http') ? item.image : `http://localhost:5000${item.image}`} alt={item.name} onError={(e) => e.target.src = 'https://via.placeholder.com/300'} />
                            <div className="item-badges">
                              {!item.available && <span className="badge out-of-stock">Out of Stock</span>}
                              {item.isVegetarian && <span className="badge veg">Veg</span>}
                              {item.isVegan && <span className="badge vegan">Vegan</span>}
                            </div>
                          </div>
                          <div className="item-details">
                            <h4>{item.name}</h4>
                            <p className="item-description">{item.description}</p>
                            <div className="item-meta">
                              <span className="price">৳{item.price}</span>
                              <span className="category">{item.category}</span>
                              <span className="branch-tag">{item.branch || 'All Branches'}</span>
                            </div>
                            {item.spiceLevel > 0 && (
                              <div className="spice-level">
                                {'🌶️'.repeat(item.spiceLevel)}
                              </div>
                            )}
                            <div className="item-actions">
                              <button
                                onClick={() => toggleAvailability(item._id, item.available)}
                                className={`availability-btn ${item.available ? 'available' : 'unavailable'}`}
                              >
                                {item.available ? '✓ Available' : '✗ Out of Stock'}
                              </button>
                              <button onClick={() => handleEditMenuItem(item)} className="edit-btn">
                                Edit
                              </button>
                              <button onClick={() => handleDeleteMenuItem(item._id)} className="delete-btn">
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Restaurant Profile Tab */}
              {activeTab === 'profile' && (
                <div className="restaurant-profile">
                  <div className="profile-header">
                    <h2>Restaurant Information</h2>
                    <button onClick={() => {
                      setRestaurantFormData({
                        ...restaurant,
                        imageFile: null,
                        contact: restaurant.contact || {},
                        address: restaurant.address || {}
                      });
                      setShowRestaurantForm(true);
                    }} className="edit-profile-btn">
                      Edit Profile
                    </button>
                  </div>

                  <div className="profile-sections">
                    {/* Basic Info */}
                    <div className="profile-section">
                      <h3>Basic Information</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <label>Name:</label>
                          <span>{restaurant.name}</span>
                        </div>
                        <div className="info-item">
                          <label>Cuisine:</label>
                          <span>{restaurant.cuisine?.join(', ')}</span>
                        </div>
                        <div className="info-item">
                          <label>Description:</label>
                          <span>{restaurant.description}</span>
                        </div>
                        <div className="info-item">
                          <label>Status:</label>
                          <span className={`status-badge ${restaurant.status.toLowerCase().replace(' ', '-')}`}>
                            {restaurant.status}
                          </span>
                        </div>
                        <div className="info-item">
                          <label>Price Range:</label>
                          <span>{restaurant.priceRange}</span>
                        </div>
                        <div className="info-item">
                          <label>Rating:</label>
                          <span>⭐ {restaurant.rating}/5 ({restaurant.totalReviews} reviews)</span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="profile-section">
                      <h3>Delivery Information</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <label>Delivery Time:</label>
                          <span>{restaurant.deliveryTime} mins</span>
                        </div>
                        <div className="info-item">
                          <label>Delivery Fee:</label>
                          <span>৳{restaurant.deliveryFee}</span>
                        </div>
                        <div className="info-item">
                          <label>Minimum Order:</label>
                          <span>৳{restaurant.minimumOrder}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="profile-section">
                      <h3>Contact Information</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <label>Phone:</label>
                          <span>{restaurant.contact?.phone || 'Not provided'}</span>
                        </div>
                        <div className="info-item">
                          <label>Email:</label>
                          <span>{restaurant.contact?.email || 'Not provided'}</span>
                        </div>
                        <div className="info-item">
                          <label>Website:</label>
                          <span>{restaurant.contact?.website || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="profile-section">
                      <h3>Address</h3>
                      <div className="info-grid">
                        <div className="info-item full-width">
                          <label>Full Address:</label>
                          <span>{restaurant.address?.fullAddress || restaurant.address?.street}</span>
                        </div>
                        <div className="info-item">
                          <label>Area:</label>
                          <span>{restaurant.address?.area}</span>
                        </div>
                        <div className="info-item">
                          <label>City:</label>
                          <span>{restaurant.address?.city}</span>
                        </div>
                      </div>
                    </div>

                    {/* License & Verification */}
                    <div className="profile-section">
                      <h3>License & Verification Documents</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <label>Verification Status:</label>
                          <span className={`status-badge ${restaurant.isVerified ? 'verified' : 'pending'}`}>
                            {restaurant.isVerified ? '✓ Verified' : 'Pending Verification'}
                          </span>
                        </div>
                        <div className="info-item">
                          <label>Trade License:</label>
                          <span>{restaurant.verificationDocuments?.[0]?.tradeLicenseNumber || 'Not provided'}</span>
                        </div>
                        <div className="info-item">
                          <label>Food Safety License:</label>
                          <span>{restaurant.verificationDocuments?.[0]?.foodSafetyLicense || 'Not provided'}</span>
                        </div>
                        <div className="info-item">
                          <label>Business Registration:</label>
                          <span>{restaurant.verificationDocuments?.[0]?.businessRegistration || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Opening Hours */}
                    <div className="profile-section">
                      <h3>Opening Hours</h3>
                      <div className="hours-grid">
                        {Object.entries(restaurant.openingHours || {}).map(([day, hours]) => (
                          <div key={day} className="hour-item">
                            <span className="day">{day.charAt(0).toUpperCase() + day.slice(1)}:</span>
                            <span className="time">{hours?.open || '10:00'} - {hours?.close || '22:00'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Social Media */}
                    <div className="profile-section">
                      <h3>Social Media</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <label>Facebook:</label>
                          <span>{restaurant.socialMedia?.facebook || 'Not provided'}</span>
                        </div>
                        <div className="info-item">
                          <label>Instagram:</label>
                          <span>{restaurant.socialMedia?.instagram || 'Not provided'}</span>
                        </div>
                        <div className="info-item">
                          <label>Twitter:</label>
                          <span>{restaurant.socialMedia?.twitter || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Branch Management Tab */}
              {activeTab === 'branches' && (
                <div className="branch-management">
                  <div className="branch-header">
                    <h2>Manage Branches</h2>
                    <button 
                      className="add-branch-btn"
                      onClick={() => {
                        setCreationStep(2);
                        setShowRestaurantForm(true);
                      }}
                      style={{
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginTop: '1rem'
                      }}
                    >
                      + Edit Branches
                    </button>
                  </div>
                  <div className="branches-list" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem'}}>
                    {tempBranches && tempBranches.length > 0 ? (
                      tempBranches.map((branch, index) => (
                        <div key={index} className="branch-card" style={{
                          background: 'white',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: '1px solid #e0e0e0'
                        }}>
                          <h4 style={{marginBottom: '1rem', color: '#2c3e50', fontSize: '1.2rem'}}>{branch.name}</h4>
                          <div style={{marginBottom: '0.75rem'}}>
                            <strong>📍 Address:</strong>
                            <p style={{margin: '0.25rem 0', color: '#666'}}>{branch.address || 'Not set'}</p>
                          </div>
                          <div style={{marginBottom: '0.75rem'}}>
                            <strong>📞 Phone:</strong>
                            <p style={{margin: '0.25rem 0', color: '#666'}}>{branch.phone || 'Not set'}</p>
                          </div>
                          <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0'}}>
                            <p style={{color: '#888', fontSize: '0.9rem'}}>
                              Menu Items: {menuItems.filter(item => item.branch === branch.name).length}
                            </p>
                          </div>
                          <button 
                            className="view-branch-btn" 
                            onClick={() => {
                              setSelectedBranch(branch.name);
                              setActiveTab('menu');
                            }}
                            style={{
                              width: '100%',
                              marginTop: '1rem',
                              background: '#3498db',
                              color: 'white',
                              border: 'none',
                              padding: '0.75rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            View Menu
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '2rem'}}>
                        <p style={{color: '#888', marginBottom: '1rem'}}>No branches added yet</p>
                        <button 
                          onClick={() => {
                            setCreationStep(2);
                            setShowRestaurantForm(true);
                          }}
                          style={{
                            background: '#27ae60',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Add Your First Branch
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}



              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="orders-management">
                  <div className="orders-header" style={{marginBottom: '2rem'}}>
                    <h2>📦 Restaurant Orders</h2>
                    <p style={{color: '#666', marginTop: '0.5rem'}}>Orders placed by customers at your restaurant</p>
                  </div>

                  {ordersLoading ? (
                    <div style={{textAlign: 'center', padding: '3rem'}}>
                      <div className="loading-spinner"></div>
                      <p>Loading orders...</p>
                    </div>
                  ) : restaurantOrders.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '3rem', background: '#f8f9fa', borderRadius: '8px'}}>
                      <div style={{fontSize: '4rem', marginBottom: '1rem'}}>📭</div>
                      <h3>No Orders Yet</h3>
                      <p style={{color: '#666'}}>Orders from customers will appear here</p>
                    </div>
                  ) : (
                    <div className="orders-list">
                      {restaurantOrders.map(order => (
                        <div key={order._id} className="order-card" style={{background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                            <div>
                              <h3 style={{margin: '0 0 0.5rem 0'}}>Order #{order.orderNumber}</h3>
                              <p style={{margin: 0, color: '#666'}}>
                                {order.customer?.role === 'NGO' ? '🏢 NGO' : '👤 Customer'}: {order.customer?.name || 'N/A'} | {order.customer?.phone || 'N/A'}
                              </p>
                            </div>
                            <div style={{textAlign: 'right'}}>
                              <span style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                background: order.status === 'delivered' ? '#4caf50' : order.status === 'cancelled' ? '#f44336' : '#ff9800',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                              }}>
                                {order.status.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div style={{marginBottom: '1rem'}}>
                            <strong>Items:</strong>
                            <ul style={{marginTop: '0.5rem', paddingLeft: '1.5rem'}}>
                              {order.items?.map((item, idx) => (
                                <li key={idx}>
                                  {item.name} x{item.quantity} - ৳{(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px'}}>
                            <div>
                              <strong>Total:</strong> ৳{order.pricing?.total?.toFixed(2)}
                            </div>
                            <div>
                              <strong>Payment:</strong> <span style={{color: order.payment?.status === 'paid' ? '#4caf50' : '#f44336'}}>{order.payment?.status?.toUpperCase()}</span>
                            </div>
                            <div>
                              <strong>Ordered:</strong> {new Date(order.createdAt).toLocaleString()}
                            </div>
                          </div>

                          {/* Donation Split Information */}
                          {order.donation && order.donation.amount > 0 && (
                            <div style={{marginTop: '1rem', padding: '0.75rem', background: '#e6f7ff', borderRadius: '4px', borderLeft: '4px solid #1890ff'}}>
                              <strong>💝 Donation Included:</strong>
                              <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem'}}>
                                ৳{order.donation.amount.toFixed(2)} donated to <strong>{order.donation.ngoName || order.donation.ngo?.organizationName || order.donation.ngo?.name || 'NGO'}</strong>
                                <br />
                                Restaurant receives: ৳{order.pricing.total.toFixed(2)} (Full order amount)
                              </p>
                            </div>
                          )}

                          {order.deliveryAddress && (
                            <div style={{marginTop: '1rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '4px'}}>
                              <strong>📍 Delivery Address:</strong> {order.deliveryAddress.fullAddress || order.deliveryAddress.street}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Menu Item Form Modal */}
      {showMenuForm && (
        <div className="modal-overlay" onClick={() => setShowMenuForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
              <button className="close-btn" onClick={() => setShowMenuForm(false)}>×</button>
            </div>
            <form onSubmit={handleSaveMenuItem} className="menu-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Item Name *</label>
                  <input
                    type="text"
                    value={menuItemFormData.name}
                    onChange={(e) => setMenuItemFormData({...menuItemFormData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price (৳) *</label>
                  <input
                    type="number"
                    value={menuItemFormData.price}
                    onChange={(e) => setMenuItemFormData({...menuItemFormData, price: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={menuItemFormData.description}
                  onChange={(e) => setMenuItemFormData({...menuItemFormData, description: e.target.value})}
                  rows="3"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={menuItemFormData.category}
                    onChange={(e) => setMenuItemFormData({...menuItemFormData, category: e.target.value})}
                  >
                    <option value="Mains">Mains</option>
                    <option value="Starters">Starters</option>
                    <option value="Sides">Sides</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                    <option value="BBQ">BBQ</option>
                    <option value="Pizza">Pizza</option>
                    <option value="Burgers">Burgers</option>
                    <option value="Biryani">Biryani</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Thai">Thai</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Snacks">Snacks</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <select
                    value={menuItemFormData.branch}
                    onChange={(e) => setMenuItemFormData({...menuItemFormData, branch: e.target.value})}
                  >
                    <option key="all-branches" value="All Branches">All Branches</option>
                    {branches.filter(b => b !== 'All Branches').map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                    <option key="custom-branch" value="custom">+ Add New Branch</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Preparation Time (mins)</label>
                  <input
                    type="number"
                    value={menuItemFormData.preparationTime}
                    onChange={(e) => setMenuItemFormData({...menuItemFormData, preparationTime: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Spice Level (0-5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={menuItemFormData.spiceLevel}
                    onChange={(e) => setMenuItemFormData({...menuItemFormData, spiceLevel: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Image Upload {!editingItem && '*'}</label>
                {editingItem && menuItemFormData.currentImage && !menuItemFormData.imageFile && (
                  <div className="current-image-preview">
                    <img 
                      src={menuItemFormData.currentImage?.startsWith('http') ? menuItemFormData.currentImage : `http://localhost:5000${menuItemFormData.currentImage}`} 
                      alt="Current" 
                      style={{maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', marginBottom: '10px', borderRadius: '8px'}}
                      onError={(e) => e.target.src = 'https://via.placeholder.com/200'}
                    />
                    <p style={{fontSize: '0.9rem', color: '#666'}}>Current image (upload new to replace)</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setMenuItemFormData({...menuItemFormData, imageFile: file});
                    }
                  }}
                  required={!editingItem}
                />
                {menuItemFormData.imageFile && <small>New image selected: {menuItemFormData.imageFile.name}</small>}
              </div>

              <div className="form-row checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={menuItemFormData.available}
                    onChange={(e) => setMenuItemFormData({...menuItemFormData, available: e.target.checked})}
                  />
                  Available (In Stock)
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={menuItemFormData.isVegetarian}
                    onChange={(e) => setMenuItemFormData({...menuItemFormData, isVegetarian: e.target.checked})}
                  />
                  Vegetarian
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={menuItemFormData.isVegan}
                    onChange={(e) => setMenuItemFormData({...menuItemFormData, isVegan: e.target.checked})}
                  />
                  Vegan
                </label>
              </div>

              <div className="form-group">
                <label>Display Badges (Select all that apply)</label>
                <div className="checkbox-group">
                  {['Popular', 'New', 'Discounted', 'Best Seller', 'Chef Special'].map(badge => (
                    <label key={badge} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={menuItemFormData.badges?.includes(badge)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMenuItemFormData({...menuItemFormData, badges: [...(menuItemFormData.badges || []), badge]});
                          } else {
                            setMenuItemFormData({...menuItemFormData, badges: (menuItemFormData.badges || []).filter(b => b !== badge)});
                          }
                        }}
                      />
                      {badge}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Dietary Tags (Select all that apply)</label>
                <div className="checkbox-group">
                  {['Halal', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Keto', 'Paleo'].map(tag => (
                    <label key={tag} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={menuItemFormData.dietary?.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMenuItemFormData({...menuItemFormData, dietary: [...(menuItemFormData.dietary || []), tag]});
                          } else {
                            setMenuItemFormData({...menuItemFormData, dietary: (menuItemFormData.dietary || []).filter(d => d !== tag)});
                          }
                        }}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowMenuForm(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restaurant Profile Edit Modal */}
      {showRestaurantForm && (
        <div className="modal-overlay" onClick={() => {
          setShowRestaurantForm(false);
          setCreationStep(1);
        }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{creationStep === 2 ? 'Edit Branches' : 'Edit Restaurant Profile'}</h2>
              <button className="close-btn" onClick={() => {
                setShowRestaurantForm(false);
                setCreationStep(1);
              }}>×</button>
            </div>

            {/* Step Navigation */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '0 1rem',
              borderBottom: '2px solid #e0e0e0'
            }}>
              <button
                type="button"
                onClick={() => setCreationStep(1)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: creationStep === 1 ? '3px solid #3498db' : '3px solid transparent',
                  color: creationStep === 1 ? '#3498db' : '#666',
                  fontWeight: creationStep === 1 ? 'bold' : 'normal',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Basic Info
              </button>
              <button
                type="button"
                onClick={() => setCreationStep(2)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: creationStep === 2 ? '3px solid #3498db' : '3px solid transparent',
                  color: creationStep === 2 ? '#3498db' : '#666',
                  fontWeight: creationStep === 2 ? 'bold' : 'normal',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Branches ({tempBranches.length})
              </button>
            </div>

            <form onSubmit={handleSaveRestaurantProfile} className="restaurant-form">
              {/* Basic Info - Show when creationStep === 1 */}
              {creationStep === 1 && (
                <div>
                  <h3>Basic Information</h3>
              
              {/* Restaurant Image Upload */}
              <div className="form-group">
                <label>Restaurant Image</label>
                {restaurantFormData.image && !restaurantFormData.imageFile && (
                  <div className="current-image-preview">
                    <img 
                      src={restaurantFormData.image?.startsWith('http') 
                        ? restaurantFormData.image 
                        : `http://localhost:5000${restaurantFormData.image}`
                      } 
                      alt="Current restaurant" 
                      style={{maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px'}}
                    />
                    <p style={{fontSize: '0.9rem', color: '#666'}}>Current Image</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setRestaurantFormData({
                        ...restaurantFormData,
                        imageFile: file
                      });
                    }
                  }}
                />
                {restaurantFormData.imageFile && (
                  <p style={{fontSize: '0.9rem', color: '#22c55e', marginTop: '5px'}}>
                    ✓ New image selected: {restaurantFormData.imageFile.name}
                  </p>
                )}
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Restaurant Name *</label>
                  <input
                    type="text"
                    value={restaurantFormData.name}
                    onChange={(e) => setRestaurantFormData({...restaurantFormData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select
                    value={restaurantFormData.status}
                    onChange={(e) => setRestaurantFormData({...restaurantFormData, status: e.target.value})}
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Temporarily Closed">Temporarily Closed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={restaurantFormData.description}
                  onChange={(e) => setRestaurantFormData({...restaurantFormData, description: e.target.value})}
                  rows="3"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price Range</label>
                  <select
                    value={restaurantFormData.priceRange}
                    onChange={(e) => setRestaurantFormData({...restaurantFormData, priceRange: e.target.value})}
                  >
                    <option value="৳">৳ (Budget)</option>
                    <option value="৳৳">৳৳ (Moderate)</option>
                    <option value="৳৳৳">৳৳৳ (Premium)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Delivery Time (mins)</label>
                  <input
                    type="number"
                    value={restaurantFormData.deliveryTime}
                    onChange={(e) => setRestaurantFormData({...restaurantFormData, deliveryTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Delivery Fee (৳)</label>
                  <input
                    type="number"
                    value={restaurantFormData.deliveryFee}
                    onChange={(e) => setRestaurantFormData({...restaurantFormData, deliveryFee: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Order (৳)</label>
                  <input
                    type="number"
                    value={restaurantFormData.minimumOrder}
                    onChange={(e) => setRestaurantFormData({...restaurantFormData, minimumOrder: e.target.value})}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <h3>Contact Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={restaurantFormData.contact?.phone || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      contact: {...restaurantFormData.contact, phone: e.target.value}
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={restaurantFormData.contact?.email || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      contact: {...restaurantFormData.contact, email: e.target.value}
                    })}
                  />
                </div>
              </div>

              {/* Address */}
              <h3>Address</h3>
              <div className="form-group">
                <label>Full Address</label>
                <input
                  type="text"
                  value={restaurantFormData.address?.fullAddress || ''}
                  onChange={(e) => setRestaurantFormData({
                    ...restaurantFormData,
                    address: {...restaurantFormData.address, fullAddress: e.target.value}
                  })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Area</label>
                  <input
                    type="text"
                    value={restaurantFormData.address?.area || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      address: {...restaurantFormData.address, area: e.target.value}
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={restaurantFormData.address?.city || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      address: {...restaurantFormData.address, city: e.target.value}
                    })}
                  />
                </div>
              </div>

              {/* License & Verification Documents */}
              <h3>License & Verification Documents</h3>
              <div className="form-group">
                <label>Trade License Number</label>
                <input
                  type="text"
                  value={restaurantFormData.verificationDocuments?.[0]?.tradeLicenseNumber || ''}
                  onChange={(e) => setRestaurantFormData({
                    ...restaurantFormData,
                    verificationDocuments: [{
                      ...restaurantFormData.verificationDocuments?.[0],
                      tradeLicenseNumber: e.target.value
                    }]
                  })}
                  placeholder="e.g., TRAD/DHAKA/2024/12345"
                />
              </div>
              <div className="form-group">
                <label>Food Safety License Number</label>
                <input
                  type="text"
                  value={restaurantFormData.verificationDocuments?.[0]?.foodSafetyLicense || ''}
                  onChange={(e) => setRestaurantFormData({
                    ...restaurantFormData,
                    verificationDocuments: [{
                      ...restaurantFormData.verificationDocuments?.[0],
                      foodSafetyLicense: e.target.value
                    }]
                  })}
                  placeholder="e.g., FSL/2024/5678"
                />
              </div>
              <div className="form-group">
                <label>Business Registration Number (BRN)</label>
                <input
                  type="text"
                  value={restaurantFormData.verificationDocuments?.[0]?.businessRegistration || ''}
                  onChange={(e) => setRestaurantFormData({
                    ...restaurantFormData,
                    verificationDocuments: [{
                      ...restaurantFormData.verificationDocuments?.[0],
                      businessRegistration: e.target.value
                    }]
                  })}
                  placeholder="e.g., BRN-123456789"
                />
              </div>

              {/* Social Media */}
              <h3>Social Media (Optional)</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Facebook Page</label>
                  <input
                    type="url"
                    value={restaurantFormData.socialMedia?.facebook || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      socialMedia: {...restaurantFormData.socialMedia, facebook: e.target.value}
                    })}
                    placeholder="https://facebook.com/yourrestaurant"
                  />
                </div>
                <div className="form-group">
                  <label>Instagram</label>
                  <input
                    type="url"
                    value={restaurantFormData.socialMedia?.instagram || ''}
                    onChange={(e) => setRestaurantFormData({
                      ...restaurantFormData,
                      socialMedia: {...restaurantFormData.socialMedia, instagram: e.target.value}
                    })}
                    placeholder="https://instagram.com/yourrestaurant"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Twitter</label>
                <input
                  type="url"
                  value={restaurantFormData.socialMedia?.twitter || ''}
                  onChange={(e) => setRestaurantFormData({
                    ...restaurantFormData,
                    socialMedia: {...restaurantFormData.socialMedia, twitter: e.target.value}
                  })}
                  placeholder="https://twitter.com/yourrestaurant"
                />
              </div>
                </div>
              )}

              {/* Branches Section - Show when creationStep === 2 */}
              {creationStep === 2 && (
                <div>
                  <h3>Restaurant Branches</h3>
                  <p style={{color: '#666', marginBottom: '1rem'}}>Add all your restaurant branches. Each branch can have different menu items.</p>
                  
                  {tempBranches.map((branch, index) => (
                    <div key={index} className="branch-card" style={{
                      background: '#f9f9f9',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      border: '1px solid #e0e0e0'
                    }}>
                      <h4 style={{marginBottom: '1rem'}}>Branch {index + 1}</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Branch Name *</label>
                          <input
                            type="text"
                            value={branch.name}
                            onChange={(e) => {
                              const newBranches = [...tempBranches];
                              newBranches[index].name = e.target.value;
                              setTempBranches(newBranches);
                            }}
                            required
                            placeholder="e.g. Main Branch, Gulshan Branch"
                          />
                        </div>
                        <div className="form-group">
                          <label>Branch Phone</label>
                          <input
                            type="tel"
                            value={branch.phone}
                            onChange={(e) => {
                              const newBranches = [...tempBranches];
                              newBranches[index].phone = e.target.value;
                              setTempBranches(newBranches);
                            }}
                            placeholder="+880 1XXX-XXXXXX"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Branch Address</label>
                        <input
                          type="text"
                          value={branch.address}
                          onChange={(e) => {
                            const newBranches = [...tempBranches];
                            newBranches[index].address = e.target.value;
                            setTempBranches(newBranches);
                          }}
                          placeholder="Branch specific address"
                        />
                      </div>
                      {tempBranches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setTempBranches(tempBranches.filter((_, i) => i !== index))}
                          style={{
                            background: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove Branch
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => setTempBranches([...tempBranches, { name: '', address: '', phone: '' }])}
                    style={{
                      background: '#27ae60',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '1rem'
                    }}
                  >
                    + Add Another Branch
                  </button>
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowRestaurantForm(false);
                  setCreationStep(1); // Reset to basic info when closing
                }} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Notifications Pop-up */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {notifications.map(notification => (
            <div key={notification.id} style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              minWidth: '350px',
              maxWidth: '400px',
              animation: 'slideIn 0.3s ease-out',
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                <span style={{fontSize: '32px'}}>🔔</span>
                <div>
                  <h3 style={{margin: 0, fontSize: '18px', fontWeight: 'bold'}}>New Order!</h3>
                  <p style={{margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9}}>
                    From: {notification.customerName}
                  </p>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500'}}>
                  📦 Items Ordered:
                </p>
                {notification.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} style={{
                    fontSize: '13px',
                    padding: '4px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: idx < Math.min(notification.items.length, 3) - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                  }}>
                    <span>{item.name}</span>
                    <span style={{fontWeight: 'bold'}}>x{item.quantity}</span>
                  </div>
                ))}
                {notification.items.length > 3 && (
                  <p style={{margin: '4px 0 0 0', fontSize: '12px', opacity: 0.8, fontStyle: 'italic'}}>
                    +{notification.items.length - 3} more items
                  </p>
                )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.2)'
              }}>
                <span style={{fontSize: '14px', fontWeight: '500'}}>
                  Total Items: {notification.totalItems}
                </span>
                <span style={{fontSize: '16px', fontWeight: 'bold'}}>
                  ৳{notification.total}
                </span>
              </div>
              
              <button
                onClick={() => {
                  setActiveTab('orders');
                  fetchRestaurantOrders();
                  setNotifications(prev => prev.filter(n => n.id !== notification.id));
                }}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                View Order Details
              </button>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      
      {/* Chatbot */}
      <Chatbot />
    </div>
  );
};

export default RestaurantDashboard;
