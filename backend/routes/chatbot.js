const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { auth } = require('../middleware/auth');

// Initialize Gemini AI with new SDK
console.log('🤖 Initializing Gemini AI (New SDK)...');
console.log('API Key present:', !!process.env.GEMINI_API_KEY);
console.log('API Key starts with:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET');

let geminiClient = null;
try {
  if (process.env.GEMINI_API_KEY) {
    // New SDK initialization - pass API key in config
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
    console.log('✅ Gemini AI initialized with new SDK (will try to use, fallback available)');
  } else {
    console.log('⚠️  No API key, will use fallback chatbot');
  }
} catch (error) {
  console.log('⚠️  Gemini initialization failed, will use fallback chatbot:', error.message);
}

// System prompt for FoodShare context
const SYSTEM_CONTEXT = `You are FoodShare AI Assistant, a helpful chatbot for the FoodShare platform - a food ordering and donation system. 

About FoodShare:
- Users can order food from restaurants
- Users can donate surplus food to NGOs
- Volunteers help deliver food
- Restaurants can list their menu items
- NGOs can receive food donations
- The platform supports campaigns for food donation

Your role:
- Help users with questions about ordering food, donating food, or using the platform
- Provide friendly, concise, and helpful responses
- If asked about technical issues, guide users to contact support
- Always maintain a warm, helpful tone
- Keep responses brief and to the point (2-3 sentences unless more detail is needed)

Important: You should NOT provide information about:
- User's personal data or account details
- Payment information
- Order tracking (direct them to the "My Orders" page)
- Specific restaurant menus (direct them to browse restaurants)

You CAN help with:
- How to use the platform features
- General questions about food ordering
- How to donate food
- How to become a volunteer
- Platform navigation guidance
- General food-related questions`;

// Advanced AI-like chatbot with natural language understanding
function getFallbackResponse(message, conversationHistory = []) {
  const originalMessage = message.trim();
  const lowerMessage = message.toLowerCase().trim();
  
  // Build conversation context
  let context = '';
  if (conversationHistory.length > 0) {
    const lastMessages = conversationHistory.slice(-2);
    context = lastMessages.map(m => `${m.role}: ${m.content}`).join('\n');
  }
  
  // Analyze message intent and entities
  const analysis = analyzeMessage(lowerMessage);
  
  // Generate response based on intent
  return generateResponse(analysis, originalMessage, lowerMessage, context);
}

// Analyze message to understand intent and extract entities
function analyzeMessage(message) {
  const analysis = {
    intent: 'unknown',
    entities: {
      food: [],
      cuisine: [],
      meal: null,
      weather: null,
      sentiment: 'neutral'
    },
    isQuestion: false,
    isGreeting: false,
    isAffirmation: false,
    isNegation: false
  };
  
  // Detect question
  const questionWords = ['what', 'how', 'when', 'where', 'why', 'which', 'who', 'can', 'could', 'should', 'would', 'do', 'does', 'is', 'are', 'will'];
  analysis.isQuestion = message.includes('?') || questionWords.some(q => message.startsWith(q + ' '));
  
  // Detect greeting
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'];
  analysis.isGreeting = greetings.some(g => message.includes(g));
  
  // Detect affirmation/negation
  const affirmations = ['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'alright', 'definitely'];
  const negations = ['no', 'nope', 'not', 'never', 'don\'t', 'cant', 'won\'t'];
  analysis.isAffirmation = affirmations.some(a => message.split(' ').includes(a));
  analysis.isNegation = negations.some(n => message.includes(n));
  
  // Detect sentiment
  const positive = ['good', 'great', 'awesome', 'excellent', 'love', 'like', 'enjoy', 'delicious', 'tasty'];
  const negative = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'disgusting', 'horrible'];
  if (positive.some(p => message.includes(p))) analysis.entities.sentiment = 'positive';
  if (negative.some(n => message.includes(n))) analysis.entities.sentiment = 'negative';
  
  // Detect intent (order matters - more specific first)
  if (analysis.isGreeting) {
    analysis.intent = 'greeting';
  } else if (message.includes('thank') || message.includes('thanks')) {
    analysis.intent = 'gratitude';
  } else if (message.includes('who are you') || message.includes('what are you') || message.includes('your name')) {
    analysis.intent = 'bot_identity';
  } else if (message.includes('how are you') || message.includes('how r u')) {
    analysis.intent = 'bot_wellbeing';
  } else if (message.includes('joke') || message.includes('funny')) {
    analysis.intent = 'entertainment';
  } else if (message.includes('help') || message.includes('what can you do')) {
    analysis.intent = 'help_info';
  } else if (message.includes('how') && message.includes('order')) {
    analysis.intent = 'how_to_order';
  } else if (message.includes('donate') || message.includes('donation')) {
    analysis.intent = 'donation_info';
  } else if (message.includes('volunteer')) {
    analysis.intent = 'volunteer_info';
  } else if (message.includes('track') || message.includes('order status') || message.includes('where is my')) {
    analysis.intent = 'tracking_info';
  } else if (message.includes('payment') || message.includes('pay')) {
    analysis.intent = 'payment_info';
  } else if (message.includes('price') || message.includes('cost') || message.includes('expensive') || message.includes('cheap') || message.includes('budget')) {
    analysis.intent = 'pricing_info';
  } else if (message.includes('delivery') || message.includes('how long') || message.includes('how fast')) {
    analysis.intent = 'delivery_info';
  } else if ((message.includes('what') || message.includes('suggest') || message.includes('recommend')) && 
             (message.includes('eat') || message.includes('food') || message.includes('meal'))) {
    analysis.intent = 'food_suggestion';
  } else if (message.includes('hungry') || message.includes('starving') || message.includes('craving')) {
    analysis.intent = 'hunger';
  } else if (message.includes('healthy') || message.includes('diet') || message.includes('fitness') || message.includes('nutrition')) {
    analysis.intent = 'healthy_food';
  } else if (message.includes('dessert') || message.includes('sweet') || message.includes('cake') || message.includes('ice cream')) {
    analysis.intent = 'dessert';
  } else if (message.includes('spicy') || message.includes('hot') && message.includes('food')) {
    analysis.intent = 'spicy_food';
  } else if (message.includes('vegetarian') || message.includes('vegan') || message.includes('halal')) {
    analysis.intent = 'dietary_restrictions';
  } else if (analysis.isQuestion && (message.includes('food') || message.includes('eat') || message.includes('meal'))) {
    analysis.intent = 'food_question';
  }
  
  // Extract entities
  const cuisines = ['italian', 'chinese', 'indian', 'mexican', 'japanese', 'thai', 'american', 'french'];
  analysis.entities.cuisine = cuisines.filter(c => message.includes(c));
  
  const meals = ['breakfast', 'lunch', 'dinner', 'snack', 'brunch'];
  analysis.entities.meal = meals.find(m => message.includes(m));
  
  const weather = ['hot', 'cold', 'rainy', 'rain', 'winter', 'summer'];
  analysis.entities.weather = weather.find(w => message.includes(w));
  
  return analysis;
}

// Generate natural, conversational response
function generateResponse(analysis, originalMessage, lowerMessage, context) {
  // Handle based on intent
  switch (analysis.intent) {
    case 'greeting':
      const greetings = [
        "Hello! 👋 I'm your FoodShare assistant. I'm here to help you discover great food, order meals, or learn about our platform. What can I help you with today?",
        "Hi there! 😊 Welcome to FoodShare! I can help you find delicious food, place orders, or answer any questions you have. What are you interested in?",
        "Hey! 🍽️ Great to see you! Whether you're looking for food recommendations or want to know about our services, I'm here to help. What's on your mind?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    
    case 'food_suggestion':
      const suggestions = [
        "Based on what's popular, I'd recommend trying some biryani - it's always a crowd favorite! Or if you're in the mood for something different, pizza and Chinese food are great options too. What sounds good to you?",
        "How about some delicious burgers? They're satisfying and quick. If you want something healthier, we have great salad options. Or maybe some comfort food like fried chicken? Let me know your preference!",
        "I'd suggest checking out our Chinese restaurants - fried rice and noodles are always a hit! Alternatively, if you're really hungry, a good biryani platter could be perfect. What type of food do you usually enjoy?",
        "Feeling adventurous? Thai food has amazing flavors! Or if you prefer something familiar, you can never go wrong with a good pizza or pasta. What are you in the mood for?",
        "Let me think... How about some grilled items? Kebabs, tikka, or BBQ are always delicious! Or if you want something lighter, fresh salads with grilled protein are great. What do you think?"
      ];
      return suggestions[Math.floor(Math.random() * suggestions.length)];
    
    case 'how_to_order':
      return "Ordering on FoodShare is simple! Here's how:\n\n1. Click on '🍔 Order Food' to browse restaurants\n2. Choose your favorite restaurant and select dishes\n3. Add items to your cart\n4. Go to checkout and enter your delivery address\n5. Choose your payment method and confirm\n\nYou can track your order in real-time from the 'My Orders' section. Need help with anything specific?";
    
    case 'donation_info':
      return "That's wonderful that you're interested in helping others! FoodShare offers two ways to donate:\n\n1. **Donate Surplus Food**: If you're a restaurant or have extra food, you can donate it directly to NGOs\n2. **Order + Donate**: When ordering for yourself, you can also donate a meal to someone in need\n\nEvery donation makes a real difference. Would you like to know more about either option?";
    
    case 'volunteer_info':
      return "Becoming a volunteer is a great way to give back! As a FoodShare volunteer, you'll help deliver food orders and donations to those who need them. You'll be making a real impact in your community.\n\nTo get started, register with the 'Volunteer' role. Once approved, you can start accepting delivery assignments. Interested in signing up?";
    
    case 'pricing_info':
      return "Food prices on FoodShare vary by restaurant and dish. Generally:\n\n• Budget-friendly meals: ৳100-250\n• Mid-range options: ৳300-600\n• Premium dishes: ৳700+\n\nMany restaurants also offer combo deals and discounts! You can see exact prices when browsing each restaurant's menu. Looking for something specific in your budget?";
    
    case 'delivery_info':
      return "Delivery times depend on the restaurant and your location. Typically:\n\n• Fast food: 20-30 minutes\n• Regular restaurants: 30-45 minutes\n• During peak hours: 45-60 minutes\n\nYou'll see the estimated delivery time for each restaurant before ordering, and you can track your order in real-time once it's placed. Planning to order soon?";
    
    case 'gratitude':
      const thanks = [
        "You're very welcome! 😊 I'm happy to help. If you have any other questions about food or FoodShare, feel free to ask anytime!",
        "My pleasure! 🌟 That's what I'm here for. Need anything else?",
        "Glad I could help! 😊 Don't hesitate to reach out if you have more questions!"
      ];
      return thanks[Math.floor(Math.random() * thanks.length)];
    
    case 'bot_identity':
      return "I'm FoodShare Assistant, an AI helper designed to make your food ordering experience better! I can help you find great food, answer questions about our platform, and guide you through ordering or donating. Think of me as your personal food advisor. How can I assist you today?";
    
    case 'bot_wellbeing':
      const wellbeingResponses = [
        "I'm doing great, thanks for asking! 😊 I'm always excited to help people discover delicious food. What can I help you with today?",
        "I'm fantastic! Ready to help you find something amazing to eat. How about you - are you hungry? 🍽️",
        "I'm wonderful, thank you! 🌟 Always happy when I can help someone with food. What are you in the mood for?"
      ];
      return wellbeingResponses[Math.floor(Math.random() * wellbeingResponses.length)];
    
    case 'entertainment':
      const jokes = [
        "Why did the tomato turn red? 🍅\n\nBecause it saw the salad dressing! 😄\n\nNow, speaking of salads, are you hungry?",
        "What do you call cheese that isn't yours? 🧀\n\nNacho cheese! 😂\n\nWant to order some real nachos from FoodShare?",
        "Why don't eggs tell jokes? 🥚\n\nThey'd crack each other up! 😆\n\nHow about ordering some eggs for breakfast?"
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    
    case 'help_info':
      return "I'm here to help you with everything food-related! 🍽️\n\nI can assist with:\n• Food recommendations (what to eat, when to eat it)\n• Seasonal and weather-based suggestions\n• Ordering food on FoodShare\n• Donating food to help others\n• Becoming a volunteer\n• Payment, tracking, and delivery info\n\nWhat would you like to know more about?";
    
    case 'tracking_info':
      return "You can easily track your orders on FoodShare! 📍\n\n1. Go to the 'My Orders' section\n2. Click on any order to see real-time tracking\n3. View the delivery progress on the map\n4. Get notifications at each stage\n\nYou can also track donations in the 'My Donations' section. Need help finding something specific?";
    
    case 'payment_info':
      return "FoodShare accepts multiple payment methods for your convenience! 💳\n\n• Credit/Debit Cards (via Stripe)\n• bKash\n• Nagad\n• Rocket\n• Cash on Delivery\n\nAll payments are secure and encrypted. Which payment method would you prefer?";
    
    case 'hunger':
      const hungerResponses = [
        "Sounds like you need some good food right now! 🍽️ Let me help you find something delicious. Are you in the mood for something quick like fast food, or a proper meal?",
        "Time to satisfy that hunger! 😋 What are you craving - something light and healthy, or comfort food that really hits the spot?",
        "Let's get you fed! 🍔 Browse our restaurants on FoodShare - we have everything from quick snacks to full meals. What sounds good?"
      ];
      return hungerResponses[Math.floor(Math.random() * hungerResponses.length)];
    
    case 'healthy_food':
      return "Great choice to eat healthy! 🥗\n\nHealthy options on FoodShare:\n• Fresh salads with grilled protein\n• Grilled chicken or fish\n• Vegetarian and vegan dishes\n• Smoothies and fresh juices\n• Low-carb meals\n• Whole grain options\n\nYou can filter restaurants by dietary preferences. What type of healthy meal are you looking for?";
    
    case 'dessert':
      const desserts = [
        "Sweet tooth calling? 🍰 We have amazing dessert options:\n• Ice cream and frozen treats 🍦\n• Cakes and pastries\n• Traditional sweets\n• Chocolate desserts 🍫\n• Fresh fruit desserts\n\nWhat kind of sweet treat are you craving?",
        "Time for something sweet! 🍮 Whether you want ice cream, cake, or traditional desserts, FoodShare has you covered. What's your favorite type of dessert?"
      ];
      return desserts[Math.floor(Math.random() * desserts.length)];
    
    case 'spicy_food':
      return "Love the heat! 🌶️🔥\n\nSpicy options to try:\n• Spicy biryani\n• Hot wings and kebabs\n• Spicy noodles and fried rice\n• Chili chicken\n• Spicy curries\n• Hot and sour soup\n\nBrowse FoodShare for restaurants with spicy options. How spicy do you like it?";
    
    case 'dietary_restrictions':
      return "We respect all dietary preferences! 🌱\n\nFoodShare offers:\n• Vegetarian options (no meat)\n• Vegan options (no animal products)\n• Halal certified restaurants\n• Gluten-free options\n• Dairy-free alternatives\n\nYou can filter restaurants by your dietary needs. What are you looking for specifically?";
    
    case 'food_question':
      if (analysis.entities.cuisine.length > 0) {
        const cuisine = analysis.entities.cuisine[0];
        return `Great choice! ${cuisine.charAt(0).toUpperCase() + cuisine.slice(1)} food is delicious. You can find ${cuisine} restaurants on FoodShare with a variety of authentic dishes. Would you like me to suggest some popular ${cuisine} dishes?`;
      }
      if (analysis.entities.meal) {
        const meal = analysis.entities.meal;
        return `For ${meal}, I'd recommend browsing our restaurants that specialize in ${meal} items. You'll find everything from quick bites to full meals. What type of cuisine are you in the mood for?`;
      }
      if (analysis.entities.weather) {
        const weather = analysis.entities.weather;
        if (weather.includes('rain') || weather === 'rainy') {
          return "Rainy weather calls for comfort food! Hot pakoras, soup, or a warm bowl of noodles would be perfect. Or maybe some hot pizza or biryani to enjoy indoors? What sounds appealing?";
        }
        if (weather === 'hot' || weather === 'summer') {
          return "On a hot day, I'd suggest something light and refreshing - maybe a fresh salad, cold beverages, or some light grilled items. Ice cream for dessert is always a good idea too! What are you craving?";
        }
        if (weather === 'cold' || weather === 'winter') {
          return "Cold weather is perfect for warm, hearty meals! Hot soup, biryani, grilled items, or comfort food like burgers would hit the spot. What type of warm food sounds good to you?";
        }
      }
      return "I'd be happy to help you find something delicious! Could you tell me more about what you're in the mood for? Any specific cuisine, dietary preferences, or type of meal you're thinking about?";
    
    default:
      // Try to give a contextual response even for unknown intents
      if (analysis.isAffirmation) {
        return "Great! What would you like to know more about? I can help with food suggestions, ordering, donations, or any questions about FoodShare.";
      }
      if (analysis.isNegation && analysis.entities.sentiment === 'negative') {
        return "I understand. Is there something specific you'd like help with instead? I'm here to assist with food recommendations, ordering, or any FoodShare features.";
      }
      if (lowerMessage.length < 15 && !analysis.isQuestion) {
        return "I'm here to help! Could you tell me a bit more about what you're looking for? Are you interested in ordering food, getting food suggestions, or learning about FoodShare features?";
      }
      
      // Try to extract any meaningful context from the message
      if (lowerMessage.includes('food') || lowerMessage.includes('eat')) {
        return "I'd love to help you with food! Are you looking for suggestions on what to eat, or do you want to order something specific? Let me know more about what you're craving!";
      }
      
      // Generic helpful response
      const helpfulResponses = [
        "I want to make sure I understand you correctly. Are you looking for food recommendations, help with ordering, or information about our platform? Let me know!",
        "I'm here to help! Could you tell me a bit more about what you need? I can assist with food suggestions, ordering, donations, or any FoodShare features.",
        "Hmm, I'm not quite sure I got that. Could you rephrase? I'm best at helping with food recommendations, ordering on FoodShare, or answering questions about our services."
      ];
      return helpfulResponses[Math.floor(Math.random() * helpfulResponses.length)];
  }
}

// Optional auth middleware - allows both authenticated and non-authenticated users
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    // If token exists, try to authenticate
    auth(req, res, (err) => {
      if (err) {
        // If auth fails, continue without user info
        req.user = null;
      }
      next();
    });
  } else {
    // No token, continue as guest
    req.user = null;
    next();
  }
};

// Chat endpoint - works for both logged-in and guest users
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Try Gemini AI first if configured (using new SDK)
    if (process.env.GEMINI_API_KEY && geminiClient) {
      try {
        console.log('📤 Sending request to Gemini API (New SDK)...');

        // Build conversation context with system prompt
        let fullPrompt = SYSTEM_CONTEXT + '\n\n';
        
        // Add conversation history (last 5 messages for context)
        const recentHistory = conversationHistory.slice(-5);
        recentHistory.forEach(msg => {
          fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
        
        fullPrompt += `User: ${message}\nAssistant:`;

        // Use new SDK API - correct format according to official docs
        const result = await Promise.race([
          geminiClient.models.generateContent({
            model: 'gemini-2.5-flash',  // Updated to correct model name
            contents: fullPrompt
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 15 seconds')), 15000))
        ]);
        
        console.log('📥 Received response from Gemini (New SDK)');
        console.log('Response object:', JSON.stringify(result, null, 2));
        
        // Extract text from new SDK response format
        // The new SDK returns response.text directly
        const reply = result.text || result.response?.text || 'No response text available';

        const userInfo = req.user ? req.user.email : 'Guest';
        console.log(`💬 Gemini - User: ${userInfo} | Message: ${message.substring(0, 50)}...`);
        console.log(`💬 Gemini Reply: ${reply.substring(0, 100)}...`);

        return res.json({
          success: true,
          reply: reply,
          timestamp: new Date(),
          source: 'gemini-new-sdk'
        });
      } catch (geminiError) {
        console.log('⚠️  Gemini failed, using fallback:', geminiError.message);
        console.log('Error type:', geminiError.constructor.name);
        console.log('Error stack:', geminiError.stack);
        // Fall through to fallback
      }
    }

    // Use fallback chatbot with conversation history for context
    console.log('🤖 Using fallback chatbot');
    const reply = getFallbackResponse(message, conversationHistory);
    
    const userInfo = req.user ? req.user.email : 'Guest';
    console.log(`💬 Fallback - User: ${userInfo} | Message: ${message.substring(0, 50)}...`);

    res.json({
      success: true,
      reply: reply,
      timestamp: new Date(),
      source: 'fallback'
    });

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Handle specific Gemini API errors
    if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
      console.error('🔑 API Key error detected');
      return res.status(500).json({
        success: false,
        message: 'Invalid API key configuration',
        reply: 'I apologize, but I am currently experiencing technical difficulties. Please try again later.',
        errorDetail: error.message
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      console.error('⚠️ Rate limit error detected');
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        reply: 'I apologize, but I am receiving too many requests right now. Please try again in a moment.',
        errorDetail: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get response from chatbot',
      reply: 'I apologize, but I am having trouble processing your request right now. Please try again in a moment.',
      error: error.message,
      errorDetail: error.toString()
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  const isConfigured = !!process.env.GEMINI_API_KEY;
  res.json({
    success: true,
    status: isConfigured ? 'configured' : 'not_configured',
    message: isConfigured 
      ? 'Chatbot is ready' 
      : 'Chatbot requires GEMINI_API_KEY in environment variables'
  });
});

module.exports = router;

