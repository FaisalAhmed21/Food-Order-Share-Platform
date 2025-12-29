// Consolidated owner routes below (quick-donate integrated into main router)
const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const FoodDonation = require('../models/FoodDonation');
const { auth, isOwner } = require('../middleware/auth');
const upload = require('../config/multer');
const { uploadWithPDF } = require('../config/multer');
const mongoose = require('mongoose');

// Apply auth and isOwner middleware to all routes
router.use(auth);
router.use(isOwner);

// Quick-donate: list menu items nearing expiry (for restaurants)
router.get('/quick-donate/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    // Basic check: ensure restaurant exists and is owned by requester
    const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: req.user._id });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found or unauthorized' });

    // Return recently created/updated available menu items as quick-donate candidates
    const items = await MenuItem.find({ restaurant: restaurantId, available: true }).limit(20).sort({ updatedAt: -1, createdAt: -1 });

    // Simple analytics: donations by this restaurant in last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const donations = await FoodDonation.find({ donor: restaurant.owner || restaurantId, donorType: 'Restaurant', createdAt: { $gte: since } });

    res.json({ success: true, items, analytics: { donationsLast30Days: donations.length } });
  } catch (err) {
    console.error('Quick-donate error', err);
    res.status(500).json({ success: false, message: 'Failed to load quick-donate data' });
  }
});

// ==================== RESTAURANT MANAGEMENT ====================

// Get restaurant owner's restaurants
router.get('/my-restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.user._id })
      .select('-__v')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, restaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new restaurant
// Create restaurant
router.post('/restaurants', uploadWithPDF.fields([
  { name: 'image', maxCount: 1 },
  { name: 'licensePDF', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('CREATE RESTAURANT - Received body:', JSON.stringify(req.body, null, 2));
    console.log('Files received:', req.files);
    
    const restaurantData = {
      ...req.body,
      owner: req.user._id
    };

    // If image was uploaded
    if (req.files && req.files.image && req.files.image[0]) {
      const file = req.files.image[0];
      // For local storage, ensure path starts with /uploads/
      let imagePath = file.path.replace(/\\/g, '/');
      // Extract only the /uploads/... part
      if (imagePath.includes('/uploads/')) {
        imagePath = imagePath.substring(imagePath.indexOf('/uploads/'));
      } else if (imagePath.includes('uploads/')) {
        imagePath = '/' + imagePath.substring(imagePath.indexOf('uploads/'));
      }
      console.log('Processed restaurant image path:', imagePath);
      restaurantData.image = imagePath;
      restaurantData.heroImage = imagePath;
    }

    // If license PDF was uploaded
    if (req.files && req.files.licensePDF && req.files.licensePDF[0]) {
      const pdfFile = req.files.licensePDF[0];
      let pdfPath = pdfFile.path.replace(/\\/g, '/');
      if (pdfPath.includes('/uploads/')) {
        pdfPath = pdfPath.substring(pdfPath.indexOf('/uploads/'));
      } else if (pdfPath.includes('uploads/')) {
        pdfPath = '/' + pdfPath.substring(pdfPath.indexOf('uploads/'));
      }
      console.log('Processed license PDF path:', pdfPath);
      
      // Parse existing verification documents or create new
      let verificationDocs = {};
      if (req.body.verificationDocuments) {
        try {
          verificationDocs = typeof req.body.verificationDocuments === 'string' 
            ? JSON.parse(req.body.verificationDocuments) 
            : req.body.verificationDocuments;
        } catch (e) {
          console.error('Error parsing verificationDocuments:', e);
        }
      }
      
      verificationDocs.documentPDF = pdfPath;
      verificationDocs.uploadedAt = new Date();
      restaurantData.verificationDocuments = [verificationDocs];
    } else if (req.body.verificationDocuments) {
      // Parse verification documents even if no PDF uploaded
      try {
        const docs = typeof req.body.verificationDocuments === 'string' 
          ? JSON.parse(req.body.verificationDocuments) 
          : req.body.verificationDocuments;
        restaurantData.verificationDocuments = [docs];
      } catch (e) {
        console.error('Error parsing verificationDocuments:', e);
      }
    }

    // Parse arrays and objects if they come as strings
    if (typeof req.body.cuisine === 'string') {
      try {
        restaurantData.cuisine = JSON.parse(req.body.cuisine);
      } catch (e) {
        console.error('Error parsing cuisine:', e);
      }
    }
    if (typeof req.body.badges === 'string') {
      try {
        restaurantData.badges = JSON.parse(req.body.badges);
      } catch (e) {
        console.error('Error parsing badges:', e);
      }
    }
    if (typeof req.body.dietary === 'string') {
      try {
        restaurantData.dietary = JSON.parse(req.body.dietary);
      } catch (e) {
        console.error('Error parsing dietary:', e);
      }
    }
    if (typeof req.body.tags === 'string') {
      try {
        restaurantData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }
    if (typeof req.body.contact === 'string') {
      try {
        restaurantData.contact = JSON.parse(req.body.contact);
      } catch (e) {
        console.error('Error parsing contact:', e);
      }
    }
    if (typeof req.body.address === 'string') {
      try {
        restaurantData.address = JSON.parse(req.body.address);
      } catch (e) {
        console.error('Error parsing address:', e);
      }
    }
    if (typeof req.body.branches === 'string') {
      try {
        restaurantData.branches = JSON.parse(req.body.branches);
      } catch (e) {
        console.error('Error parsing branches:', e);
      }
    }

    console.log('Final restaurant data before save:', JSON.stringify(restaurantData, null, 2));
    
    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      restaurant
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update restaurant
router.put('/restaurants/:id', uploadWithPDF.fields([
  { name: 'image', maxCount: 1 },
  { name: 'licensePDF', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Updating restaurant:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Files uploaded:', req.files);
    
    const restaurant = await Restaurant.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'existingImage') {
        console.log(`Processing key: ${key}, type: ${typeof req.body[key]}, value:`, req.body[key]);
        try {
          // Parse arrays and objects if they come as strings
          if (['cuisine', 'badges', 'dietary', 'tags', 'contact', 'address', 'branches', 'socialMedia', 'verificationDocuments'].includes(key) && typeof req.body[key] === 'string') {
            console.log(`Attempting to parse ${key}...`);
            const parsed = JSON.parse(req.body[key]);
            console.log(`Successfully parsed ${key}:`, parsed);
            restaurant[key] = parsed;
            console.log(`Assigned parsed ${key} to restaurant`);
          } else {
            restaurant[key] = req.body[key];
            console.log(`Directly assigned ${key} to restaurant`);
          }
        } catch (e) {
          console.error(`Error parsing ${key}:`, e.message);
          console.error(`Failed value:`, req.body[key]);
          // Don't assign the value if parsing failed for objects/arrays
          if (!['cuisine', 'badges', 'dietary', 'tags', 'contact', 'address', 'branches', 'socialMedia', 'verificationDocuments'].includes(key)) {
            restaurant[key] = req.body[key];
          } else {
            console.log(`Skipping assignment of ${key} due to parse error`);
          }
        }
      }
    });
    
    console.log('Restaurant object before save - address:', restaurant.address);
    console.log('Restaurant object before save - address type:', typeof restaurant.address);

    // Handle image upload
    if (req.files && req.files.image && req.files.image[0]) {
      const file = req.files.image[0];
      console.log('New image uploaded for restaurant:', file.filename);
      console.log('Original file path:', file.path);
      
      // Extract just the /uploads/... portion
      let imagePath = file.path.replace(/\\/g, '/');
      console.log('After slash replacement:', imagePath);
      
      if (imagePath.includes('/uploads/')) {
        imagePath = imagePath.substring(imagePath.indexOf('/uploads/'));
      } else if (imagePath.includes('uploads/')) {
        imagePath = '/' + imagePath.substring(imagePath.indexOf('uploads/'));
      }
      
      console.log('Final restaurant image path to save:', imagePath);
      restaurant.image = imagePath;
      restaurant.heroImage = imagePath;
    } else if (req.body.existingImage) {
      // Keep existing image if provided
      console.log('Keeping existing image:', req.body.existingImage);
    }

    // Handle license PDF upload
    if (req.files && req.files.licensePDF && req.files.licensePDF[0]) {
      const pdfFile = req.files.licensePDF[0];
      let pdfPath = pdfFile.path.replace(/\\/g, '/');
      if (pdfPath.includes('/uploads/')) {
        pdfPath = pdfPath.substring(pdfPath.indexOf('/uploads/'));
      } else if (pdfPath.includes('uploads/')) {
        pdfPath = '/' + pdfPath.substring(pdfPath.indexOf('uploads/'));
      }
      console.log('License PDF updated:', pdfPath);
      
      // Update or create verification documents
      if (!restaurant.verificationDocuments || restaurant.verificationDocuments.length === 0) {
        restaurant.verificationDocuments = [{ documentPDF: pdfPath, uploadedAt: new Date() }];
      } else {
        restaurant.verificationDocuments[0].documentPDF = pdfPath;
        restaurant.verificationDocuments[0].uploadedAt = new Date();
      }
    }

    await restaurant.save();
    console.log('Restaurant updated successfully with image:', restaurant.image);

    res.json({
      success: true,
      message: 'Restaurant updated successfully',
      restaurant
    });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })));
    }
    res.status(500).json({ 
      success: false, 
      message: error.message,
      errors: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : []
    });
  }
});

// Delete restaurant
router.delete('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Also delete all menu items for this restaurant
    await MenuItem.deleteMany({ restaurant: req.params.id });

    res.json({
      success: true,
      message: 'Restaurant and all its menu items deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== MENU ITEM MANAGEMENT ====================

// Get menu items for owner's restaurant
router.get('/restaurants/:restaurantId/menu', async (req, res) => {
  try {
    // Verify restaurant ownership
    const restaurant = await Restaurant.findOne({
      _id: req.params.restaurantId,
      owner: req.user._id
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const menuItems = await MenuItem.find({ restaurant: req.params.restaurantId })
      .sort({ category: 1, sortOrder: 1 })
      .select('-__v');
    
    res.json({ success: true, menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create menu item
router.post('/restaurants/:restaurantId/menu', upload.single('image'), async (req, res) => {
  try {
    console.log('CREATE MENU ITEM - Received body:', JSON.stringify(req.body, null, 2));
    console.log('File received:', req.file ? req.file.filename : 'No file');
    console.log('Badges received:', req.body.badges);
    console.log('Dietary received:', req.body.dietary);
    
    // Verify restaurant ownership
    const restaurant = await Restaurant.findOne({
      _id: req.params.restaurantId,
      owner: req.user._id
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const menuItemData = {
      ...req.body,
      restaurant: req.params.restaurantId
    };

    // If image was uploaded
    if (req.file) {
      // For local storage, ensure path starts with /uploads/
      let imagePath = req.file.path.replace(/\\/g, '/');
      // Extract only the /uploads/... part
      if (imagePath.includes('/uploads/')) {
        imagePath = imagePath.substring(imagePath.indexOf('/uploads/'));
      } else if (imagePath.includes('uploads/')) {
        imagePath = '/' + imagePath.substring(imagePath.indexOf('uploads/'));
      }
      console.log('Processed image path:', imagePath);
      menuItemData.image = imagePath;
    }

    // Parse arrays if they come as strings
    if (typeof req.body.sizes === 'string') {
      menuItemData.sizes = JSON.parse(req.body.sizes);
    }
    if (typeof req.body.addons === 'string') {
      menuItemData.addons = JSON.parse(req.body.addons);
    }
    if (typeof req.body.allergens === 'string') {
      menuItemData.allergens = JSON.parse(req.body.allergens);
    }
    if (typeof req.body.dietary === 'string') {
      menuItemData.dietary = JSON.parse(req.body.dietary);
    }
    if (typeof req.body.badges === 'string') {
      menuItemData.badges = JSON.parse(req.body.badges);
    }

    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();
    console.log('New menu item created with image path:', menuItem.image);

    // Broadcast update via WebSocket if available
    const wss = req.app.get('wss');
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'MENU_ADD',
            restaurantId: req.params.restaurantId,
            item: menuItem
          }));
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      menuItem
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update menu item
router.put('/menu-items/:id', upload.single('image'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id).populate('restaurant');

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    console.log('UPDATE MENU ITEM - Received body:', JSON.stringify(req.body, null, 2));
    console.log('Badges received:', req.body.badges);
    console.log('Dietary received:', req.body.dietary);

    // Verify restaurant ownership
    if (menuItem.restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'existingImage') {
        try {
          // Parse arrays if they come as strings
          if (['sizes', 'addons', 'allergens', 'dietary', 'badges'].includes(key) && typeof req.body[key] === 'string') {
            menuItem[key] = JSON.parse(req.body[key]);
          } else {
            menuItem[key] = req.body[key];
          }
        } catch (e) {
          menuItem[key] = req.body[key];
        }
      }
    });

    // Handle image update
    if (req.file) {
      // New image uploaded
      console.log('New image uploaded:', req.file.filename);
      console.log('Original file path:', req.file.path);
      let imagePath = req.file.path.replace(/\\/g, '/');
      console.log('After slash replacement:', imagePath);
      // Extract only the /uploads/... portion
      if (imagePath.includes('/uploads/')) {
        imagePath = imagePath.substring(imagePath.indexOf('/uploads/'));
      } else if (imagePath.includes('uploads/')) {
        imagePath = '/' + imagePath.substring(imagePath.indexOf('uploads/'));
      }
      console.log('Final image path to save:', imagePath);
      menuItem.image = imagePath;
    } else if (req.body.existingImage) {
      // Keep existing image - normalize path
      let existingPath = req.body.existingImage.replace(/\\/g, '/');
      // Extract only the /uploads/... portion
      if (existingPath.includes('/uploads/')) {
        existingPath = existingPath.substring(existingPath.indexOf('/uploads/'));
      } else if (existingPath.includes('uploads/')) {
        existingPath = '/' + existingPath.substring(existingPath.indexOf('uploads/'));
      }
      console.log('Normalized existing image:', existingPath);
      menuItem.image = existingPath;
    }

    await menuItem.save();
    console.log('Menu item saved with image path:', menuItem.image);

    // Broadcast update via WebSocket
    const wss = req.app.get('wss');
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'MENU_UPDATE',
            restaurantId: menuItem.restaurant._id,
            item: menuItem
          }));
        }
      });
    }

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      menuItem
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete menu item
router.delete('/menu-items/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id).populate('restaurant');

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    // Verify restaurant ownership
    if (menuItem.restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const restaurantId = menuItem.restaurant._id;
    await menuItem.deleteOne();

    // Broadcast update via WebSocket
    const wss = req.app.get('wss');
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'MENU_DELETE',
            restaurantId: restaurantId,
            itemId: req.params.id
          }));
        }
      });
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk update menu item availability
router.patch('/restaurants/:restaurantId/menu/availability', async (req, res) => {
  try {
    const { itemIds, available } = req.body;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findOne({
      _id: req.params.restaurantId,
      owner: req.user._id
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    await MenuItem.updateMany(
      { _id: { $in: itemIds }, restaurant: req.params.restaurantId },
      { $set: { available } }
    );

    // Broadcast update via WebSocket
    const wss = req.app.get('wss');
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'ITEM_AVAILABILITY',
            restaurantId: req.params.restaurantId,
            itemIds: itemIds,
            available: available
          }));
        }
      });
    }

    res.json({
      success: true,
      message: `${itemIds.length} items updated successfully`
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get dashboard statistics
router.get('/restaurants/:restaurantId/statistics', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({
      _id: req.params.restaurantId,
      owner: req.user._id
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const totalItems = await MenuItem.countDocuments({ restaurant: req.params.restaurantId });
    const availableItems = await MenuItem.countDocuments({ 
      restaurant: req.params.restaurantId,
      available: true 
    });

    const categories = await MenuItem.aggregate([
      { $match: { restaurant: mongoose.Types.ObjectId(req.params.restaurantId) } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      statistics: {
        restaurant: {
          name: restaurant.name,
          rating: restaurant.rating,
          totalReviews: restaurant.totalReviews,
          totalOrders: restaurant.totalOrders,
          status: restaurant.status
        },
        menu: {
          totalItems,
          availableItems,
          unavailableItems: totalItems - availableItems,
          categories
        }
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
