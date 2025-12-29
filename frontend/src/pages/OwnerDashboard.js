import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OwnerDashboard.css';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [ownerData, setOwnerData] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [restaurantFormData, setRestaurantFormData] = useState({
    name: '',
    description: '',
    cuisine: '',
    priceRange: '',
    deliveryTime: '',
    deliveryFee: '',
    minimumOrder: '',
    address: { area: '', city: '', fullAddress: '' },
    contact: { phone: '' }
  });
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
    branch: '',
    stock: 'in-stock'
  });

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('ownerToken');
    const userData = localStorage.getItem('ownerData');

    if (!token || !userData) {
      navigate('/owner/login');
      return;
    }

    setOwnerData(JSON.parse(userData));
    fetchRestaurants();
  }, [navigate]);

  const fetchRestaurants = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      const response = await fetch('http://localhost:5000/api/restaurants/owner/my-restaurants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRestaurants(data.restaurants);
        if (data.restaurants.length > 0 && !selectedRestaurant) {
          setSelectedRestaurant(data.restaurants[0]);
          fetchMenuItems(data.restaurants[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (restaurantId) => {
    try {
      const token = localStorage.getItem('ownerToken');
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
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const handleRestaurantSelect = (restaurant) => {
    setSelectedRestaurant(restaurant);
    fetchMenuItems(restaurant._id);
  };

  const handleLogout = () => {
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerData');
    navigate('/owner/login');
  };

  const handleEditRestaurant = (restaurant) => {
    setEditingRestaurant(restaurant);
    setRestaurantFormData({
      name: restaurant.name || '',
      description: restaurant.description || '',
      cuisine: Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : '',
      priceRange: restaurant.priceRange || '',
      deliveryTime: restaurant.deliveryTime || '',
      deliveryFee: restaurant.deliveryFee || '',
      minimumOrder: restaurant.minimumOrder || '',
      address: {
        area: restaurant.address?.area || '',
        city: restaurant.address?.city || '',
        fullAddress: restaurant.address?.fullAddress || ''
      },
      contact: {
        phone: restaurant.contact?.phone || ''
      }
    });
    setShowRestaurantForm(true);
  };

  const handleRestaurantFormChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setRestaurantFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setRestaurantFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSaveRestaurant = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ownerToken');
      const formData = {
        ...restaurantFormData,
        cuisine: restaurantFormData.cuisine.split(',').map(c => c.trim())
      };

      const response = await fetch(
        `http://localhost:5000/api/restaurants/owner/restaurants/${editingRestaurant._id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();
      if (data.success) {
        alert('Restaurant updated successfully!');
        setShowRestaurantForm(false);
        setEditingRestaurant(null);
        fetchRestaurants();
      } else {
        alert('Error updating restaurant: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving restaurant:', error);
      alert('Error saving restaurant');
    }
  };

  const handleMenuItemFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMenuItemFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditMenuItem = (item) => {
    setEditingItem(item);
    setMenuItemFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      available: item.available,
      image: item.image || '',
      preparationTime: item.preparationTime || 15,
      isVegetarian: item.isVegetarian || false,
      isVegan: item.isVegan || false,
      spiceLevel: item.spiceLevel || 0,
      branch: item.branch || '',
      stock: item.available ? 'in-stock' : 'out-of-stock'
    });
    setShowMenuForm(true);
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('ownerToken');
      const url = editingItem 
        ? `http://localhost:5000/api/restaurants/owner/menu-items/${editingItem._id}`
        : `http://localhost:5000/api/restaurants/owner/restaurants/${selectedRestaurant._id}/menu`;
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const formData = new FormData();
      formData.append('name', menuItemFormData.name);
      formData.append('description', menuItemFormData.description);
      formData.append('price', parseFloat(menuItemFormData.price));
      formData.append('category', menuItemFormData.category);
      formData.append('available', menuItemFormData.stock === 'in-stock');
      
      if (menuItemFormData.imageFile) {
        formData.append('image', menuItemFormData.imageFile);
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        alert(editingItem ? 'Menu item updated successfully!' : 'Menu item created successfully!');
        setShowMenuForm(false);
        setEditingItem(null);
        setMenuItemFormData({
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
          branch: '',
          stock: 'in-stock'
        });
        fetchMenuItems(selectedRestaurant._id);
      } else {
        alert('Failed to save menu item: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Error saving menu item');
    }
  };

  const toggleAvailability = async (itemId, currentStatus) => {
    try {
      const token = localStorage.getItem('ownerToken');
      const response = await fetch(
        `http://localhost:5000/api/restaurants/owner/restaurants/${selectedRestaurant._id}/menu/availability`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            itemIds: [itemId],
            available: !currentStatus
          })
        }
      );

      if (response.ok) {
        fetchMenuItems(selectedRestaurant._id);
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const deleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('ownerToken');
      const response = await fetch(
        `http://localhost:5000/api/restaurants/owner/menu-items/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        fetchMenuItems(selectedRestaurant._id);
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="owner-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>
              <i className="fas fa-store"></i> Restaurant Owner Dashboard
            </h1>
            <p>Welcome back, {ownerData?.name}!</p>
            <span className="owner-badge">👑 Owner Mode</span>
          </div>
          <div className="header-right">
            <button className="logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
            <div className="section-header">
              <h3>My Restaurants</h3>
              <button 
                className="add-btn"
                onClick={() => setShowRestaurantForm(true)}
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>

            {restaurants.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-store-slash"></i>
                <p>No restaurants yet</p>
                <button 
                  className="primary-btn"
                  onClick={() => setShowRestaurantForm(true)}
                >
                  Create First Restaurant
                </button>
              </div>
            ) : (
              <div className="restaurant-list">
                {restaurants.map((restaurant) => (
                  <div
                    key={restaurant._id}
                    className={`restaurant-item ${
                      selectedRestaurant?._id === restaurant._id ? 'active' : ''
                    }`}
                    onClick={() => handleRestaurantSelect(restaurant)}
                  >
                    <img 
                      src={restaurant.image || 'https://via.placeholder.com/60'} 
                      alt={restaurant.name} 
                    />
                    <div className="restaurant-info">
                      <h4>{restaurant.name}</h4>
                      <p>
                        <i className="fas fa-star"></i> {restaurant.rating || 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Panel */}
        <main className="dashboard-main">
          {selectedRestaurant ? (
            <>
              {/* Restaurant Info */}
              <div className="restaurant-banner">
                <img 
                  src={selectedRestaurant.heroImage || selectedRestaurant.image} 
                  alt={selectedRestaurant.name} 
                />
                <div className="restaurant-details">
                  <h2>{selectedRestaurant.name}</h2>
                  <div className="restaurant-stats">
                    <span>
                      <i className="fas fa-star"></i> {selectedRestaurant.rating || 0}
                    </span>
                    <span>
                      <i className="fas fa-clock"></i> {selectedRestaurant.deliveryTime} min
                    </span>
                    <span>
                      <i className="fas fa-shopping-bag"></i> {selectedRestaurant.totalOrders || 0} orders
                    </span>
                  </div>
                  <button 
                    className="edit-restaurant-btn"
                    onClick={() => handleEditRestaurant(selectedRestaurant)}
                  >
                    <i className="fas fa-edit"></i> Edit Restaurant
                  </button>
                </div>
              </div>

              {/* Menu Items Section */}
              <div className="menu-section">
                <div className="section-header">
                  <h3>Menu Items ({menuItems.length})</h3>
                  <button 
                    className="primary-btn"
                    onClick={() => {
                      setEditingItem(null);
                      setShowMenuForm(true);
                    }}
                  >
                    <i className="fas fa-plus"></i> Add Menu Item
                  </button>
                </div>

                {menuItems.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-utensils"></i>
                    <p>No menu items yet</p>
                    <button 
                      className="primary-btn"
                      onClick={() => setShowMenuForm(true)}
                    >
                      Add First Menu Item
                    </button>
                  </div>
                ) : (
                  <div className="menu-grid">
                    {menuItems.map((item) => (
                      <div key={item._id} className="menu-card">
                        <img 
                          src={item.image || 'https://via.placeholder.com/200'} 
                          alt={item.name} 
                        />
                        <div className="menu-card-content">
                          <div className="menu-card-header">
                            <h4>{item.name}</h4>
                            <span className={`availability-badge ${item.available ? 'available' : 'unavailable'}`}>
                              {item.available ? 'Available' : 'Out of Stock'}
                            </span>
                          </div>
                          <p className="menu-description">{item.description}</p>
                          <div className="menu-meta">
                            <div className="menu-price">৳{item.price}</div>
                            {item.branch && (
                              <div className="menu-branch">
                                <i className="fas fa-map-marker-alt"></i> {item.branch}
                              </div>
                            )}
                          </div>
                          <div className="menu-actions">
                            <button 
                              className="toggle-btn"
                              onClick={() => toggleAvailability(item._id, item.available)}
                            >
                              <i className={`fas fa-${item.available ? 'eye-slash' : 'eye'}`}></i>
                              {item.available ? 'Disable' : 'Enable'}
                            </button>
                            <button 
                              className="edit-btn"
                              onClick={() => handleEditMenuItem(item)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => deleteMenuItem(item._id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state-main">
              <i className="fas fa-store"></i>
              <h2>No Restaurant Selected</h2>
              <p>Create your first restaurant to get started</p>
            </div>
          )}
        </main>
      </div>

      {/* Restaurant Edit Form Modal */}
      {showRestaurantForm && editingRestaurant && (
        <div className="modal-overlay" onClick={() => setShowRestaurantForm(false)}>
          <div className="modal-content restaurant-form" onClick={(e) => e.stopPropagation()}>
            <h3><i className="fas fa-edit"></i> Edit Restaurant</h3>
            <form onSubmit={handleSaveRestaurant}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Restaurant Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={restaurantFormData.name}
                    onChange={handleRestaurantFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Cuisine (comma-separated) *</label>
                  <input
                    type="text"
                    name="cuisine"
                    value={restaurantFormData.cuisine}
                    onChange={handleRestaurantFormChange}
                    placeholder="e.g. Italian, Pizza, Pasta"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description *</label>
                  <textarea
                    name="description"
                    value={restaurantFormData.description}
                    onChange={handleRestaurantFormChange}
                    rows="3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Price Range *</label>
                  <select
                    name="priceRange"
                    value={restaurantFormData.priceRange}
                    onChange={handleRestaurantFormChange}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="৳">৳ (Budget)</option>
                    <option value="৳৳">৳৳ (Moderate)</option>
                    <option value="৳৳৳">৳৳৳ (Expensive)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Delivery Time (minutes) *</label>
                  <input
                    type="number"
                    name="deliveryTime"
                    value={restaurantFormData.deliveryTime}
                    onChange={handleRestaurantFormChange}
                    min="10"
                    max="120"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Delivery Fee (৳) *</label>
                  <input
                    type="number"
                    name="deliveryFee"
                    value={restaurantFormData.deliveryFee}
                    onChange={handleRestaurantFormChange}
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Minimum Order (৳) *</label>
                  <input
                    type="number"
                    name="minimumOrder"
                    value={restaurantFormData.minimumOrder}
                    onChange={handleRestaurantFormChange}
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Area *</label>
                  <input
                    type="text"
                    name="address.area"
                    value={restaurantFormData.address.area}
                    onChange={handleRestaurantFormChange}
                    placeholder="e.g. Gulshan"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="address.city"
                    value={restaurantFormData.address.city}
                    onChange={handleRestaurantFormChange}
                    placeholder="e.g. Dhaka"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Full Address *</label>
                  <input
                    type="text"
                    name="address.fullAddress"
                    value={restaurantFormData.address.fullAddress}
                    onChange={handleRestaurantFormChange}
                    placeholder="e.g. Road 79, House 5, Gulshan, Dhaka"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Phone *</label>
                  <input
                    type="tel"
                    name="contact.phone"
                    value={restaurantFormData.contact.phone}
                    onChange={handleRestaurantFormChange}
                    placeholder="+8801XXXXXXXXX"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowRestaurantForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  <i className="fas fa-save"></i> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMenuForm && (
        <div className="modal-overlay" onClick={() => setShowMenuForm(false)}>
          <div className="modal-content menu-item-form" onClick={(e) => e.stopPropagation()}>
            <h3>
              <i className="fas fa-utensils"></i> {editingItem ? 'Edit' : 'Add'} Menu Item
            </h3>
            <form onSubmit={handleSaveMenuItem}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Item Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={menuItemFormData.name}
                    onChange={handleMenuItemFormChange}
                    placeholder="e.g. Chicken Biryani"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description *</label>
                  <textarea
                    name="description"
                    value={menuItemFormData.description}
                    onChange={handleMenuItemFormChange}
                    placeholder="Describe the dish..."
                    rows="3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Price (৳) *</label>
                  <input
                    type="number"
                    name="price"
                    value={menuItemFormData.price}
                    onChange={handleMenuItemFormChange}
                    placeholder="299"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={menuItemFormData.category}
                    onChange={handleMenuItemFormChange}
                    required
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
                    <option value="Continental">Continental</option>
                    <option value="Salads">Salads</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Combo Meals">Combo Meals</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Chicken">Chicken</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Soups">Soups</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Stock Status *</label>
                  <select
                    name="stock"
                    value={menuItemFormData.stock}
                    onChange={handleMenuItemFormChange}
                    required
                  >
                    <option value="in-stock">In Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Preparation Time (minutes)</label>
                  <input
                    type="number"
                    name="preparationTime"
                    value={menuItemFormData.preparationTime}
                    onChange={handleMenuItemFormChange}
                    placeholder="15"
                    min="5"
                    max="120"
                  />
                </div>

                <div className="form-group">
                  <label>Branch/Location</label>
                  <input
                    type="text"
                    name="branch"
                    value={menuItemFormData.branch}
                    onChange={handleMenuItemFormChange}
                    placeholder="e.g. Gulshan, Dhanmondi, All Branches"
                  />
                </div>

                <div className="form-group">
                  <label>Spice Level (0-5)</label>
                  <input
                    type="number"
                    name="spiceLevel"
                    value={menuItemFormData.spiceLevel}
                    onChange={handleMenuItemFormChange}
                    min="0"
                    max="5"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Image Upload</label>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setMenuItemFormData({...menuItemFormData, imageFile: file});
                      }
                    }}
                  />
                  {menuItemFormData.imageFile && <small>Selected: {menuItemFormData.imageFile.name}</small>}
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isVegetarian"
                      checked={menuItemFormData.isVegetarian}
                      onChange={handleMenuItemFormChange}
                    />
                    <span>Vegetarian</span>
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isVegan"
                      checked={menuItemFormData.isVegan}
                      onChange={handleMenuItemFormChange}
                    />
                    <span>Vegan</span>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => {
                    setShowMenuForm(false);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  <i className="fas fa-save"></i> {editingItem ? 'Update' : 'Create'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
