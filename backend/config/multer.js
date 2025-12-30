const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Force local storage for now (Cloudinary credentials invalid)
// Set USE_CLOUDINARY=true in .env when Cloudinary is properly configured
const useCloudinary = process.env.USE_CLOUDINARY === 'true' && 
                      process.env.CLOUDINARY_CLOUD_NAME && 
                      process.env.CLOUDINARY_API_KEY && 
                      process.env.CLOUDINARY_API_SECRET &&
                      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

let storage;

if (useCloudinary) {
  // Cloudinary storage (if configured)
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('./cloudinary');
  
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      let folder = 'food-ordering';
      if (file.fieldname === 'profilePicture') {
        folder = 'food-ordering/profiles';
      } else if (file.fieldname === 'image') {
        folder = 'food-ordering/menu-items';
      } else if (file.fieldname === 'restaurantImage') {
        folder = 'food-ordering/restaurants';
      } else if (file.fieldname === 'photos') {
        folder = 'food-ordering/donations';
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = file.fieldname + '-' + uniqueSuffix;

      return {
        folder: folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        public_id: filename,
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' }
        ]
      };
    }
  });
  console.log('✅ Using Cloudinary storage for uploads');
} else {
  // Local disk storage (fallback)
  console.log('⚠️ Cloudinary not configured, using local storage');
  
  const uploadDir = path.join(__dirname, '../uploads');
  
  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      let subFolder = 'general';
      if (file.fieldname === 'profilePicture') {
        subFolder = 'profiles';
      } else if (file.fieldname === 'image') {
        // Check the route to determine if it's restaurant or menu item
        if (req.path && (req.path.includes('/restaurants') && !req.path.includes('/menu'))) {
          subFolder = 'restaurants';
        } else {
          subFolder = 'menu-items';
        }
      } else if (file.fieldname === 'restaurantImage') {
        subFolder = 'restaurants';
      } else if (file.fieldname === 'photos') {
        subFolder = 'donations';
      } else if (file.fieldname === 'campaignBanner') {
        subFolder = 'campaigns';
      } else if (file.fieldname === 'documents' || file.fieldname === 'verificationDocuments' || file.fieldname === 'licensePDF') {
        subFolder = 'partners/docs';
      } else if (file.fieldname === 'restaurantLogo' || file.fieldname === 'ngoLogo') {
        subFolder = 'partners/logos';
      }
      
      const destPath = path.join(uploadDir, subFolder);
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      
      cb(null, destPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

// File filter for image uploads only
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed.'), false);
  }
};

// File filter that accepts both images and PDFs
const fileFilterWithPDF = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.'), false);
  }
};

// Create multer upload instance with Cloudinary storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for images
  }
});

// Create multer upload instance that accepts PDFs too
const uploadWithPDF = multer({
  storage: storage,
  fileFilter: fileFilterWithPDF,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
module.exports.uploadWithPDF = uploadWithPDF;