const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Real Bangladesh Restaurants Data
const restaurants = [
  {
    name: "Holey Artisan Bakery",
    cuisine: ["Bakery", "Cafe"],
    description: "Famous artisan bakery in Dhaka, offering fresh bread, pastries, and desserts.",
    rating: 3.9,
    totalReviews: 52,
    deliveryTime: 30,
    deliveryFee: 40,
    minimumOrder: 200,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Bakery", "Artisan"],
    image: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0a/42/09/81/holey-artisan-bakery.jpg?h=-1&s=1&w=900",
    address: {
      area: "Gulshan",
      city: "Dhaka",
      fullAddress: "Road 79, House 5, Gulshan, Dhaka"
    },
    location: {
      type: "Point",
      coordinates: [90.4125, 23.8103]
    },
    dietary: ["Halal"],
    contact: {
      phone: "+8801969200200"
    },
    tags: ["Bakery", "Bread", "Desserts"]
  },
  {
    name: "Star Kabab & Restaurant",
    cuisine: ["Kebab", "Bangladeshi"],
    description: "Famous for juicy kebabs and local Bangladeshi dishes in Dhaka.",
    rating: 4.1,
    totalReviews: 5148,
    deliveryTime: 35,
    deliveryFee: 50,
    minimumOrder: 250,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Kebab", "Traditional"],
    image: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/07/e7/28/f7/star-kabab-restaurant.jpg?h=-1&s=1&w=900",
    address: {
      area: "Dhanmondi",
      city: "Dhaka",
      fullAddress: "House No, Satmasjid Road, Dhanmondi, Dhaka"
    },
    location: {
      type: "Point",
      coordinates: [90.4000, 23.7500]
    },
    dietary: ["Halal"],
    contact: {
      phone: "+8801715381173"
    },
    tags: ["Kebab", "Bangladeshi", "Grill"]
  },
  {
    name: "Nando's (Dhaka)",
    cuisine: ["Portuguese", "Chicken", "Peri-Peri"],
    description: "International peri-peri chicken chain with multiple Dhaka branches; available on delivery platforms.",
    rating: 4.0,
    totalReviews: 50,
    deliveryTime: 30,
    deliveryFee: 50,
    minimumOrder: 250,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Peri-Peri", "Chicken"],
    image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
    address: { area: "Banani / Dhanmondi", city: "Dhaka", fullAddress: "Multiple outlets (Banani, Dhanmondi etc.)" },
    location: { type: "Point", coordinates: [90.4125, 23.8103] },
    dietary: ["Halal"],
    contact: { phone: "+8809612400400" },
    tags: ["Peri-Peri", "Grilled Chicken"]
  },
  {
    name: "The Bhoj Company",
    cuisine: ["Bengali", "Indian"],
    description: "Buffet-style Bengali and North Indian cuisine; multiple locations in Dhaka (Banani & Gulshan outlets).",
    rating: 4.4,
    totalReviews: 700,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Buffet", "Variety"],
    image: "https://images.unsplash.com/photo-1585937421612-70a008356f36?auto=format&fit=crop&w=800&q=80",
    address: { area: "Banani / Gulshan", city: "Dhaka", fullAddress: "Banani Road 12 / Gulshan outlets" },
    location: { type: "Point", coordinates: [90.4150, 23.8120] },
    dietary: ["Halal"],
    contact: { phone: "+8801727236216" },
    tags: ["Bengali", "Buffet", "Family"]
  },
  {
    name: "Prego (The Westin Dhaka)",
    cuisine: ["Italian", "Continental"],
    description: "Italian fine dining at The Westin Dhaka (Prego) — pasta, pizza and classic Italian menu.",
    rating: 4.5,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Italian", "Fine Dining"],
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
    address: { area: "Airport Road", city: "Dhaka", fullAddress: "The Westin Dhaka, Gulshan-1 / Airport Road area" },
    location: { type: "Point", coordinates: [90.4129, 23.8125] },
    dietary: [],
    contact: { phone: "+8801730374871" },
    tags: ["Italian", "Fine Dining"]
  },
  {
    name: "Seasonal Tastes (InterContinental Dhaka)",
    cuisine: ["International", "Buffet"],
    description: "Buffet & international menu at InterContinental Dhaka; popular for lavish buffets and an international selection.",
    rating: 4.9,
    totalReviews: 1700,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Buffet", "Hotel Dining"],
    image: "https://images.unsplash.com/photo-1576867757603-05b134ebc379?auto=format&fit=crop&w=800&q=80",
    address: { area: "Panthapath", city: "Dhaka", fullAddress: "InterContinental Dhaka, Panthapath / Kazi Nazrul Islam Ave" },
    location: { type: "Point", coordinates: [90.3998, 23.7525] },
    dietary: [],
    contact: { phone: "+8802-xxxx-xxxx" },
    tags: ["Buffet", "International", "Hotel"]
  },
  {
    name: "Grill On The Sky (Rooftop)",
    cuisine: ["Grill", "Continental"],
    description: "Rooftop / skyline dining with grilled steaks and continental menu (popular for views and evening dining).",
    rating: 4.6,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Rooftop", "Fine Dining"],
    image: "https://images.unsplash.com/photo-1544025162-d76690b6d012?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan", city: "Dhaka", fullAddress: "Rooftop / Skyline dining location, Gulshan area" },
    location: { type: "Point", coordinates: [90.4135, 23.8115] },
    dietary: [],
    contact: { phone: null },
    tags: ["Rooftop", "Steak", "Views"]
  },
  {
    name: "Cilantro (Dhaka)",
    cuisine: ["Asian", "Fusion"],
    description: "Well-reviewed restaurant in Dhaka for modern Asian and fusion dishes (often featured in 'best of' lists).",
    rating: 4.3,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Asian", "Fusion"],
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan", city: "Dhaka", fullAddress: "Gulshan / Banani area" },
    location: { type: "Point", coordinates: [90.4127, 23.8112] },
    dietary: [],
    contact: { phone: null },
    tags: ["Fusion", "Fine Dining"]
  },
  {
    name: "Sear (Dhaka Steakhouse)",
    cuisine: ["Steakhouse", "Continental"],
    description: "Popular steakhouse option in Dhaka noted for premium cuts and an upscale dining experience.",
    rating: 4.5,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Steakhouse", "Fine Dining"],
    image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan / Banani", city: "Dhaka", fullAddress: "Gulshan area (check exact branch)" },
    location: { type: "Point", coordinates: [90.4130, 23.8118] },
    dietary: [],
    contact: { phone: null },
    tags: ["Steak", "Premium"]
  },
  {
    name: "The Atrium (Pan Pacific)",
    cuisine: ["International", "Continental"],
    description: "Hotel dining and international buffet at Pan Pacific / Atrium — often listed among top hotel restaurants.",
    rating: 4.6,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Hotel Dining", "Buffet"],
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80",
    address: { area: "Central Dhaka", city: "Dhaka", fullAddress: "Pan Pacific / Nearby central Dhaka hotel location" },
    location: { type: "Point", coordinates: [90.4000, 23.7500] },
    dietary: [],
    contact: { phone: null },
    tags: ["Hotel", "Buffet", "International"]
  },
  {
    name: "Sultans Dine",
    cuisine: ["Bangladeshi", "Biryani"],
    description: "Popular chain for kacchi biryani and traditional Bangladeshi dishes with multiple branches.",
    rating: 4.0,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳",
    status: "Open",
    badges: ["Biryani", "Traditional"],
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan / Dhanmondi", city: "Dhaka", fullAddress: "Multiple branches across Dhaka" },
    location: { type: "Point", coordinates: [90.4120, 23.8105] },
    dietary: ["Halal"],
    contact: { phone: null },
    tags: ["Biryani", "Kacchi"]
  },
  {
    name: "Amaya (Fine Dining)",
    cuisine: ["Fine Dining", "Contemporary"],
    description: "Fine dining option frequently mentioned in Dhaka's premium restaurant lists (reservations recommended).",
    rating: 4.5,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Fine Dining", "Premium"],
    image: "https://images.unsplash.com/photo-1550966871-3ed3c47e7421?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan", city: "Dhaka", fullAddress: "Gulshan / Banani upscale area (check exact address)" },
    location: { type: "Point", coordinates: [90.4140, 23.8122] },
    dietary: [],
    contact: { phone: null },
    tags: ["Fine Dining", "Seafood"]
  },
  {
    name: "Saltz (Cafe & Bistro)",
    cuisine: ["Cafe", "Continental"],
    description: "Popular cafe / bistro in Dhaka serving continental breakfasts, brunch and coffee.",
    rating: 4.2,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Cafe", "Brunch"],
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
    address: { area: "Dhanmondi / Gulshan", city: "Dhaka", fullAddress: "Dhanmondi / Gulshan area (check exact branch)" },
    location: { type: "Point", coordinates: [90.4100, 23.8050] },
    dietary: [],
    contact: { phone: null },
    tags: ["Cafe", "Coffee", "Brunch"]
  },
  {
    name: "The Pudding Shop",
    cuisine: ["Cafe", "Dessert"],
    description: "Popular dessert & café spot known for puddings, waffles and sweet treats.",
    rating: 4.1,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳",
    status: "Open",
    badges: ["Desserts", "Cafe"],
    image: "https://images.unsplash.com/photo-1517427294546-5aa1216389f8?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan / Banani", city: "Dhaka", fullAddress: "Gulshan / Banani area (check exact address)" },
    location: { type: "Point", coordinates: [90.4145, 23.8110] },
    dietary: [],
    contact: { phone: null },
    tags: ["Desserts", "Cafe"]
  },
  {
    name: "Spice & Rice (Dhaka)",
    cuisine: ["Indian", "Bangladeshi"],
    description: "Well-reviewed spot for Indian and Bengali curries and rice dishes.",
    rating: 4.0,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳",
    status: "Open",
    badges: ["Indian", "Traditional"],
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
    address: { area: "Dhanmondi", city: "Dhaka", fullAddress: "Dhanmondi area (check exact address)" },
    location: { type: "Point", coordinates: [90.4030, 23.7460] },
    dietary: ["Halal"],
    contact: { phone: null },
    tags: ["Curry", "Rice", "Family"]
  },
  {
    name: "North End Coffee Roasters",
    cuisine: ["Cafe", "Coffee"],
    description: "Local specialty coffee roaster & cafe chain in Dhaka, popular among coffee enthusiasts.",
    rating: 4.3,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳",
    status: "Open",
    badges: ["Coffee", "Cafe"],
    image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan / Banani", city: "Dhaka", fullAddress: "Gulshan / Banani branches" },
    location: { type: "Point", coordinates: [90.4132, 23.8116] },
    dietary: [],
    contact: { phone: null },
    tags: ["Coffee", "Roastery", "Brunch"]
  },
  {
    name: "Black & White (Steak / Grill)",
    cuisine: ["Steakhouse", "Grill"],
    description: "Popular grill/steakhouse option in Dhaka with premium cuts and an upscale ambience.",
    rating: 4.2,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Steak", "Grill"],
    image: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=800&q=80",
    address: { area: "Banani", city: "Dhaka", fullAddress: "Banani area (check exact address)" },
    location: { type: "Point", coordinates: [90.4150, 23.8130] },
    dietary: [],
    contact: { phone: null },
    tags: ["Steak", "Premium"]
  },
  {
    name: "The Green Lounge (Hotel / Cafe)",
    cuisine: ["International", "Cafe"],
    description: "Relaxed lounge / cafe at upscale hotels; popular for casual dining and afternoons.",
    rating: 4.4,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Hotel", "Cafe"],
    image: "https://images.unsplash.com/photo-1551632436-cbf8dd354ca8?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan / Mirpur", city: "Dhaka", fullAddress: "Hotel lounge locations in Dhaka" },
    location: { type: "Point", coordinates: [90.4060, 23.7560] },
    dietary: [],
    contact: { phone: null },
    tags: ["Lounge", "Hotel", "Relaxed"]
  },
  {
    name: "Saffron (Bangladeshi / Indian)",
    cuisine: ["Bangladeshi", "Indian"],
    description: "Known for traditional curries and grilled items, featured in several Dhaka listings.",
    rating: 4.1,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Traditional", "Curry"],
    image: "https://images.unsplash.com/photo-1548943487-a2e4e43b485c?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan / Dhanmondi", city: "Dhaka", fullAddress: "Gulshan / Dhanmondi (check exact branch)" },
    location: { type: "Point", coordinates: [90.4121, 23.8109] },
    dietary: ["Halal"],
    contact: { phone: null },
    tags: ["Curry", "Family"]
  },
  {
    name: "Cafe Social (InterContinental branch)",
    cuisine: ["Cafe", "European"],
    description: "Cafe-style dining at InterContinental / hotel properties offering European dishes and coffee.",
    rating: 4.9,
    totalReviews: 600,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Cafe", "Hotel"],
    image: "https://images.unsplash.com/photo-1463797221720-6b07e6426c24?auto=format&fit=crop&w=800&q=80",
    address: { area: "Panthapath", city: "Dhaka", fullAddress: "InterContinental Dhaka / Cafe Social" },
    location: { type: "Point", coordinates: [90.3998, 23.7525] },
    dietary: [],
    contact: { phone: null },
    tags: ["Cafe", "European", "Hotel"]
  },
  {
    name: "The Garden Kitchen (Sheraton Dhaka)",
    cuisine: ["International", "Buffet"],
    description: "Buffet and international dining at Sheraton Dhaka — popular for breakfast & dinner buffets.",
    rating: 4.9,
    totalReviews: 770,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Buffet", "Hotel"],
    image: "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=800&q=80",
    address: { area: "Sheraton Dhaka Hotel", city: "Dhaka", fullAddress: "Sheraton Dhaka Hotel & Convention Center" },
    location: { type: "Point", coordinates: [90.4085, 23.7640] },
    dietary: [],
    contact: { phone: null },
    tags: ["Buffet", "Hotel", "International"]
  },
  {
    name: "Grill & Chops",
    cuisine: ["Steakhouse", "Continental"],
    description: "Upscale steak & chops restaurant recommended in Dhaka's fine-dining lists.",
    rating: 4.4,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳৳",
    status: "Open",
    badges: ["Steak", "Fine Dining"],
    image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan / Banani", city: "Dhaka", fullAddress: "Gulshan / Banani area (check exact branch)" },
    location: { type: "Point", coordinates: [90.4129, 23.8113] },
    dietary: [],
    contact: { phone: null },
    tags: ["Steak", "Premium"]
  },
  {
    name: "Cafe Mango",
    cuisine: ["Cafe", "Dessert", "Brunch"],
    description: "Local café serving breakfasts, all-day brunch and desserts — popular in Dhaka's casual lists.",
    rating: 4.0,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳",
    status: "Open",
    badges: ["Cafe", "Brunch"],
    image: "https://images.unsplash.com/photo-1533089862017-5614ecb352dd?auto=format&fit=crop&w=800&q=80",
    address: { area: "Dhanmondi / Gulshan", city: "Dhaka", fullAddress: "Gulshan / Dhanmondi (check exact branch)" },
    location: { type: "Point", coordinates: [90.4138, 23.8111] },
    dietary: [],
    contact: { phone: null },
    tags: ["Cafe", "Breakfast", "Desserts"]
  },
  {
    name: "La Vista (Rooftop Bar)",
    cuisine: ["Bar", "Continental"],
    description: "Rooftop bar/restaurant for skyline views and evening dining.",
    rating: 4.2,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Rooftop", "Bar"],
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan", city: "Dhaka", fullAddress: "Gulshan rooftop locations (check exact venue)" },
    location: { type: "Point", coordinates: [90.4137, 23.8114] },
    dietary: [],
    contact: { phone: null },
    tags: ["Rooftop", "Bar", "Views"]
  },
  {
    name: "Chili's (Dhaka branch)",
    cuisine: ["American", "Tex-Mex"],
    description: "International casual dining chain (American/Tex-Mex) — some branches operate in Dhaka via franchise/food-courts.",
    rating: 4.0,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Casual", "Tex-Mex"],
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    address: { area: "Banani / Gulshan", city: "Dhaka", fullAddress: "Check local branch details" },
    location: { type: "Point", coordinates: [90.4126, 23.8110] },
    dietary: [],
    contact: { phone: null },
    tags: ["Tex-Mex", "Casual"]
  },
  {
    name: "Bengal Spice",
    cuisine: ["Indian", "Bangladeshi"],
    description: "Recommended for rich curries, tandoor and traditional dishes — present in several 'best of' lists.",
    rating: 4.1,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Tandoor", "Curries"],
    image: "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=80",
    address: { area: "Gulshan / Dhanmondi", city: "Dhaka", fullAddress: "Gulshan / Dhanmondi area (check exact branch)" },
    location: { type: "Point", coordinates: [90.4123, 23.8114] },
    dietary: ["Halal"],
    contact: { phone: null },
    tags: ["Tandoor", "Curry"]
  },
  {
    name: "Tea House",
    cuisine: ["Cafe", "Tea"],
    description: "Local tea house / cafe chain beloved for teas, light meals and casual hangouts.",
    rating: 4.0,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳",
    status: "Open",
    badges: ["Cafe", "Tea"],
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
    address: { area: "Multiple", city: "Dhaka", fullAddress: "Multiple branches across Dhaka" },
    location: { type: "Point", coordinates: [90.4120, 23.8100] },
    dietary: [],
    contact: { phone: null },
    tags: ["Tea", "Cafe", "Casual"]
  },
  {
    name: "Bistro Eclat",
    cuisine: ["Bistro", "Continental"],
    description: "Neighborhood bistro offering continental plates and casual dining, commonly recommended in city guides.",
    rating: 4.1,
    totalReviews: null,
    deliveryTime: null,
    deliveryFee: null,
    minimumOrder: null,
    priceRange: "৳৳",
    status: "Open",
    badges: ["Bistro", "Casual"],
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
    address: { area: "Banani", city: "Dhaka", fullAddress: "Banani area (check exact address)" },
    location: { type: "Point", coordinates: [90.4148, 23.8131] },
    dietary: [],
    contact: { phone: null },
    tags: ["Bistro", "Brunch"]
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

    // Add default values for null fields
    const restaurantsWithDefaults = restaurants.map(r => ({
      ...r,
      deliveryFee: r.deliveryFee ?? 50,
      deliveryTime: r.deliveryTime ?? 35,
      minimumOrder: r.minimumOrder ?? 250
    }));

    // Insert restaurants
    const insertedRestaurants = await Restaurant.insertMany(restaurantsWithDefaults);
    console.log(`✓ Created ${insertedRestaurants.length} restaurants`);

    // Create sample menu items for each restaurant
    const menuItems = [];
    for (const restaurant of insertedRestaurants) {
      // Add 3-5 sample menu items per restaurant
      const itemCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < itemCount; i++) {
        menuItems.push({
          restaurant: restaurant._id,
          name: `${restaurant.name} Special ${i + 1}`,
          description: `Delicious specialty dish from ${restaurant.name}`,
          price: 150 + Math.floor(Math.random() * 500),
          category: ['Mains', 'Starters', 'Desserts', 'Beverages'][Math.floor(Math.random() * 4)],
          image: restaurant.image,
          dietary: restaurant.dietary || [],
          available: true
        });
      }
    }

    const createdMenuItems = await MenuItem.insertMany(menuItems);
    console.log(`✓ Created ${createdMenuItems.length} menu items`);

    console.log('\n✅ Database seeding completed successfully!');
    console.log(`📊 Summary: ${insertedRestaurants.length} restaurants, ${createdMenuItems.length} menu items`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedDatabase();
