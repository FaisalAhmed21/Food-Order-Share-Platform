const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { auth } = require('../middleware/auth');

// WebSocket support
let wss;
const setWebSocketServer = (websocketServer) => {
  wss = websocketServer;
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

// Old mock data for backwards compatibility (will be removed)
// Removed hardcoded restaurants array - using database only
let restaurants = [];

let menuItems = {
  // KFC Bangladesh - Real menu items
  rest1: [
    {
      _id: 'item1',
      name: 'Zinger Burger',
      description: '100% chicken fillet, coated in crispy breading with lettuce and mayo',
      price: 319,
      category: 'Burgers',
      available: true,
      badges: ['Popular', 'Bestseller'],
      image: 'https://cdn.pixabay.com/photo/2020/03/29/11/03/burger-4980992_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 1
    },
    {
      _id: 'item2',
      name: '9 Pcs Bucket',
      description: '9 pieces of finger lickin good fried chicken',
      price: 1099,
      category: 'Chicken',
      available: true,
      badges: ['Popular', 'Family Meal'],
      image: 'https://cdn.pixabay.com/photo/2020/06/30/15/03/table-5356642_1280.jpg',
      dietary: ['Halal'],
      sizes: [
        { name: '6 Pcs', price: 799 },
        { name: '9 Pcs', price: 1099 },
        { name: '12 Pcs', price: 1399 }
      ]
    },
    {
      _id: 'item3',
      name: 'Hot Wings 6 Pcs',
      description: 'Spicy and crispy chicken wings',
      price: 299,
      category: 'Chicken',
      available: true,
      badges: ['Spicy'],
      image: 'https://cdn.pixabay.com/photo/2017/01/26/18/49/wings-2010880_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2
    },
    {
      _id: 'item4',
      name: 'Fries - Large',
      description: 'Crispy golden french fries',
      price: 149,
      category: 'Sides',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2017/03/23/19/30/french-fries-2169980_1280.jpg',
      dietary: ['Halal', 'Vegetarian']
    },
    {
      _id: 'item5',
      name: 'Pepsi 500ml',
      description: 'Chilled Pepsi soft drink',
      price: 65,
      category: 'Beverages',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2016/12/26/17/28/soda-1932466_1280.jpg',
      dietary: ['Halal', 'Vegetarian']
    }
  ],
  // Pizza Hut - Real menu items
  rest2: [
    {
      _id: 'item6',
      name: 'Supreme Pizza - Large',
      description: 'Loaded with pepperoni, beef, mushrooms, green peppers, and olives',
      price: 1249,
      category: 'Pizza',
      available: true,
      badges: ['Popular', 'Bestseller'],
      image: 'https://cdn.pixabay.com/photo/2017/12/09/08/18/pizza-3007395_1280.jpg',
      dietary: ['Halal'],
      sizes: [
        { name: 'Medium', price: 899 },
        { name: 'Large', price: 1249 }
      ]
    },
    {
      _id: 'item7',
      name: 'Chicken Tikka Pizza',
      description: 'Tandoori chicken tikka with onions and peppers',
      price: 1149,
      category: 'Pizza',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2020/05/17/04/22/pizza-5179939_1280.jpg',
      dietary: ['Halal'],
      sizes: [
        { name: 'Medium', price: 799 },
        { name: 'Large', price: 1149 }
      ]
    },
    {
      _id: 'item8',
      name: 'Garlic Bread Sticks',
      description: 'Freshly baked breadsticks with garlic butter',
      price: 299,
      category: 'Sides',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2018/08/29/19/03/bread-3640917_1280.jpg',
      dietary: ['Halal', 'Vegetarian']
    },
    {
      _id: 'item9',
      name: 'Chocolate Lava Cake',
      description: 'Warm chocolate cake with molten chocolate center',
      price: 249,
      category: 'Desserts',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2022/03/02/12/42/cake-7042666_1280.jpg',
      dietary: ['Halal', 'Vegetarian'],
      allergens: ['dairy', 'eggs']
    }
  ],
  // Chaldal Kitchen - Real home-style meals
  rest3: [
    {
      _id: 'item10',
      name: 'Beef Bhuna with Rice',
      description: 'Slow-cooked spicy beef curry with steamed rice',
      price: 189,
      category: 'Combo Meals',
      available: true,
      badges: ['Popular', 'Home Style'],
      image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2
    },
    {
      _id: 'item11',
      name: 'Chicken Curry with Rice',
      description: 'Classic Bengali chicken curry served with rice',
      price: 159,
      category: 'Combo Meals',
      available: true,
      badges: ['Budget Friendly'],
      image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 1
    },
    {
      _id: 'item12',
      name: 'Dal & Vegetables with Rice',
      description: 'Healthy lentils and mixed vegetables with rice',
      price: 129,
      category: 'Vegetarian',
      available: true,
      badges: ['Healthy', 'Vegetarian'],
      image: 'https://cdn.pixabay.com/photo/2018/03/23/08/27/food-3253352_1280.jpg',
      dietary: ['Halal', 'Vegetarian']
    },
    {
      _id: 'item13',
      name: 'Fish Fry with Rice',
      description: 'Crispy fried fish served with steamed rice',
      price: 179,
      category: 'Combo Meals',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2019/09/26/18/23/salmon-4506040_1280.jpg',
      dietary: ['Halal']
    }
  ],
  // Burger King - Real menu items
  rest4: [
    {
      _id: 'item14',
      name: 'Whopper',
      description: 'Flame-grilled beef patty with fresh vegetables and signature sauce',
      price: 459,
      category: 'Burgers',
      available: true,
      badges: ['Popular', 'Bestseller'],
      image: 'https://cdn.pixabay.com/photo/2016/03/05/19/02/hamburger-1238246_1280.jpg',
      dietary: ['Halal'],
      sizes: [
        { name: 'Regular', price: 459 },
        { name: 'Double', price: 659 }
      ]
    },
    {
      _id: 'item15',
      name: 'Chicken Royale',
      description: 'Crispy chicken fillet with mayo and lettuce',
      price: 399,
      category: 'Burgers',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2020/03/29/11/03/burger-4980992_1280.jpg',
      dietary: ['Halal']
    },
    {
      _id: 'item16',
      name: 'Onion Rings',
      description: 'Crispy battered onion rings',
      price: 149,
      category: 'Sides',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2017/01/26/02/06/onion-rings-2008233_1280.jpg',
      dietary: ['Halal', 'Vegetarian']
    },
    {
      _id: 'item17',
      name: 'Chocolate Shake',
      description: 'Thick and creamy chocolate milkshake',
      price: 199,
      category: 'Beverages',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2017/02/08/12/46/milk-2048802_1280.jpg',
      dietary: ['Halal', 'Vegetarian'],
      allergens: ['dairy']
    }
  ],
  // Kacchi Bhai - Real menu items
  rest5: [
    {
      _id: 'item18',
      name: 'Mutton Kacchi Biryani',
      description: 'Signature dum-cooked kacchi biryani with premium mutton',
      price: 450,
      category: 'Biryani',
      available: true,
      badges: ['Popular', 'Bestseller'],
      image: 'https://cdn.pixabay.com/photo/2022/06/10/05/32/biryani-7253751_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2,
      sizes: [
        { name: 'Regular', price: 450 },
        { name: 'Large', price: 650 }
      ]
    },
    {
      _id: 'item19',
      name: 'Beef Tehari',
      description: 'Classic Dhaka-style beef tehari with aromatic spices',
      price: 350,
      category: 'Biryani',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2022/06/10/05/32/biryani-7253751_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2
    },
    {
      _id: 'item20',
      name: 'Chicken Roast (2 pcs)',
      description: 'Tender chicken pieces marinated in special spices',
      price: 280,
      category: 'Sides',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2020/08/04/12/39/tandoori-chicken-5463049_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2
    },
    {
      _id: 'item21',
      name: 'Borhani',
      description: 'Traditional spiced yogurt drink perfect with biryani',
      price: 80,
      category: 'Beverages',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2018/06/14/21/18/beverage-3475821_1280.jpg',
      dietary: ['Halal', 'Vegetarian'],
      allergens: ['dairy']
    }
  ],
  // Takeout - Real menu items (Thai & Asian Fusion)
  rest6: [
    {
      _id: 'item22',
      name: 'Pad Thai',
      description: 'Classic Thai stir-fried rice noodles with shrimp and peanuts',
      price: 550,
      category: 'Thai',
      available: true,
      badges: ['Popular', 'Bestseller'],
      image: 'https://cdn.pixabay.com/photo/2018/03/23/08/27/food-3253352_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 1
    },
    {
      _id: 'item23',
      name: 'Green Curry Chicken',
      description: 'Creamy Thai green curry with chicken and vegetables',
      price: 650,
      category: 'Thai',
      available: true,
      badges: ['Spicy'],
      image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 3
    },
    {
      _id: 'item24',
      name: 'Tom Yum Soup',
      description: 'Hot and sour Thai soup with prawns and herbs',
      price: 450,
      category: 'Soups',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2021/01/16/09/05/soup-5921404_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2
    },
    {
      _id: 'item25',
      name: 'Sushi Platter',
      description: 'Assorted sushi rolls with wasabi and soy sauce',
      price: 850,
      category: 'Japanese',
      available: true,
      badges: ['Premium'],
      image: 'https://cdn.pixabay.com/photo/2017/10/15/11/41/sushi-2853382_1280.jpg',
      dietary: ['Halal']
    }
  ],
  // Domino's Pizza - Real menu items
  rest7: [
    {
      _id: 'item26',
      name: 'Chicken Dominator',
      description: 'Double chicken with extra cheese and special sauce',
      price: 999,
      category: 'Pizza',
      available: true,
      badges: ['Popular', 'Bestseller'],
      image: 'https://cdn.pixabay.com/photo/2020/05/17/04/22/pizza-5179939_1280.jpg',
      dietary: ['Halal'],
      sizes: [
        { name: 'Medium', price: 799 },
        { name: 'Large', price: 999 }
      ]
    },
    {
      _id: 'item27',
      name: 'Pepperoni Pizza',
      description: 'Classic pepperoni with mozzarella cheese',
      price: 1099,
      category: 'Pizza',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2017/12/09/08/18/pizza-3007395_1280.jpg',
      dietary: ['Halal'],
      sizes: [
        { name: 'Medium', price: 849 },
        { name: 'Large', price: 1099 }
      ]
    },
    {
      _id: 'item28',
      name: 'Cheesy Bread',
      description: 'Freshly baked bread with melted cheese',
      price: 249,
      category: 'Sides',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2018/08/29/19/03/bread-3640917_1280.jpg',
      dietary: ['Halal', 'Vegetarian']
    },
    {
      _id: 'item29',
      name: 'Choco Lava Cake',
      description: 'Warm chocolate cake with gooey center',
      price: 199,
      category: 'Desserts',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2022/03/02/12/42/cake-7042666_1280.jpg',
      dietary: ['Halal', 'Vegetarian']
    }
  ],
  // Star Kabab & Restaurant - Real menu items
  rest8: [
    {
      _id: 'item30',
      name: 'Beef Seekh Kabab',
      description: 'Minced beef kabab grilled on skewers (4 pcs)',
      price: 320,
      category: 'BBQ',
      available: true,
      badges: ['Popular', 'Bestseller'],
      image: 'https://cdn.pixabay.com/photo/2019/02/14/07/06/food-3996014_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2
    },
    {
      _id: 'item31',
      name: 'Chicken Tikka',
      description: 'Tandoori chicken chunks marinated in spices (6 pcs)',
      price: 280,
      category: 'BBQ',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2020/08/04/12/39/tandoori-chicken-5463049_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2
    },
    {
      _id: 'item32',
      name: 'Mutton Chops',
      description: 'Grilled mutton ribs with special masala (4 pcs)',
      price: 550,
      category: 'BBQ',
      available: true,
      badges: ['Chef Special'],
      image: 'https://cdn.pixabay.com/photo/2019/02/14/07/06/food-3996014_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2
    },
    {
      _id: 'item33',
      name: 'Mix Grill Platter',
      description: 'Assorted kababs with naan and mint chutney',
      price: 850,
      category: 'BBQ',
      available: true,
      badges: ['Popular', 'Family Size'],
      image: 'https://cdn.pixabay.com/photo/2019/02/14/07/06/food-3996014_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 2
    }
  ],
  // Helvetia - Real menu items (Swiss & Continental)
  rest9: [
    {
      _id: 'item34',
      name: 'Beef Stroganoff',
      description: 'Tender beef strips in creamy mushroom sauce with pasta',
      price: 850,
      category: 'Continental',
      available: true,
      badges: ['Chef Special'],
      image: 'https://cdn.pixabay.com/photo/2016/11/18/14/05/cacciatore-1834371_1280.jpg',
      dietary: ['Halal']
    },
    {
      _id: 'item35',
      name: 'Grilled Chicken Steak',
      description: 'Juicy grilled chicken with mashed potatoes and vegetables',
      price: 750,
      category: 'Continental',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2020/08/04/12/39/tandoori-chicken-5463049_1280.jpg',
      dietary: ['Halal']
    },
    {
      _id: 'item36',
      name: 'Swiss Chocolate Fondue',
      description: 'Rich chocolate fondue with fresh fruits',
      price: 550,
      category: 'Desserts',
      available: true,
      badges: ['Premium'],
      image: 'https://cdn.pixabay.com/photo/2022/03/02/12/42/cake-7042666_1280.jpg',
      dietary: ['Halal', 'Vegetarian'],
      allergens: ['dairy']
    },
    {
      _id: 'item37',
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with parmesan and croutons',
      price: 450,
      category: 'Salads',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2017/09/16/19/21/salad-2756467_1280.jpg',
      dietary: ['Halal']
    }
  ],
  // Chillox - Real menu items (Chinese & Thai)
  rest10: [
    {
      _id: 'item38',
      name: 'Chicken Fried Rice',
      description: 'Wok-tossed fried rice with chicken and vegetables',
      price: 350,
      category: 'Chinese',
      available: true,
      badges: ['Popular', 'Bestseller'],
      image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
      dietary: ['Halal']
    },
    {
      _id: 'item39',
      name: 'Sweet and Sour Chicken',
      description: 'Crispy chicken in sweet and sour sauce',
      price: 450,
      category: 'Chinese',
      available: true,
      badges: ['Popular'],
      image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
      dietary: ['Halal']
    },
    {
      _id: 'item40',
      name: 'Thai Green Curry',
      description: 'Spicy green curry with chicken and vegetables',
      price: 550,
      category: 'Thai',
      available: true,
      badges: ['Spicy'],
      image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
      dietary: ['Halal'],
      spiceLevel: 3
    },
    {
      _id: 'item41',
      name: 'Spring Rolls (6 pcs)',
      description: 'Crispy vegetable spring rolls with sweet chili sauce',
      price: 280,
      category: 'Starters',
      available: true,
      image: 'https://cdn.pixabay.com/photo/2018/07/18/19/12/spring-rolls-3547090_1280.jpg',
      dietary: ['Halal', 'Vegetarian']
    }
  ]
};

// Get restaurants with filters
router.post('/', (req, res) => {
  try {
    const { filters, sortBy, search } = req.body;
    let filteredRestaurants = [...restaurants];

    // Apply search
    if (search) {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply filters
    if (filters) {
      if (filters.distance) {
        filteredRestaurants = filteredRestaurants.filter(r => r.distance <= filters.distance);
      }
      if (filters.rating) {
        filteredRestaurants = filteredRestaurants.filter(r => r.rating >= filters.rating);
      }
      if (filters.dietary && filters.dietary.length > 0) {
        filteredRestaurants = filteredRestaurants.filter(r =>
          filters.dietary.some(diet => r.dietary.includes(diet))
        );
      }
      if (filters.deliveryTime) {
        filteredRestaurants = filteredRestaurants.filter(r => r.deliveryTime <= filters.deliveryTime);
      }
    }

    // Apply sorting
    if (sortBy === 'deliveryTime') {
      filteredRestaurants.sort((a, b) => a.deliveryTime - b.deliveryTime);
    } else if (sortBy === 'rating') {
      filteredRestaurants.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price') {
      filteredRestaurants.sort((a, b) => a.deliveryFee - b.deliveryFee);
    }

    res.json({ success: true, restaurants: filteredRestaurants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get suggestions for search
router.get('/suggestions', (req, res) => {
  try {
    const { q } = req.query;
    const suggestions = [];

    if (q) {
      restaurants.forEach(r => {
        if (r.name.toLowerCase().includes(q.toLowerCase())) {
          suggestions.push({ name: r.name, type: 'restaurant' });
        }
      });

      Object.values(menuItems).flat().forEach(item => {
        if (item.name.toLowerCase().includes(q.toLowerCase())) {
          suggestions.push({ name: item.name, type: 'dish' });
        }
      });
    }

    res.json({ success: true, suggestions: suggestions.slice(0, 5) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get nearby restaurants with distance filtering (MUST BE BEFORE /:id route)
router.get('/nearby', auth, async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxDist = parseFloat(maxDistance);

    console.log('Nearby query params:', { userLat, userLng, maxDist });
    console.log('Database:', Restaurant.db.name);

    // Use MongoDB geospatial query
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat]
          },
          $maxDistance: maxDist * 1000 // Convert km to meters
        }
      }
    };

    console.log('Query:', JSON.stringify(query));
    const restaurants = await Restaurant.find(query).populate('owner', 'verificationMark name email');
    console.log('Found restaurants:', restaurants.length);

    // Calculate distance and add to response
    const result = restaurants.map(restaurant => {
      const [restLng, restLat] = restaurant.location.coordinates;
      const distance = calculateDistance(userLat, userLng, restLat, restLng);
      
      return {
        _id: restaurant._id,
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        rating: restaurant.rating,
        totalReviews: restaurant.totalReviews,
        deliveryTime: restaurant.deliveryTime,
        deliveryFee: restaurant.deliveryFee,
        priceRange: restaurant.priceRange,
        status: restaurant.status,
        badges: restaurant.badges,
        image: restaurant.image,
        logo: restaurant.logo,
        address: restaurant.address,
        location: {
          type: 'Point',
          coordinates: [restLng, restLat]
        },
        dietary: restaurant.dietary,
        distance: parseFloat(distance.toFixed(2)),
        phone: restaurant.phone,
        email: restaurant.email,
        owner: restaurant.owner,
        openingHours: restaurant.openingHours,
        website: restaurant.website
      };
    });

    res.json({
      success: true,
      count: result.length,
      restaurants: result
    });
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch nearby restaurants',
      error: error.message 
    });
  }
});

// ==================== DATABASE-POWERED ROUTES ====================

// Get all restaurants from database with filters (MUST come before /:id route)
router.get('/all', async (req, res) => {
  try {
    const { 
      cuisine, 
      minRating, 
      maxDeliveryTime, 
      priceRange, 
      search,
      sortBy = 'rating',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = { isActive: true };
    
    if (cuisine) {
      query.cuisine = { $in: [cuisine] };
    }
    
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }
    
    if (maxDeliveryTime) {
      query.deliveryTime = { $lte: parseInt(maxDeliveryTime) };
    }
    
    if (priceRange) {
      query.priceRange = priceRange;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { cuisine: { $in: [new RegExp(search, 'i')] } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort
    let sort = {};
    switch(sortBy) {
      case 'rating':
        sort = { rating: -1 };
        break;
      case 'deliveryTime':
        sort = { deliveryTime: 1 };
        break;
      case 'deliveryFee':
        sort = { deliveryFee: 1 };
        break;
      case 'popular':
        sort = { totalOrders: -1 };
        break;
      default:
        sort = { rating: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const restaurants = await Restaurant.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');
    
    const total = await Restaurant.countDocuments(query);
    
    console.log('GET /api/all - Returning', restaurants.length, 'restaurants');
    console.log('Restaurant names:', restaurants.map(r => r.name));

    res.json({
      success: true,
      restaurants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single restaurant from database
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('-__v');
    
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    
    res.json({ success: true, restaurant });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get restaurant menu from database
router.get('/:id/menu', async (req, res) => {
  try {
    const { category, available, sortBy = 'sortOrder' } = req.query;
    
    const query = { restaurant: req.params.id };
    
    if (category) {
      query.category = category;
    }
    
    if (available !== undefined) {
      query.available = available === 'true';
    }

    let sort = {};
    if (sortBy === 'price') {
      sort = { price: 1 };
    } else if (sortBy === 'popular') {
      sort = { totalOrders: -1 };
    } else {
      sort = { sortOrder: 1, createdAt: -1 };
    }

    const menuItems = await MenuItem.find(query)
      .sort(sort)
      .select('-__v');
    
    res.json({ success: true, menuItems: menuItems });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search restaurants and menu items
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json({ success: true, suggestions: [] });
    }

    const restaurantSuggestions = await Restaurant.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { cuisine: { $in: [new RegExp(q, 'i')] } }
      ],
      isActive: true
    })
    .limit(3)
    .select('name cuisine');

    const menuSuggestions = await MenuItem.find({
      name: { $regex: q, $options: 'i' },
      available: true
    })
    .limit(3)
    .populate('restaurant', 'name')
    .select('name restaurant');

    const suggestions = [
      ...restaurantSuggestions.map(r => ({
        type: 'restaurant',
        name: r.name,
        id: r._id,
        cuisine: r.cuisine
      })),
      ...menuSuggestions.map(m => ({
        type: 'dish',
        name: m.name,
        id: m._id,
        restaurant: m.restaurant.name
      }))
    ];

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get restaurant statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const totalItems = await MenuItem.countDocuments({ restaurant: req.params.id });
    const availableItems = await MenuItem.countDocuments({ restaurant: req.params.id, available: true });
    
    res.json({
      success: true,
      stats: {
        totalOrders: restaurant.totalOrders,
        rating: restaurant.rating,
        totalReviews: restaurant.totalReviews,
        totalItems,
        availableItems
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all menu items grouped by category (for Foodpanda-style home page)
router.get('/menu-items/by-category', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get all available menu items with restaurant info
    const menuItems = await MenuItem.find({ available: true })
      .populate('restaurant', 'name image address cuisine rating verificationMark')
      .sort({ totalOrders: -1, rating: -1 })
      .limit(500)
      .select('-__v');
    
    // Group items by category
    const itemsByCategory = {};
    const categoryOrder = ['Burgers', 'Pizza', 'Biryani', 'Chinese', 'BBQ', 'Chicken', 'Desserts', 'Beverages', 'Mains', 'Starters'];
    
    menuItems.forEach(item => {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      itemsByCategory[item.category].push({
        _id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
        discountPrice: item.discountPrice,
        image: item.image,
        rating: item.rating,
        totalOrders: item.totalOrders,
        badges: item.badges,
        restaurant: {
          _id: item.restaurant._id,
          name: item.restaurant.name,
          image: item.restaurant.image,
          cuisine: item.restaurant.cuisine,
          rating: item.restaurant.rating,
          verificationMark: item.restaurant.verificationMark
        }
      });
    });
    
    // Sort categories by predefined order, then alphabetically
    const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
    
    // Build response with limited items per category
    const response = sortedCategories.map(category => ({
      category,
      items: itemsByCategory[category].slice(0, parseInt(limit))
    })).filter(cat => cat.items.length > 0);
    
    res.json({
      success: true,
      categories: response,
      totalCategories: response.length,
      totalItems: menuItems.length
    });
  } catch (error) {
    console.error('Error fetching menu items by category:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
module.exports.restaurants = restaurants;
module.exports.menuItems = menuItems;
module.exports.setWebSocketServer = setWebSocketServer;
