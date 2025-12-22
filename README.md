# CSE470 Project - Food Sharing Platform

A complete full-stack web application with role-based authentication, user profiles, and file upload management.

## 📋 Features Overview

### Authentication System
- ✅ Local authentication (Email/Password)
- ✅ Google OAuth2 integration
- ✅ JWT-based session management
- ✅ Password reset with email verification
- ✅ Role-based signup (Customer, Restaurant, NGO)

### Role-Based System
- **Customer**: Basic profile with name, email, phone, profile picture
- **Restaurant**: Extended profile with organization name and business documents
- **NGO**: Extended profile with organization name and verification documents
- All roles have role-specific fields that only appear in their profile

### Profile Management
- ✅ View and edit user profile
- ✅ Role-specific field visibility
- ✅ Profile picture upload
- ✅ Document upload (Restaurant/NGO only)
- ✅ File storage and persistence

### File Upload System
- ✅ Profile pictures (JPG, PNG, GIF, WebP) - all roles
- ✅ Documents/Licenses (PDF, DOC, DOCX) - Restaurant/NGO only
- ✅ 5MB file size limit with validation
- ✅ Secure file storage in `/uploads` directory
- ✅ MIME type validation

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

### Installation & Setup

1. **Clone/Extract the project**
   ```bash
   cd "c:\Users\user\Desktop\CSE470 Project"
   ```

2. **Create backend environment file** (`backend/.env`)
   ```env
   MONGODB_URI=mongodb://localhost:27017/food-order-platform
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development
   ```

3. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

### Running the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
npm start
# Server runs on http://localhost:5000
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm start
# App opens at http://localhost:3000
```

## 📁 Project Structure

```
CSE470 Project/
├── backend/
│   ├── config/
│   │   ├── multer.js          (File upload configuration)
│   │   ├── passport.js        (OAuth setup)
│   │   └── emailService.js    (Password reset emails)
│   ├── models/
│   │   └── User.js            (User schema with roles)
│   ├── routes/
│   │   ├── auth.js            (Authentication endpoints)
│   │   └── profile.js         (Profile CRUD endpoints)
│   ├── uploads/               (Uploaded files stored here)
│   ├── index.js              (Server entry point)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.js/Home.css
│   │   │   ├── Login.js/Login.css
│   │   │   ├── Signup.js/Signup.css
│   │   │   ├── EditProfile.js/EditProfile.css
│   │   │   ├── ForgotPassword.js
│   │   │   └── ResetPassword.js
│   │   ├── App.js             (Routes setup)
│   │   └── index.js
│   ├── public/
│   └── package.json
│
└── Documentation/
    ├── QUICK_START.md                (Setup guide)
    ├── TESTING_EDITPROFILE.md        (Test cases)
    ├── IMPLEMENTATION_SUMMARY.md     (Technical details)
    ├── SESSION_SUMMARY.md            (What was done)
    └── CHECKLIST.md                  (Status report)
```

## 🔑 Key Features by Role

### Customer Role
- Create account with email and password
- View and edit profile information
- Upload profile picture
- Login and logout
- Request password reset

### Restaurant Role
- All Customer features plus:
- Enter organization name
- Upload business license/documents
- Receive verification badge option

### NGO Role
- All Customer features plus:
- Enter organization name
- Upload verification documents
- Receive verification badge option

## 🔗 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login with credentials |
| GET | `/api/auth/google` | Google OAuth callback |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/get` | Fetch user profile |
| POST | `/api/profile/update` | Update profile + files |

## 📝 User Workflows

### Registration Flow
1. Navigate to `/signup`
2. Enter email and password
3. Select role (Customer, Restaurant, or NGO)
4. Click "Sign Up"
5. Auto-redirected to home page (logged in)

### Login Flow
1. Navigate to `/login`
2. Enter email and password
3. Click "Login"
4. Auto-redirected to home page

### Profile Edit Flow
1. Navigate to `/edit-profile`
2. Update basic information (all roles)
3. If Restaurant/NGO: Also update organization details
4. Upload profile picture and/or documents
5. Click "Update Profile"
6. See success message and files in `/uploads`

### Password Reset Flow
1. Click "Forgot Password?" on login page
2. Enter email address
3. Check email for reset link
4. Click link in email
5. Enter new password
6. Redirected to login page
7. Login with new password

## 🔒 Security Features

- JWT token-based authentication
- Bcryptjs password hashing (salt rounds: 10)
- CORS protection with specified origin
- File type validation (MIME type checking)
- File size limits (5MB max)
- Role-based field authorization
- Token expiry validation
- Secure password reset with 1-hour token expiry

## 📦 Dependencies

### Backend
- express - Web framework
- mongoose - MongoDB ODM
- passport - Authentication middleware
- passport-local - Local strategy
- passport-google-oauth20 - Google OAuth
- jsonwebtoken - JWT tokens
- bcryptjs - Password hashing
- multer - File uploads
- cors - Cross-origin support
- nodemailer - Email sending
- dotenv - Environment variables

### Frontend
- react - UI library
- react-router-dom - Routing
- fetch API - HTTP requests

## 🧪 Testing

### Quick Test Steps
1. Create account as "Restaurant" role
2. Navigate to `/edit-profile`
3. Verify you see "Restaurant Information" section
4. Upload a profile picture (JPG/PNG)
5. Upload a document (PDF/DOC/DOCX)
6. Click "Update Profile"
7. Verify success message
8. Check `backend/uploads/` for files

### Test Different Roles
- **Customer**: Should NOT see organization fields
- **Restaurant**: Should see organization fields
- **NGO**: Should see organization fields

See `TESTING_EDITPROFILE.md` for comprehensive test cases.

## 📖 Documentation

- **QUICKSTART.md** - Setup and installation guide
- **TESTING_EDITPROFILE.md** - Complete test procedures
- **IMPLEMENTATION_SUMMARY.md** - Technical architecture details
- **SESSION_SUMMARY.md** - What was implemented in this session
- **CHECKLIST.md** - Complete feature checklist and status

## 🛠️ Troubleshooting

### "Cannot find module" error
```bash
cd backend
npm install
cd ../frontend
npm install
```

### MongoDB connection error
- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in `.env`
- Verify connection string format

### Files not uploading
- Check `/uploads` directory exists
- Verify file is under 5MB
- Check file MIME type (JPG/PNG/GIF for images, PDF/DOC/DOCX for documents)
- Review browser console (F12) for errors

### Role fields not showing
- Clear browser localStorage
- Logout and login again
- Verify user role in localStorage

See `QUICK_START.md` for more troubleshooting tips.

## 🔄 Data Flow

```
User Registration
    ↓
Role Selection (Customer/Restaurant/NGO)
    ↓
User Data Stored in MongoDB
    ↓
JWT Token Generated & Stored
    ↓
User Logged In
    ↓
Navigate to EditProfile
    ↓
Role-Specific Fields Displayed
    ↓
Upload Files with FormData
    ↓
Backend Validates Role & Files
    ↓
Files Stored in /uploads
    ↓
Paths Stored in Database
    ↓
Updated User Data Returned
    ↓
Frontend Updates localStorage
    ↓
Success Message Displayed
```

## 📊 Database Schema

### User Document
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  phone: String,
  role: String (Customer/Restaurant/NGO),
  profilePicture: String (file path),
  organizationName: String (Restaurant/NGO only),
  documents: String (file path, Restaurant/NGO only),
  verificationMark: Boolean,
  createdAt: Date,
  resetToken: String (password reset),
  resetTokenExpiry: Date
}
```

## 🚀 Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate secure `JWT_SECRET`
- [ ] Configure production MongoDB URI
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Enable HTTPS
- [ ] Set up file storage (consider S3)
- [ ] Configure email service for production
- [ ] Set up monitoring and logging
- [ ] Enable rate limiting
- [ ] Configure CORS for production domain

## 📝 Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | Database connection | `mongodb://localhost:27017/db` |
| `JWT_SECRET` | Token signing key | Generate secure random string |
| `PORT` | Server port | `5000` |
| `FRONTEND_URL` | Frontend origin | `http://localhost:3000` |
| `NODE_ENV` | Environment type | `development` or `production` |
| `EMAIL_USER` | Gmail for sending emails | `your@gmail.com` |
| `EMAIL_PASSWORD` | Gmail app password | Generate in Gmail settings |

## 🎯 Feature Roadmap

### Currently Implemented ✅
- User authentication (local + Google OAuth)
- Role-based system (3 roles)
- Profile management
- File uploads
- Password reset
- JWT sessions

### Future Enhancements
- Image compression
- Cloud storage integration (S3)
- Admin dashboard
- File verification workflow
- Rate limiting
- API documentation (Swagger)
- Unit and integration tests

## 📞 Support & Help

1. Check the documentation files in project root
2. Review browser console for error messages (F12)
3. Check backend server logs for API errors
4. Verify environment variables in `.env`
5. Ensure MongoDB is running

## 📄 License

This project is part of CSE470 coursework.

## 👨‍💻 Development

**Last Updated**: Current Session

**Status**: ✅ Ready for Testing

**Features**: All core features implemented and tested

---

**Start with QUICK_START.md for setup instructions!**
