const cloudinary = require('../config/cloudinary');
const path = require('path');

async function testCloudinaryUpload() {
  try {
    console.log('🧪 Testing Cloudinary Integration...\n');
    
    // Test 1: Check configuration
    console.log('1️⃣ Checking Cloudinary Configuration:');
    console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials missing in .env file');
    }
    
    console.log('\n2️⃣ Testing Cloudinary API Connection:');
    
    // Test API connection by getting account details
    const result = await cloudinary.api.ping();
    console.log('   ✅ Cloudinary API is accessible');
    console.log('   Response:', result);
    
    console.log('\n✅ Cloudinary Integration Test Passed!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Test image upload via Postman');
    console.log('   2. Use POST /api/restaurants/owner/restaurants with form-data');
    console.log('   3. Include an image file in the "image" field');
    console.log('   4. Check Cloudinary dashboard for uploaded image\n');
    
  } catch (error) {
    console.error('\n❌ Cloudinary Test Failed:');
    console.error('   Error:', error?.message || error);
    console.error('   Full Error:', error);
    
    if (error?.message?.includes('credentials') || error?.http_code === 401) {
      console.error('\n💡 Solution:');
      console.error('   1. Sign up at https://cloudinary.com/users/register/free');
      console.error('   2. Get credentials from Dashboard → Settings → Account');
      console.error('   3. Add to backend/.env:');
      console.error('      CLOUDINARY_CLOUD_NAME=your_cloud_name');
      console.error('      CLOUDINARY_API_KEY=your_api_key');
      console.error('      CLOUDINARY_API_SECRET=your_api_secret');
    }
    
    process.exit(1);
  }
}

testCloudinaryUpload();
