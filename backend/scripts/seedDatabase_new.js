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

    // Create realistic menu items for each restaurant
    const restaurantMenus = {
      "Holey Artisan Bakery": [
        { name: "Croissant", price: 120, category: "Breakfast", description: "Fresh butter croissant", isVeg: true },
        { name: "Pain au Chocolat", price: 140, category: "Breakfast", description: "Chocolate filled pastry", isVeg: true },
        { name: "Artisan Sourdough", price: 350, category: "Breakfast", description: "Freshly baked sourdough loaf", isVeg: true },
        { name: "Quiche Lorraine", price: 280, category: "Mains", description: "Classic French quiche", isVeg: false },
        { name: "Almond Tart", price: 180, category: "Desserts", description: "Sweet almond pastry", isVeg: true }
      ],
      "Star Kabab & Restaurant": [
        { name: "Beef Kabab", price: 320, category: "Mains", description: "Grilled beef kabab with spices", isVeg: false },
        { name: "Chicken Tikka", price: 280, category: "Mains", description: "Marinated chicken tikka", isVeg: false },
        { name: "Mutton Biryani", price: 450, category: "Biryani", description: "Aromatic mutton biryani", isVeg: false },
        { name: "Sheek Kabab", price: 350, category: "Mains", description: "Minced meat kabab", isVeg: false },
        { name: "Chicken Roast", price: 380, category: "Mains", description: "Traditional Bengali chicken roast", isVeg: false }
      ],
      "Nando's (Dhaka)": [
        { name: "Peri-Peri Chicken Quarter", price: 450, category: "Chicken", description: "Flame-grilled with peri-peri sauce", isVeg: false },
        { name: "Peri-Peri Chicken Half", price: 750, category: "Chicken", description: "Half chicken with peri-peri", isVeg: false },
        { name: "Chicken Wrap", price: 380, category: "Mains", description: "Grilled chicken wrap", isVeg: false },
        { name: "Peri-Peri Chips", price: 180, category: "Sides", description: "Fries with peri-peri seasoning", isVeg: true },
        { name: "Chicken Burger", price: 420, category: "Burgers", description: "Flame-grilled chicken burger", isVeg: false }
      ],
      "The Bhoj Company": [
        { name: "Butter Chicken", price: 580, category: "Mains", description: "Creamy tomato-based chicken curry", isVeg: false },
        { name: "Paneer Tikka Masala", price: 480, category: "Mains", description: "Cottage cheese in spiced gravy", isVeg: true },
        { name: "Lamb Rogan Josh", price: 680, category: "Mains", description: "Kashmiri lamb curry", isVeg: false },
        { name: "Garlic Naan", price: 120, category: "Sides", description: "Garlic-infused naan bread", isVeg: true },
        { name: "Biryani", price: 550, category: "Mains", description: "Fragrant basmati rice with spices", isVeg: false }
      ],
      "Prego (The Westin Dhaka)": [
        { name: "Spaghetti Carbonara", price: 1200, category: "Mains", description: "Classic Italian carbonara", isVeg: false },
        { name: "Margherita Pizza", price: 1100, category: "Pizza", description: "Fresh mozzarella and basil", isVeg: true },
        { name: "Risotto ai Funghi", price: 1350, category: "Mains", description: "Mushroom risotto", isVeg: true },
        { name: "Osso Buco", price: 1800, category: "Mains", description: "Braised veal shanks", isVeg: false },
        { name: "Tiramisu", price: 650, category: "Desserts", description: "Classic Italian dessert", isVeg: true }
      ],
      "Seasonal Tastes (InterContinental Dhaka)": [
        { name: "Grilled Salmon", price: 1650, category: "Seafood", description: "Fresh Atlantic salmon", isVeg: false },
        { name: "Beef Tenderloin", price: 1850, category: "Mains", description: "Premium beef tenderloin", isVeg: false },
        { name: "Lobster Thermidor", price: 2200, category: "Seafood", description: "Luxurious lobster dish", isVeg: false },
        { name: "Caesar Salad", price: 750, category: "Salads", description: "Classic Caesar with parmesan", isVeg: false },
        { name: "Crème Brûlée", price: 550, category: "Desserts", description: "Caramelized custard", isVeg: true }
      ],
      "Grill On The Sky (Rooftop)": [
        { name: "Wagyu Steak", price: 2500, category: "Mains", description: "Japanese Wagyu beef", isVeg: false },
        { name: "Grilled Prawns", price: 1450, category: "Seafood", description: "Jumbo prawns", isVeg: false },
        { name: "BBQ Ribs", price: 1350, category: "BBQ", description: "Slow-cooked pork ribs", isVeg: false },
        { name: "Grilled Vegetables", price: 680, category: "Vegetarian", description: "Seasonal grilled vegetables", isVeg: true },
        { name: "Chocolate Lava Cake", price: 580, category: "Desserts", description: "Warm chocolate cake", isVeg: true }
      ],
      "Cilantro (Dhaka)": [
        { name: "Tom Yum Soup", price: 450, category: "Thai", description: "Spicy Thai soup", isVeg: false },
        { name: "Pad Thai", price: 580, category: "Thai", description: "Stir-fried rice noodles", isVeg: false },
        { name: "Green Curry", price: 650, category: "Thai", description: "Coconut-based green curry", isVeg: false },
        { name: "Spring Rolls", price: 320, category: "Starters", description: "Fresh vegetable spring rolls", isVeg: true },
        { name: "Mango Sticky Rice", price: 380, category: "Desserts", description: "Sweet Thai dessert", isVeg: true }
      ],
      "Sear (Dhaka Steakhouse)": [
        { name: "Ribeye Steak", price: 1850, category: "Mains", description: "USDA Prime ribeye", isVeg: false },
        { name: "T-Bone Steak", price: 2100, category: "Mains", description: "Premium T-bone cut", isVeg: false },
        { name: "Grilled Lobster Tail", price: 2400, category: "Seafood", description: "Fresh lobster tail", isVeg: false },
        { name: "Truffle Fries", price: 480, category: "Sides", description: "Fries with truffle oil", isVeg: true },
        { name: "New York Cheesecake", price: 520, category: "Desserts", description: "Classic cheesecake", isVeg: true }
      ],
      "The Atrium (Pan Pacific)": [
        { name: "Club Sandwich", price: 650, category: "Mains", description: "Triple-decker club sandwich", isVeg: false },
        { name: "Greek Salad", price: 550, category: "Salads", description: "Fresh Mediterranean salad", isVeg: true },
        { name: "Fish and Chips", price: 780, category: "Mains", description: "Battered fish with fries", isVeg: false },
        { name: "Mushroom Soup", price: 380, category: "Soups", description: "Creamy mushroom soup", isVeg: true },
        { name: "Apple Pie", price: 420, category: "Desserts", description: "Warm apple pie", isVeg: true }
      ],
      "Sultans Dine": [
        { name: "Kacchi Biryani", price: 480, category: "Biryani", description: "Traditional mutton kacchi", isVeg: false },
        { name: "Beef Rezala", price: 520, category: "Mains", description: "Creamy beef curry", isVeg: false },
        { name: "Chicken Korma", price: 450, category: "Mains", description: "Rich chicken korma", isVeg: false },
        { name: "Shahi Paratha", price: 80, category: "Sides", description: "Layered flatbread", isVeg: true },
        { name: "Firni", price: 180, category: "Desserts", description: "Rice pudding", isVeg: true }
      ],
      "Amaya (Fine Dining)": [
        { name: "Tandoori Chicken", price: 620, category: "Mains", description: "Clay oven chicken", isVeg: false },
        { name: "Dal Makhani", price: 420, category: "Mains", description: "Creamy black lentils", isVeg: true },
        { name: "Chicken Tikka", price: 580, category: "Mains", description: "Spiced grilled chicken", isVeg: false },
        { name: "Paneer Butter Masala", price: 480, category: "Mains", description: "Cottage cheese in butter sauce", isVeg: true },
        { name: "Gulab Jamun", price: 220, category: "Desserts", description: "Sweet fried dumplings", isVeg: true }
      ],
      "Saltz (Cafe & Bistro)": [
        { name: "Beef Burger", price: 750, category: "Burgers", description: "Premium beef patty burger", isVeg: false },
        { name: "Grilled Chicken Salad", price: 680, category: "Salads", description: "Healthy chicken salad", isVeg: false },
        { name: "Fish Tacos", price: 720, category: "Mains", description: "Baja-style fish tacos", isVeg: false },
        { name: "Nachos Supreme", price: 580, category: "Starters", description: "Loaded nachos", isVeg: false },
        { name: "Brownie Sundae", price: 480, category: "Desserts", description: "Chocolate brownie with ice cream", isVeg: true }
      ],
      "The Pudding Shop": [
        { name: "Turkish Kebab Platter", price: 850, category: "Mains", description: "Mixed kebab platter", isVeg: false },
        { name: "Lamb Kofta", price: 680, category: "Mains", description: "Spiced lamb meatballs", isVeg: false },
        { name: "Hummus Platter", price: 420, category: "Starters", description: "Hummus with pita", isVeg: true },
        { name: "Turkish Pizza", price: 580, category: "Mains", description: "Lahmacun", isVeg: false },
        { name: "Baklava", price: 280, category: "Desserts", description: "Sweet pastry with nuts", isVeg: true }
      ],
      "Spice & Rice (Dhaka)": [
        { name: "Thai Red Curry", price: 620, category: "Thai", description: "Spicy red curry", isVeg: false },
        { name: "Nasi Goreng", price: 550, category: "Mains", description: "Indonesian fried rice", isVeg: false },
        { name: "Beef Rendang", price: 780, category: "Mains", description: "Slow-cooked beef curry", isVeg: false },
        { name: "Vegetable Tempura", price: 480, category: "Japanese", description: "Crispy vegetable tempura", isVeg: true },
        { name: "Coconut Ice Cream", price: 320, category: "Desserts", description: "Creamy coconut ice cream", isVeg: true }
      ],
      "North End Coffee Roasters": [
        { name: "Espresso", price: 180, category: "Beverages", description: "Strong espresso shot", isVeg: true },
        { name: "Cappuccino", price: 250, category: "Beverages", description: "Italian cappuccino", isVeg: true },
        { name: "Iced Latte", price: 280, category: "Beverages", description: "Cold milk coffee", isVeg: true },
        { name: "Blueberry Muffin", price: 220, category: "Breakfast", description: "Fresh baked muffin", isVeg: true },
        { name: "Avocado Toast", price: 380, category: "Breakfast", description: "Sourdough with avocado", isVeg: true }
      ],
      "Black & White (Steak / Grill)": [
        { name: "Flat White", price: 280, category: "Beverages", description: "Australian style coffee", isVeg: true },
        { name: "Cold Brew", price: 320, category: "Beverages", description: "Smooth cold brew", isVeg: true },
        { name: "Chocolate Cake", price: 420, category: "Desserts", description: "Rich chocolate cake", isVeg: true },
        { name: "Eggs Benedict", price: 580, category: "Breakfast", description: "Poached eggs with hollandaise", isVeg: false },
        { name: "Granola Bowl", price: 450, category: "Breakfast", description: "Yogurt and granola", isVeg: true }
      ],
      "The Green Lounge (Hotel / Cafe)": [
        { name: "Quinoa Salad", price: 520, category: "Salads", description: "Healthy quinoa bowl", isVeg: true },
        { name: "Grilled Tofu", price: 480, category: "Vegetarian", description: "Marinated tofu steak", isVeg: true },
        { name: "Green Smoothie", price: 380, category: "Beverages", description: "Spinach and fruit smoothie", isVeg: true },
        { name: "Veggie Burger", price: 550, category: "Burgers", description: "Plant-based burger", isVeg: true },
        { name: "Chia Pudding", price: 320, category: "Desserts", description: "Chia seeds with coconut", isVeg: true }
      ],
      "Saffron (Bangladeshi / Indian)": [
        { name: "Chicken Biryani", price: 480, category: "Mains", description: "Hyderabadi style biryani", isVeg: false },
        { name: "Lamb Curry", price: 680, category: "Mains", description: "Spicy lamb curry", isVeg: false },
        { name: "Palak Paneer", price: 420, category: "Mains", description: "Spinach with cottage cheese", isVeg: true },
        { name: "Butter Naan", price: 80, category: "Sides", description: "Soft butter naan", isVeg: true },
        { name: "Rasmalai", price: 250, category: "Desserts", description: "Sweet cheese dessert", isVeg: true }
      ],
      "Cafe Social (InterContinental branch)": [
        { name: "Beef Stroganoff", price: 780, category: "Mains", description: "Russian beef dish", isVeg: false },
        { name: "Chicken Quesadilla", price: 620, category: "Mains", description: "Grilled chicken quesadilla", isVeg: false },
        { name: "Caesar Wrap", price: 520, category: "Mains", description: "Chicken Caesar wrap", isVeg: false },
        { name: "Sweet Potato Fries", price: 350, category: "Sides", description: "Crispy sweet potato fries", isVeg: true },
        { name: "Red Velvet Cake", price: 480, category: "Desserts", description: "Classic red velvet", isVeg: true }
      ],
      "The Garden Kitchen (Sheraton Dhaka)": [
        { name: "Seafood Paella", price: 1650, category: "Mains", description: "Traditional Spanish paella", isVeg: false },
        { name: "Grilled Sea Bass", price: 1450, category: "Seafood", description: "Mediterranean sea bass", isVeg: false },
        { name: "Lamb Chops", price: 1750, category: "Mains", description: "Herb-crusted lamb", isVeg: false },
        { name: "Garden Salad", price: 650, category: "Salads", description: "Fresh mixed greens", isVeg: true },
        { name: "Panna Cotta", price: 520, category: "Desserts", description: "Italian cream dessert", isVeg: true }
      ],
      "Grill & Chops": [
        { name: "Sirloin Steak", price: 1450, category: "Mains", description: "Prime sirloin cut", isVeg: false },
        { name: "Pork Chops", price: 1280, category: "Mains", description: "Grilled pork chops", isVeg: false },
        { name: "BBQ Chicken", price: 980, category: "BBQ", description: "Barbecue chicken", isVeg: false },
        { name: "Coleslaw", price: 280, category: "Sides", description: "Creamy coleslaw", isVeg: true },
        { name: "Apple Crumble", price: 420, category: "Desserts", description: "Warm apple crumble", isVeg: true }
      ],
      "Cafe Mango": [
        { name: "Mango Smoothie", price: 350, category: "Beverages", description: "Fresh mango smoothie", isVeg: true },
        { name: "Chicken Pasta", price: 620, category: "Mains", description: "Creamy chicken pasta", isVeg: false },
        { name: "Beef Nachos", price: 580, category: "Starters", description: "Nachos with beef", isVeg: false },
        { name: "Mango Cheesecake", price: 480, category: "Desserts", description: "Tropical cheesecake", isVeg: true },
        { name: "Thai Salad", price: 450, category: "Salads", description: "Asian-inspired salad", isVeg: true }
      ],
      "La Vista (Rooftop Bar)": [
        { name: "Beef Lasagna", price: 780, category: "Mains", description: "Layered pasta with beef", isVeg: false },
        { name: "Chicken Alfredo", price: 720, category: "Mains", description: "Creamy alfredo pasta", isVeg: false },
        { name: "Pepperoni Pizza", price: 850, category: "Pizza", description: "Classic pepperoni", isVeg: false },
        { name: "Caprese Salad", price: 520, category: "Salads", description: "Tomato mozzarella salad", isVeg: true },
        { name: "Gelato", price: 380, category: "Desserts", description: "Italian ice cream", isVeg: true }
      ],
      "Chili's (Dhaka branch)": [
        { name: "Baby Back Ribs", price: 1280, category: "BBQ", description: "Famous baby back ribs", isVeg: false },
        { name: "Southwestern Egg Rolls", price: 580, category: "Starters", description: "Tex-Mex egg rolls", isVeg: false },
        { name: "Classic Burger", price: 720, category: "Burgers", description: "Chili's signature burger", isVeg: false },
        { name: "Loaded Potato Skins", price: 520, category: "Starters", description: "Potato skins with toppings", isVeg: false },
        { name: "Molten Chocolate Cake", price: 550, category: "Desserts", description: "Warm chocolate cake", isVeg: true }
      ],
      "Bengal Spice": [
        { name: "Hilsa Curry", price: 850, category: "Mains", description: "Traditional hilsa fish curry", isVeg: false },
        { name: "Shorshe Ilish", price: 880, category: "Mains", description: "Hilsa in mustard sauce", isVeg: false },
        { name: "Chingri Malai Curry", price: 780, category: "Mains", description: "Prawn coconut curry", isVeg: false },
        { name: "Begun Bhaja", price: 180, category: "Mains", description: "Fried eggplant", isVeg: true },
        { name: "Mishti Doi", price: 120, category: "Desserts", description: "Sweet yogurt", isVeg: true }
      ],
      "Tea House": [
        { name: "English Breakfast Tea", price: 180, category: "Beverages", description: "Classic black tea", isVeg: true },
        { name: "Green Tea", price: 200, category: "Beverages", description: "Japanese green tea", isVeg: true },
        { name: "Masala Chai", price: 150, category: "Beverages", description: "Spiced Indian tea", isVeg: true },
        { name: "Scones with Cream", price: 320, category: "Breakfast", description: "Traditional scones", isVeg: true },
        { name: "Tea Cake", price: 280, category: "Breakfast", description: "Lemon tea cake", isVeg: true }
      ],
      "Bistro Eclat": [
        { name: "French Onion Soup", price: 450, category: "Mains", description: "Classic French soup", isVeg: false },
        { name: "Beef Bourguignon", price: 1250, category: "Mains", description: "French beef stew", isVeg: false },
        { name: "Coq au Vin", price: 1180, category: "Mains", description: "Chicken in wine sauce", isVeg: false },
        { name: "Ratatouille", price: 680, category: "Mains", description: "Vegetable stew", isVeg: true },
        { name: "Crêpes Suzette", price: 520, category: "Desserts", description: "Flambéed crêpes", isVeg: true }
      ]
    };
    
    const menuItems = [];
    for (const restaurant of insertedRestaurants) {
      const menuData = restaurantMenus[restaurant.name] || [];
      
      for (const item of menuData) {
        menuItems.push({
          restaurant: restaurant._id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image: restaurant.image,
          dietary: [],
          available: true,
          isVegetarian: item.isVeg,
          spiceLevel: item.category.includes('Indian') || item.category.includes('Thai') || item.category.includes('Bengali') ? 2 : 0
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
