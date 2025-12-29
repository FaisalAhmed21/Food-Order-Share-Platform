const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 50+ Real Bangladesh Restaurants Data
const restaurants = [
  {
    name: 'KFC Bangladesh',
    cuisine: ['Fast Food', 'American', 'Chicken'],
    description: "World's most popular chicken restaurant chain serving finger lickin' good fried chicken",
    rating: 4.7,
    totalReviews: 15420,
    deliveryTime: 30,
    deliveryFee: 49,
    minimumOrder: 299,
    priceRange: '৳৳',
    badges: ['Popular', 'Top Rated', 'Fast Delivery'],
    image: 'https://cdn.pixabay.com/photo/2020/06/30/15/03/table-5356642_1280.jpg',
    address: { area: 'Gulshan, Banani, Dhanmondi', city: 'Dhaka', fullAddress: 'Multiple Outlets in Dhaka' },
    contact: { phone: '09610500500', website: 'https://kfc.com.bd' },
    openingHours: {
      monday: { open: '10:00', close: '23:00' },
      tuesday: { open: '10:00', close: '23:00' },
      wednesday: { open: '10:00', close: '23:00' },
      thursday: { open: '10:00', close: '23:00' },
      friday: { open: '10:00', close: '23:00' },
      saturday: { open: '10:00', close: '23:00' },
      sunday: { open: '10:00', close: '23:00' }
    },
    tags: ['Fried Chicken', 'Burgers', 'Fast Food', 'American']
  },
  {
    name: 'Pizza Hut',
    cuisine: ['Pizza', 'Italian', 'Fast Food'],
    description: 'Famous pizza chain serving delicious pizzas with a variety of toppings',
    rating: 4.5,
    totalReviews: 12350,
    deliveryTime: 35,
    deliveryFee: 59,
    minimumOrder: 499,
    priceRange: '৳৳৳',
    badges: ['Popular', 'Italian'],
    image: 'https://cdn.pixabay.com/photo/2017/12/09/08/18/pizza-3007395_1280.jpg',
    address: { area: 'Gulshan, Dhanmondi, Banani', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '09610001100', website: 'https://pizzahut.com.bd' },
    openingHours: {
      monday: { open: '11:00', close: '23:00' },
      tuesday: { open: '11:00', close: '23:00' },
      wednesday: { open: '11:00', close: '23:00' },
      thursday: { open: '11:00', close: '23:00' },
      friday: { open: '11:00', close: '23:00' },
      saturday: { open: '11:00', close: '23:00' },
      sunday: { open: '11:00', close: '23:00' }
    },
    tags: ['Pizza', 'Italian', 'Pasta']
  },
  {
    name: 'Burger King',
    cuisine: ['Fast Food', 'Burgers', 'American'],
    description: 'Home of the Whopper - flame-grilled burgers and fast food',
    rating: 4.4,
    totalReviews: 9870,
    deliveryTime: 25,
    deliveryFee: 49,
    minimumOrder: 299,
    priceRange: '৳৳',
    badges: ['Fast Delivery', 'Burgers'],
    image: 'https://cdn.pixabay.com/photo/2016/03/05/19/02/hamburger-1238246_1280.jpg',
    address: { area: 'Bashundhara City, Jamuna Future Park', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '09610888000' },
    openingHours: {
      monday: { open: '10:00', close: '22:00' },
      tuesday: { open: '10:00', close: '22:00' },
      wednesday: { open: '10:00', close: '22:00' },
      thursday: { open: '10:00', close: '22:00' },
      friday: { open: '10:00', close: '22:00' },
      saturday: { open: '10:00', close: '22:00' },
      sunday: { open: '10:00', close: '22:00' }
    },
    tags: ['Burgers', 'Fast Food', 'Flame Grilled']
  },
  {
    name: "Domino's Pizza",
    cuisine: ['Pizza', 'Italian'],
    description: 'World famous pizza delivery chain with 30 minutes guarantee',
    rating: 4.5,
    totalReviews: 11200,
    deliveryTime: 30,
    deliveryFee: 49,
    minimumOrder: 399,
    priceRange: '৳৳',
    badges: ['Popular', 'Fast Delivery', '30 Min Guarantee'],
    image: 'https://cdn.pixabay.com/photo/2020/05/17/04/22/pizza-5179939_1280.jpg',
    address: { area: 'Multiple Outlets', city: 'Dhaka', fullAddress: 'Gulshan, Dhanmondi, Banani' },
    contact: { phone: '09666710345', website: 'https://dominos.com.bd' },
    tags: ['Pizza', 'Fast Delivery', 'Italian']
  },
  {
    name: 'Subway',
    cuisine: ['Fast Food', 'Sandwiches', 'Healthy'],
    description: 'Freshly made sandwiches and healthy eating options',
    rating: 4.3,
    totalReviews: 7650,
    deliveryTime: 25,
    deliveryFee: 39,
    minimumOrder: 249,
    priceRange: '৳৳',
    badges: ['Healthy', 'Fresh'],
    image: 'https://cdn.pixabay.com/photo/2017/06/29/20/09/mexican-2456038_1280.jpg',
    address: { area: 'Gulshan, Banani', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '09666744447' },
    tags: ['Sandwiches', 'Healthy', 'Fresh']
  },
  
  // Popular Bangladeshi Restaurants
  {
    name: 'Kacchi Bhai',
    cuisine: ['Bangladeshi', 'Biryani', 'Mughlai'],
    description: 'Famous for authentic Dhaka-style kacchi biryani and traditional Bengali cuisine',
    rating: 4.8,
    totalReviews: 18500,
    deliveryTime: 40,
    deliveryFee: 60,
    minimumOrder: 350,
    priceRange: '৳৳',
    badges: ['Popular', 'Bestseller', 'Biryani Special'],
    image: 'https://cdn.pixabay.com/photo/2022/06/10/05/32/biryani-7253751_1280.jpg',
    address: { area: 'Banani, Gulshan, Dhanmondi', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01730088444' },
    tags: ['Biryani', 'Kacchi', 'Bengali', 'Authentic']
  },
  {
    name: 'Sultan\'s Dine',
    cuisine: ['Bangladeshi', 'Mughlai', 'Indian'],
    description: 'Premium Mughlai cuisine with royal recipes and authentic flavors',
    rating: 4.7,
    totalReviews: 14200,
    deliveryTime: 35,
    deliveryFee: 70,
    minimumOrder: 400,
    priceRange: '৳৳৳',
    badges: ['Premium', 'Authentic Mughlai'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'Dhanmondi 27', city: 'Dhaka', fullAddress: 'Dhanmondi, Dhaka' },
    contact: { phone: '01713456789' },
    tags: ['Mughlai', 'Premium', 'Curry']
  },
  {
    name: 'Star Kabab & Restaurant',
    cuisine: ['Bangladeshi', 'BBQ', 'Kabab'],
    description: 'Legendary kabab house famous for seekh kabab and mixed grills',
    rating: 4.9,
    totalReviews: 16800,
    deliveryTime: 30,
    deliveryFee: 50,
    minimumOrder: 300,
    priceRange: '৳৳',
    badges: ['Popular', 'Top Rated', 'BBQ Master'],
    image: 'https://cdn.pixabay.com/photo/2019/02/14/07/06/food-3996014_1280.jpg',
    address: { area: 'Dhanmondi 8', city: 'Dhaka', fullAddress: 'Dhanmondi 8, Dhaka' },
    contact: { phone: '01711234567' },
    tags: ['Kabab', 'BBQ', 'Grilled']
  },
  {
    name: 'Fakruddin Biryani',
    cuisine: ['Bangladeshi', 'Biryani'],
    description: 'Authentic Old Dhaka style biryani since 1960s',
    rating: 4.6,
    totalReviews: 13400,
    deliveryTime: 45,
    deliveryFee: 60,
    minimumOrder: 350,
    priceRange: '৳৳',
    badges: ['Heritage', 'Authentic', 'Since 1960'],
    image: 'https://cdn.pixabay.com/photo/2022/06/10/05/32/biryani-7253751_1280.jpg',
    address: { area: 'Old Dhaka, Uttara, Gulshan', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01777777777' },
    tags: ['Biryani', 'Old Dhaka', 'Heritage']
  },
  {
    name: 'Haji Biriyani',
    cuisine: ['Bangladeshi', 'Biryani'],
    description: 'Iconic Old Dhaka biryani since 1939 - the original taste',
    rating: 4.7,
    totalReviews: 15600,
    deliveryTime: 50,
    deliveryFee: 70,
    minimumOrder: 400,
    priceRange: '৳৳',
    badges: ['Heritage', 'Since 1939', 'Legendary'],
    image: 'https://cdn.pixabay.com/photo/2022/06/10/05/32/biryani-7253751_1280.jpg',
    address: { area: 'Nazira Bazar', city: 'Dhaka', fullAddress: 'Nazira Bazar, Old Dhaka' },
    contact: { phone: '01819123456' },
    tags: ['Biryani', 'Heritage', 'Old Dhaka']
  },
  {
    name: 'Khana\'s',
    cuisine: ['Bangladeshi', 'Home Food'],
    description: 'Authentic home-style Bangladeshi food with traditional recipes',
    rating: 4.5,
    totalReviews: 8900,
    deliveryTime: 35,
    deliveryFee: 50,
    minimumOrder: 250,
    priceRange: '৳৳',
    badges: ['Home Style', 'Healthy'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'Banani', city: 'Dhaka', fullAddress: 'Banani, Dhaka' },
    contact: { phone: '01755666777' },
    tags: ['Home Food', 'Bengali', 'Healthy']
  },
  {
    name: 'Spice & Rice',
    cuisine: ['Bangladeshi', 'Indian', 'Thai'],
    description: 'Fusion of Bengali, Indian and Thai cuisine',
    rating: 4.4,
    totalReviews: 7800,
    deliveryTime: 30,
    deliveryFee: 60,
    minimumOrder: 350,
    priceRange: '৳৳৳',
    badges: ['Fusion', 'Premium'],
    image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
    address: { area: 'Gulshan 2', city: 'Dhaka', fullAddress: 'Gulshan 2, Dhaka' },
    contact: { phone: '01711888999' },
    tags: ['Fusion', 'Thai', 'Indian']
  },
  {
    name: 'Bhuna Khichuri House',
    cuisine: ['Bangladeshi', 'Comfort Food'],
    description: 'Specializing in bhuna khichuri, beef bhuna and Bengali comfort food',
    rating: 4.6,
    totalReviews: 9200,
    deliveryTime: 25,
    deliveryFee: 40,
    minimumOrder: 200,
    priceRange: '৳',
    badges: ['Budget Friendly', 'Comfort Food'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'Mirpur, Uttara', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01622334455' },
    tags: ['Khichuri', 'Bengali', 'Comfort Food']
  },

  // Chinese & Thai Restaurants
  {
    name: 'Chillox',
    cuisine: ['Chinese', 'Thai'],
    description: 'Popular Chinese and Thai restaurant chain',
    rating: 4.6,
    totalReviews: 10500,
    deliveryTime: 35,
    deliveryFee: 55,
    minimumOrder: 350,
    priceRange: '৳৳',
    badges: ['Popular', 'Chinese Special'],
    image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
    address: { area: 'Banani, Uttara', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01755444333' },
    tags: ['Chinese', 'Thai', 'Fried Rice']
  },
  {
    name: 'Saltz',
    cuisine: ['Chinese', 'Thai', 'Asian Fusion'],
    description: 'Premium Asian cuisine with authentic flavors',
    rating: 4.5,
    totalReviews: 8700,
    deliveryTime: 30,
    deliveryFee: 70,
    minimumOrder: 400,
    priceRange: '৳৳৳',
    badges: ['Premium', 'Authentic'],
    image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
    address: { area: 'Gulshan', city: 'Dhaka', fullAddress: 'Gulshan, Dhaka' },
    contact: { phone: '01711222333' },
    tags: ['Chinese', 'Thai', 'Premium']
  },
  {
    name: 'Takeout',
    cuisine: ['Thai', 'Asian Fusion', 'Japanese'],
    description: 'Upscale Asian fusion restaurant with Thai and Japanese specialties',
    rating: 4.7,
    totalReviews: 9500,
    deliveryTime: 40,
    deliveryFee: 80,
    minimumOrder: 500,
    priceRange: '৳৳৳',
    badges: ['Premium', 'Fusion'],
    image: 'https://cdn.pixabay.com/photo/2018/03/23/08/27/food-3253352_1280.jpg',
    address: { area: 'Gulshan 2, Banani', city: 'Dhaka', fullAddress: 'Gulshan 2, Dhaka' },
    contact: { phone: '01713555666', website: 'https://takeout.com.bd' },
    tags: ['Thai', 'Japanese', 'Sushi', 'Premium']
  },
  {
    name: 'Chinese Town',
    cuisine: ['Chinese'],
    description: 'Authentic Chinese restaurant with traditional recipes',
    rating: 4.3,
    totalReviews: 6800,
    deliveryTime: 30,
    deliveryFee: 50,
    minimumOrder: 300,
    priceRange: '৳৳',
    badges: ['Authentic Chinese'],
    image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
    address: { area: 'Dhanmondi', city: 'Dhaka', fullAddress: 'Dhanmondi, Dhaka' },
    contact: { phone: '01788999000' },
    tags: ['Chinese', 'Authentic', 'Noodles']
  },
  {
    name: 'Thai Emerald',
    cuisine: ['Thai'],
    description: 'Authentic Thai cuisine with imported ingredients',
    rating: 4.6,
    totalReviews: 7200,
    deliveryTime: 35,
    deliveryFee: 70,
    minimumOrder: 450,
    priceRange: '৳৳৳',
    badges: ['Authentic Thai', 'Premium'],
    image: 'https://cdn.pixabay.com/photo/2018/03/23/08/27/food-3253352_1280.jpg',
    address: { area: 'Banani', city: 'Dhaka', fullAddress: 'Banani, Dhaka' },
    contact: { phone: '01711777888' },
    tags: ['Thai', 'Authentic', 'Curry']
  },

  // Continental & Premium Restaurants
  {
    name: 'Helvetia',
    cuisine: ['Swiss', 'Continental', 'European'],
    description: 'Fine dining Swiss and continental cuisine',
    rating: 4.7,
    totalReviews: 8900,
    deliveryTime: 40,
    deliveryFee: 90,
    minimumOrder: 600,
    priceRange: '৳৳৳',
    badges: ['Premium', 'Fine Dining'],
    image: 'https://cdn.pixabay.com/photo/2016/11/18/14/05/cacciatore-1834371_1280.jpg',
    address: { area: 'Gulshan 1', city: 'Dhaka', fullAddress: 'Gulshan 1, Dhaka' },
    contact: { phone: '01713222111', website: 'https://helvetia.com.bd' },
    tags: ['Swiss', 'Continental', 'Fine Dining']
  },
  {
    name: 'The Atrium',
    cuisine: ['Continental', 'International'],
    description: 'Elegant dining with international cuisine',
    rating: 4.5,
    totalReviews: 6700,
    deliveryTime: 45,
    deliveryFee: 80,
    minimumOrder: 500,
    priceRange: '৳৳৳',
    badges: ['Premium', 'Elegant'],
    image: 'https://cdn.pixabay.com/photo/2016/11/18/14/05/cacciatore-1834371_1280.jpg',
    address: { area: 'Gulshan', city: 'Dhaka', fullAddress: 'Gulshan, Dhaka' },
    contact: { phone: '01755111222' },
    tags: ['Continental', 'Elegant', 'International']
  },
  {
    name: 'Spaghetti Jazz',
    cuisine: ['Italian', 'Continental'],
    description: 'Authentic Italian pasta and continental dishes',
    rating: 4.4,
    totalReviews: 7500,
    deliveryTime: 35,
    deliveryFee: 70,
    minimumOrder: 450,
    priceRange: '৳৳৳',
    badges: ['Italian', 'Pasta Special'],
    image: 'https://cdn.pixabay.com/photo/2017/03/03/15/32/pasta-2113173_1280.jpg',
    address: { area: 'Banani', city: 'Dhaka', fullAddress: 'Banani, Dhaka' },
    contact: { phone: '01711333444' },
    tags: ['Italian', 'Pasta', 'Continental']
  },

  // Burger & Sandwich Joints
  {
    name: 'The Burger Lab',
    cuisine: ['Burgers', 'Fast Food'],
    description: 'Gourmet burgers with unique flavors and premium ingredients',
    rating: 4.5,
    totalReviews: 9800,
    deliveryTime: 25,
    deliveryFee: 45,
    minimumOrder: 250,
    priceRange: '৳৳',
    badges: ['Popular', 'Gourmet Burgers'],
    image: 'https://cdn.pixabay.com/photo/2016/03/05/19/02/hamburger-1238246_1280.jpg',
    address: { area: 'Gulshan, Banani, Dhanmondi', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01733444555' },
    tags: ['Burgers', 'Gourmet', 'Fast Food']
  },
  {
    name: 'Burger Xpress',
    cuisine: ['Burgers', 'Fast Food'],
    description: 'Quick service gourmet burgers and fries',
    rating: 4.3,
    totalReviews: 6500,
    deliveryTime: 20,
    deliveryFee: 40,
    minimumOrder: 200,
    priceRange: '৳',
    badges: ['Fast Delivery', 'Budget Friendly'],
    image: 'https://cdn.pixabay.com/photo/2020/03/29/11/03/burger-4980992_1280.jpg',
    address: { area: 'Multiple Outlets', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01622555666' },
    tags: ['Burgers', 'Fast Food', 'Quick']
  },
  {
    name: 'Sandwich King',
    cuisine: ['Sandwiches', 'Fast Food'],
    description: 'Variety of sandwiches, wraps and healthy options',
    rating: 4.2,
    totalReviews: 5400,
    deliveryTime: 20,
    deliveryFee: 35,
    minimumOrder: 180,
    priceRange: '৳',
    badges: ['Budget Friendly', 'Healthy'],
    image: 'https://cdn.pixabay.com/photo/2017/06/29/20/09/mexican-2456038_1280.jpg',
    address: { area: 'Dhanmondi, Mirpur', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01755777888' },
    tags: ['Sandwiches', 'Wraps', 'Healthy']
  },

  // Home Food & Catering
  {
    name: 'Chaldal Kitchen',
    cuisine: ['Bangladeshi', 'Home Food'],
    description: 'Affordable home-style Bengali meals delivered fresh',
    rating: 4.6,
    totalReviews: 11200,
    deliveryTime: 30,
    deliveryFee: 30,
    minimumOrder: 150,
    priceRange: '৳',
    badges: ['Budget Friendly', 'Home Style', 'Popular'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'All over Dhaka', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '09610123456', website: 'https://chaldal.com' },
    tags: ['Home Food', 'Bengali', 'Budget Friendly']
  },
  {
    name: 'Pran Frooto Juice Bar',
    cuisine: ['Beverages', 'Juice', 'Snacks'],
    description: 'Fresh juices, smoothies and healthy snacks',
    rating: 4.4,
    totalReviews: 6700,
    deliveryTime: 15,
    deliveryFee: 25,
    minimumOrder: 100,
    priceRange: '৳',
    badges: ['Healthy', 'Fresh', 'Quick'],
    image: 'https://cdn.pixabay.com/photo/2017/05/11/19/44/fresh-fruits-2305192_1280.jpg',
    address: { area: 'Multiple Outlets', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01666111222' },
    tags: ['Juice', 'Healthy', 'Fresh']
  },
  {
    name: 'Daily Biriyani',
    cuisine: ['Bangladeshi', 'Biryani'],
    description: 'Fresh biryani delivered daily with homemade taste',
    rating: 4.4,
    totalReviews: 8100,
    deliveryTime: 35,
    deliveryFee: 50,
    minimumOrder: 250,
    priceRange: '৳',
    badges: ['Home Style', 'Fresh Daily'],
    image: 'https://cdn.pixabay.com/photo/2022/06/10/05/32/biryani-7253751_1280.jpg',
    address: { area: 'Mirpur, Mohammadpur', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01788222333' },
    tags: ['Biryani', 'Home Food', 'Daily Fresh']
  },

  // Cafe & Bakery
  {
    name: 'North End Coffee Roasters',
    cuisine: ['Cafe', 'Coffee', 'Bakery'],
    description: 'Premium coffee and bakery items',
    rating: 4.7,
    totalReviews: 9300,
    deliveryTime: 25,
    deliveryFee: 50,
    minimumOrder: 200,
    priceRange: '৳৳',
    badges: ['Premium Coffee', 'Bakery'],
    image: 'https://cdn.pixabay.com/photo/2017/05/11/11/15/workplace-2303851_1280.jpg',
    address: { area: 'Banani, Gulshan', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01711555777', website: 'https://northend.com.bd' },
    tags: ['Coffee', 'Cafe', 'Bakery']
  },
  {
    name: 'Coopers Confectionery',
    cuisine: ['Bakery', 'Desserts', 'Cafe'],
    description: 'Fresh bakery items, cakes and desserts',
    rating: 4.5,
    totalReviews: 7800,
    deliveryTime: 30,
    deliveryFee: 45,
    minimumOrder: 250,
    priceRange: '৳৳',
    badges: ['Bakery', 'Fresh Daily'],
    image: 'https://cdn.pixabay.com/photo/2022/03/02/12/42/cake-7042666_1280.jpg',
    address: { area: 'Dhanmondi, Gulshan', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01733666888' },
    tags: ['Bakery', 'Cakes', 'Desserts']
  },
  {
    name: 'Bon Appetit',
    cuisine: ['Bakery', 'Cafe', 'Desserts'],
    description: 'European style bakery and cafe',
    rating: 4.6,
    totalReviews: 8500,
    deliveryTime: 25,
    deliveryFee: 50,
    minimumOrder: 220,
    priceRange: '৳৳',
    badges: ['Premium', 'European Bakery'],
    image: 'https://cdn.pixabay.com/photo/2018/08/29/19/03/bread-3640917_1280.jpg',
    address: { area: 'Gulshan, Banani', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01755888999' },
    tags: ['Bakery', 'Cafe', 'European']
  },

  // More Local Favorites
  {
    name: 'Dhakaiya Kasturi',
    cuisine: ['Bangladeshi', 'Old Dhaka Style'],
    description: 'Authentic Old Dhaka cuisine and street food',
    rating: 4.5,
    totalReviews: 7600,
    deliveryTime: 35,
    deliveryFee: 55,
    minimumOrder: 280,
    priceRange: '৳',
    badges: ['Authentic', 'Old Dhaka'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'Old Dhaka', city: 'Dhaka', fullAddress: 'Old Dhaka' },
    contact: { phone: '01622777888' },
    tags: ['Old Dhaka', 'Street Food', 'Authentic']
  },
  {
    name: 'Mezban',
    cuisine: ['Bangladeshi', 'Chittagonian'],
    description: 'Authentic Chittagonian beef and traditional recipes',
    rating: 4.7,
    totalReviews: 9800,
    deliveryTime: 40,
    deliveryFee: 65,
    minimumOrder: 350,
    priceRange: '৳৳',
    badges: ['Authentic Chittagonian', 'Beef Special'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'Mohammadpur, Dhanmondi', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01711999000' },
    tags: ['Chittagonian', 'Beef', 'Authentic']
  },
  {
    name: 'The Village Restaurant',
    cuisine: ['Bangladeshi', 'Village Style'],
    description: 'Traditional village-style Bengali food',
    rating: 4.4,
    totalReviews: 6900,
    deliveryTime: 35,
    deliveryFee: 50,
    minimumOrder: 250,
    priceRange: '৳',
    badges: ['Village Style', 'Traditional'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'Uttara', city: 'Dhaka', fullAddress: 'Uttara, Dhaka' },
    contact: { phone: '01788333444' },
    tags: ['Village Style', 'Bengali', 'Traditional']
  },
  {
    name: 'Kasturi Restaurant',
    cuisine: ['Bangladeshi', 'Indian'],
    description: 'Classic Bengali and North Indian cuisine',
    rating: 4.3,
    totalReviews: 5800,
    deliveryTime: 30,
    deliveryFee: 45,
    minimumOrder: 220,
    priceRange: '৳',
    badges: ['Classic', 'Budget Friendly'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'Bailey Road', city: 'Dhaka', fullAddress: 'Bailey Road, Dhaka' },
    contact: { phone: '01755222333' },
    tags: ['Bengali', 'Indian', 'Classic']
  },

  // Korean, Japanese & Others
  {
    name: 'Seoul Restaurant',
    cuisine: ['Korean'],
    description: 'Authentic Korean BBQ and traditional dishes',
    rating: 4.6,
    totalReviews: 7100,
    deliveryTime: 40,
    deliveryFee: 75,
    minimumOrder: 450,
    priceRange: '৳৳৳',
    badges: ['Authentic Korean', 'Premium'],
    image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
    address: { area: 'Gulshan', city: 'Dhaka', fullAddress: 'Gulshan, Dhaka' },
    contact: { phone: '01713444555' },
    tags: ['Korean', 'BBQ', 'Authentic']
  },
  {
    name: 'Izumi Japanese Kitchen',
    cuisine: ['Japanese', 'Sushi'],
    description: 'Authentic Japanese cuisine with fresh sushi',
    rating: 4.7,
    totalReviews: 6800,
    deliveryTime: 45,
    deliveryFee: 85,
    minimumOrder: 500,
    priceRange: '৳৳৳',
    badges: ['Authentic Japanese', 'Sushi Master'],
    image: 'https://cdn.pixabay.com/photo/2017/10/15/11/41/sushi-2853382_1280.jpg',
    address: { area: 'Banani', city: 'Dhaka', fullAddress: 'Banani, Dhaka' },
    contact: { phone: '01711666777' },
    tags: ['Japanese', 'Sushi', 'Premium']
  },
  {
    name: 'Absolute Thai',
    cuisine: ['Thai'],
    description: 'Traditional Thai food with authentic recipes',
    rating: 4.5,
    totalReviews: 6200,
    deliveryTime: 35,
    deliveryFee: 65,
    minimumOrder: 380,
    priceRange: '৳৳',
    badges: ['Authentic Thai'],
    image: 'https://cdn.pixabay.com/photo/2018/03/23/08/27/food-3253352_1280.jpg',
    address: { area: 'Gulshan', city: 'Dhaka', fullAddress: 'Gulshan, Dhaka' },
    contact: { phone: '01788555666' },
    tags: ['Thai', 'Authentic', 'Curry']
  },

  // More Pizza Places
  {
    name: 'Pizza Roma',
    cuisine: ['Pizza', 'Italian'],
    description: 'Authentic Italian style wood-fired pizzas',
    rating: 4.4,
    totalReviews: 6700,
    deliveryTime: 35,
    deliveryFee: 55,
    minimumOrder: 350,
    priceRange: '৳৳',
    badges: ['Wood Fired', 'Authentic Italian'],
    image: 'https://cdn.pixabay.com/photo/2017/12/09/08/18/pizza-3007395_1280.jpg',
    address: { area: 'Banani, Dhanmondi', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01733777888' },
    tags: ['Pizza', 'Italian', 'Wood Fired']
  },
  {
    name: 'Slice of Italy',
    cuisine: ['Pizza', 'Italian'],
    description: 'Traditional Italian pizzas and pasta',
    rating: 4.3,
    totalReviews: 5900,
    deliveryTime: 30,
    deliveryFee: 50,
    minimumOrder: 300,
    priceRange: '৳৳',
    badges: ['Italian', 'Fresh Dough'],
    image: 'https://cdn.pixabay.com/photo/2020/05/17/04/22/pizza-5179939_1280.jpg',
    address: { area: 'Uttara', city: 'Dhaka', fullAddress: 'Uttara, Dhaka' },
    contact: { phone: '01755333444' },
    tags: ['Pizza', 'Italian', 'Pasta']
  },

  // Dessert & Ice Cream
  {
    name: 'Movenpick Ice Cream',
    cuisine: ['Desserts', 'Ice Cream'],
    description: 'Swiss premium ice cream and desserts',
    rating: 4.8,
    totalReviews: 8900,
    deliveryTime: 20,
    deliveryFee: 60,
    minimumOrder: 250,
    priceRange: '৳৳৳',
    badges: ['Premium', 'Swiss Quality'],
    image: 'https://cdn.pixabay.com/photo/2017/07/31/18/39/ice-2558623_1280.jpg',
    address: { area: 'Multiple Outlets', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01713888999' },
    tags: ['Ice Cream', 'Desserts', 'Premium']
  },
  {
    name: 'Sweet Treat',
    cuisine: ['Desserts', 'Sweets', 'Bakery'],
    description: 'Traditional Bengali sweets and desserts',
    rating: 4.5,
    totalReviews: 7200,
    deliveryTime: 25,
    deliveryFee: 40,
    minimumOrder: 200,
    priceRange: '৳',
    badges: ['Bengali Sweets', 'Traditional'],
    image: 'https://cdn.pixabay.com/photo/2022/03/02/12/42/cake-7042666_1280.jpg',
    address: { area: 'Multiple Outlets', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01622888999' },
    tags: ['Sweets', 'Desserts', 'Bengali']
  },

  // Fried Chicken
  {
    name: 'Chicken Cottage',
    cuisine: ['Chicken', 'Fast Food'],
    description: 'Halal fried chicken and burgers',
    rating: 4.3,
    totalReviews: 6400,
    deliveryTime: 25,
    deliveryFee: 45,
    minimumOrder: 250,
    priceRange: '৳',
    badges: ['Halal', 'Budget Friendly'],
    image: 'https://cdn.pixabay.com/photo/2020/06/30/15/03/table-5356642_1280.jpg',
    address: { area: 'Multiple Outlets', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01788666777' },
    tags: ['Fried Chicken', 'Halal', 'Fast Food']
  },
  {
    name: 'Texas Fried Chicken',
    cuisine: ['Chicken', 'Fast Food'],
    description: 'Crispy fried chicken and sides',
    rating: 4.2,
    totalReviews: 5600,
    deliveryTime: 20,
    deliveryFee: 40,
    minimumOrder: 200,
    priceRange: '৳',
    badges: ['Budget Friendly', 'Quick'],
    image: 'https://cdn.pixabay.com/photo/2020/06/30/15/03/table-5356642_1280.jpg',
    address: { area: 'Mirpur, Mohammadpur', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01755444555' },
    tags: ['Fried Chicken', 'Fast Food']
  },

  // Health Food
  {
    name: 'Salad Box',
    cuisine: ['Healthy', 'Salads', 'Wraps'],
    description: 'Fresh salads, wraps and healthy meal options',
    rating: 4.5,
    totalReviews: 5800,
    deliveryTime: 25,
    deliveryFee: 50,
    minimumOrder: 250,
    priceRange: '৳৳',
    badges: ['Healthy', 'Fresh', 'Diet Friendly'],
    image: 'https://cdn.pixabay.com/photo/2017/09/16/19/21/salad-2756467_1280.jpg',
    address: { area: 'Gulshan, Banani', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01711222444' },
    tags: ['Salads', 'Healthy', 'Wraps']
  },
  {
    name: 'Green Bowl',
    cuisine: ['Healthy', 'Vegan', 'Organic'],
    description: 'Organic and vegan food options',
    rating: 4.4,
    totalReviews: 4700,
    deliveryTime: 30,
    deliveryFee: 55,
    minimumOrder: 280,
    priceRange: '৳৳',
    badges: ['Vegan', 'Organic', 'Healthy'],
    image: 'https://cdn.pixabay.com/photo/2017/09/16/19/21/salad-2756467_1280.jpg',
    address: { area: 'Gulshan', city: 'Dhaka', fullAddress: 'Gulshan, Dhaka' },
    contact: { phone: '01733555777' },
    tags: ['Vegan', 'Organic', 'Healthy']
  },

  // Seafood
  {
    name: 'Prego Italian Cuisino',
    cuisine: ['Italian', 'Seafood', 'Continental'],
    description: 'Premium Italian cuisine with seafood specialties',
    rating: 4.6,
    totalReviews: 6300,
    deliveryTime: 40,
    deliveryFee: 80,
    minimumOrder: 500,
    priceRange: '৳৳৳',
    badges: ['Premium', 'Seafood Special'],
    image: 'https://cdn.pixabay.com/photo/2017/03/03/15/32/pasta-2113173_1280.jpg',
    address: { area: 'Gulshan', city: 'Dhaka', fullAddress: 'Westin Dhaka' },
    contact: { phone: '01713111222' },
    tags: ['Italian', 'Seafood', 'Premium']
  },
  {
    name: 'Fisherman\'s Wharf',
    cuisine: ['Seafood', 'Chinese'],
    description: 'Fresh seafood and Chinese preparations',
    rating: 4.4,
    totalReviews: 5200,
    deliveryTime: 35,
    deliveryFee: 70,
    minimumOrder: 400,
    priceRange: '৳৳',
    badges: ['Seafood Special', 'Fresh'],
    image: 'https://cdn.pixabay.com/photo/2019/09/26/18/23/salmon-4506040_1280.jpg',
    address: { area: 'Banani', city: 'Dhaka', fullAddress: 'Banani, Dhaka' },
    contact: { phone: '01788111222' },
    tags: ['Seafood', 'Chinese', 'Fresh']
  },

  // Mexican & Others
  {
    name: 'Amigos',
    cuisine: ['Mexican', 'Tex-Mex'],
    description: 'Authentic Mexican food and Tex-Mex favorites',
    rating: 4.3,
    totalReviews: 5600,
    deliveryTime: 30,
    deliveryFee: 60,
    minimumOrder: 350,
    priceRange: '৳৳',
    badges: ['Mexican', 'Tacos'],
    image: 'https://cdn.pixabay.com/photo/2017/06/29/20/09/mexican-2456038_1280.jpg',
    address: { area: 'Gulshan', city: 'Dhaka', fullAddress: 'Gulshan, Dhaka' },
    contact: { phone: '01755999000' },
    tags: ['Mexican', 'Tacos', 'Burritos']
  },
  {
    name: 'Nando\'s',
    cuisine: ['Portuguese', 'Chicken', 'Peri-Peri'],
    description: 'Famous for peri-peri grilled chicken',
    rating: 4.5,
    totalReviews: 8200,
    deliveryTime: 30,
    deliveryFee: 55,
    minimumOrder: 350,
    priceRange: '৳৳',
    badges: ['Popular', 'Peri-Peri Master'],
    image: 'https://cdn.pixabay.com/photo/2020/08/04/12/39/tandoori-chicken-5463049_1280.jpg',
    address: { area: 'Gulshan, Banani', city: 'Dhaka', fullAddress: 'Multiple Outlets' },
    contact: { phone: '01711444666' },
    tags: ['Peri-Peri', 'Chicken', 'Portuguese']
  },

  // More Bengali Restaurants
  {
    name: 'Bhoj Company',
    cuisine: ['Bangladeshi', 'Indian'],
    description: 'Bengali and North Indian cuisine buffet style',
    rating: 4.4,
    totalReviews: 7100,
    deliveryTime: 35,
    deliveryFee: 60,
    minimumOrder: 350,
    priceRange: '৳৳',
    badges: ['Buffet Style', 'Variety'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'Gulshan', city: 'Dhaka', fullAddress: 'Gulshan, Dhaka' },
    contact: { phone: '01733888000' },
    tags: ['Bengali', 'Indian', 'Buffet']
  },
  {
    name: 'Namaste India',
    cuisine: ['Indian', 'North Indian'],
    description: 'Authentic North Indian cuisine',
    rating: 4.3,
    totalReviews: 6200,
    deliveryTime: 35,
    deliveryFee: 55,
    minimumOrder: 320,
    priceRange: '৳৳',
    badges: ['Authentic Indian', 'Tandoor Special'],
    image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg',
    address: { area: 'Banani', city: 'Dhaka', fullAddress: 'Banani, Dhaka' },
    contact: { phone: '01755222444' },
    tags: ['Indian', 'Tandoor', 'Curry']
  }
];

console.log('Starting database seed...');
console.log(`Total restaurants to seed: ${restaurants.length}`);

// Seed function
async function seedDatabase() {
  try {
    // Clear existing data
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});
    console.log('✓ Cleared existing data');

    // Insert restaurants
    const insertedRestaurants = await Restaurant.insertMany(restaurants);
    console.log(`✓ Inserted ${insertedRestaurants.length} restaurants`);

    // Now add menu items for each restaurant
    // This is a simplified version - in production you'd want more items per restaurant
    const menuItemsToInsert = [];
    
    for (const restaurant of insertedRestaurants) {
      // Add 5-10 sample menu items per restaurant based on cuisine type
      const items = generateMenuItemsForRestaurant(restaurant);
      menuItemsToInsert.push(...items);
    }

    const insertedMenuItems = await MenuItem.insertMany(menuItemsToInsert);
    console.log(`✓ Inserted ${insertedMenuItems.length} menu items`);

    console.log('\n✓✓✓ Database seeded successfully! ✓✓✓\n');
    console.log('Summary:');
    console.log(`- ${insertedRestaurants.length} restaurants`);
    console.log(`- ${insertedMenuItems.length} menu items`);
    console.log(`- Average ${Math.round(insertedMenuItems.length / insertedRestaurants.length)} items per restaurant`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Helper function to generate menu items based on restaurant type
function generateMenuItemsForRestaurant(restaurant) {
  const items = [];
  const restaurantId = restaurant._id;
  
  // Menu templates based on cuisine type
  if (restaurant.cuisine.includes('Fast Food') || restaurant.cuisine.includes('Burgers')) {
    items.push(
      {
        restaurant: restaurantId,
        name: 'Classic Beef Burger',
        description: 'Juicy beef patty with lettuce, tomato, and special sauce',
        price: 299,
        category: 'Burgers',
        image: 'https://cdn.pixabay.com/photo/2016/03/05/19/02/hamburger-1238246_1280.jpg',
        badges: ['Popular'],
        spiceLevel: 1
      },
      {
        restaurant: restaurantId,
        name: 'Crispy Chicken Burger',
        description: 'Crispy fried chicken with mayo and fresh vegetables',
        price: 279,
        category: 'Burgers',
        image: 'https://cdn.pixabay.com/photo/2020/03/29/11/03/burger-4980992_1280.jpg',
        spiceLevel: 1
      },
      {
        restaurant: restaurantId,
        name: 'French Fries',
        description: 'Crispy golden fries',
        price: 129,
        category: 'Sides',
        image: 'https://cdn.pixabay.com/photo/2017/03/23/19/30/french-fries-2169980_1280.jpg',
        badges: ['Popular']
      },
      {
        restaurant: restaurantId,
        name: 'Soft Drink',
        description: 'Chilled soft drink',
        price: 65,
        category: 'Beverages',
        image: 'https://cdn.pixabay.com/photo/2016/12/26/17/28/soda-1932466_1280.jpg'
      }
    );
  }
  
  if (restaurant.cuisine.includes('Pizza')) {
    items.push(
      {
        restaurant: restaurantId,
        name: 'Pepperoni Pizza',
        description: 'Classic pepperoni with mozzarella cheese',
        price: 899,
        category: 'Pizza',
        image: 'https://cdn.pixabay.com/photo/2017/12/09/08/18/pizza-3007395_1280.jpg',
        badges: ['Popular', 'Bestseller'],
        sizes: [
          { name: 'Medium', price: 899 },
          { name: 'Large', price: 1199 }
        ]
      },
      {
        restaurant: restaurantId,
        name: 'Margherita Pizza',
        description: 'Fresh tomato, basil and mozzarella',
        price: 749,
        category: 'Pizza',
        image: 'https://cdn.pixabay.com/photo/2020/05/17/04/22/pizza-5179939_1280.jpg',
        sizes: [
          { name: 'Medium', price: 749 },
          { name: 'Large', price: 1049 }
        ]
      },
      {
        restaurant: restaurantId,
        name: 'Garlic Bread',
        description: 'Freshly baked garlic bread',
        price: 199,
        category: 'Sides',
        image: 'https://cdn.pixabay.com/photo/2018/08/29/19/03/bread-3640917_1280.jpg'
      }
    );
  }
  
  if (restaurant.cuisine.includes('Biryani') || restaurant.cuisine.includes('Bangladeshi')) {
    items.push(
      {
        restaurant: restaurantId,
        name: 'Mutton Kacchi Biryani',
        description: 'Premium mutton kacchi biryani with aromatic spices',
        price: 450,
        category: 'Biryani',
        image: 'https://cdn.pixabay.com/photo/2022/06/10/05/32/biryani-7253751_1280.jpg',
        badges: ['Popular', 'Bestseller'],
        spiceLevel: 2,
        sizes: [
          { name: 'Regular', price: 450 },
          { name: 'Large', price: 650 }
        ]
      },
      {
        restaurant: restaurantId,
        name: 'Chicken Biryani',
        description: 'Flavorful chicken biryani',
        price: 280,
        category: 'Biryani',
        image: 'https://cdn.pixabay.com/photo/2022/06/10/05/32/biryani-7253751_1280.jpg',
        badges: ['Popular'],
        spiceLevel: 2
      },
      {
        restaurant: restaurantId,
        name: 'Chicken Roast',
        description: 'Spicy roasted chicken pieces',
        price: 250,
        category: 'Sides',
        image: 'https://cdn.pixabay.com/photo/2020/08/04/12/39/tandoori-chicken-5463049_1280.jpg',
        spiceLevel: 2
      },
      {
        restaurant: restaurantId,
        name: 'Borhani',
        description: 'Traditional spiced yogurt drink',
        price: 80,
        category: 'Beverages',
        image: 'https://cdn.pixabay.com/photo/2018/06/14/21/18/beverage-3475821_1280.jpg',
        badges: ['Popular']
      }
    );
  }
  
  if (restaurant.cuisine.includes('Chinese') || restaurant.cuisine.includes('Thai')) {
    items.push(
      {
        restaurant: restaurantId,
        name: 'Chicken Fried Rice',
        description: 'Wok-tossed fried rice with chicken',
        price: 320,
        category: 'Mains',
        image: 'https://cdn.pixabay.com/photo/2020/03/23/14/50/rice-4961333_1280.jpg',
        badges: ['Popular']
      },
      {
        restaurant: restaurantId,
        name: 'Sweet and Sour Chicken',
        description: 'Crispy chicken in sweet and sour sauce',
        price: 380,
        category: 'Mains',
        image: 'https://cdn.pixabay.com/photo/2020/01/16/08/21/rice-4769430_1280.jpg'
      },
      {
        restaurant: restaurantId,
        name: 'Spring Rolls',
        description: 'Crispy vegetable spring rolls',
        price: 220,
        category: 'Starters',
        image: 'https://cdn.pixabay.com/photo/2018/07/18/19/12/spring-rolls-3547090_1280.jpg'
      }
    );
  }
  
  if (restaurant.cuisine.includes('Chicken')) {
    items.push(
      {
        restaurant: restaurantId,
        name: 'Fried Chicken Bucket',
        description: 'Crispy fried chicken pieces',
        price: 499,
        category: 'Chicken',
        image: 'https://cdn.pixabay.com/photo/2020/06/30/15/03/table-5356642_1280.jpg',
        badges: ['Popular'],
        sizes: [
          { name: '6 Pcs', price: 499 },
          { name: '9 Pcs', price: 699 }
        ]
      },
      {
        restaurant: restaurantId,
        name: 'Spicy Wings',
        description: 'Hot and spicy chicken wings',
        price: 299,
        category: 'Chicken',
        image: 'https://cdn.pixabay.com/photo/2017/01/26/18/49/wings-2010880_1280.jpg',
        spiceLevel: 3
      }
    );
  }
  
  // Add a couple more generic items
  if (items.length < 6) {
    items.push(
      {
        restaurant: restaurantId,
        name: 'Cold Beverage',
        description: 'Refreshing cold drink',
        price: 65,
        category: 'Beverages',
        image: 'https://cdn.pixabay.com/photo/2016/12/26/17/28/soda-1932466_1280.jpg'
      },
      {
        restaurant: restaurantId,
        name: 'Dessert Special',
        description: 'Delicious dessert of the day',
        price: 180,
        category: 'Desserts',
        image: 'https://cdn.pixabay.com/photo/2022/03/02/12/42/cake-7042666_1280.jpg'
      }
    );
  }
  
  return items;
}

// Run the seed
seedDatabase();
