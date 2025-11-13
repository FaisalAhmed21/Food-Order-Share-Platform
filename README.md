# Frontend Components:

## Home Page (Home.js & Home.css)
- Beautiful landing page with hero section
- Feature cards highlighting platform benefits
- Navigation to signup page
- Responsive design with animations

## Signup Page (Signup.js & Signup.css)
- Email and password registration form
- Form validation (email format, password matching, min 6 chars)
- Error and success messages
- Loading state while registering
- Beautiful, responsive design

## Routing (Updated App.js)
- React Router setup for navigation between Home and Signup pages

# Backend Components:

## User Model (User.js)
- Email validation with uniqueness constraint
- Password hashing using bcryptjs
- Password comparison method for authentication

## Auth Route (auth.js)
- POST `/api/auth/register` endpoint
- Input validation
- User creation with password hashing
- Duplicate email checking

## Updated Server (index.js)
- MongoDB connection setup
- CORS middleware for frontend communication
- Express middleware for JSON parsing
- Routes mounted on `/api/auth`

# How to Run:

## Terminal 1 - Backend:
```bash
cd "e:\CSE470 Project\backend"
npm start
```
(Runs on http://localhost:5000)

## Terminal 2 - Frontend:
```bash
cd "e:\CSE470 Project\frontend"
npm start
```
(Runs on http://localhost:3000)

## **Note:** Make sure MongoDB is running on your system or update the MONGODB_URI in your backend .env file.

The app now has a complete user registration flow with email validation and secure password handling!

# New Features Added:

## Frontend:

### Login Component (Login.js)
- Email and password login form
- Input validation
- JWT token storage in localStorage
- Error and success messages
- Loading state during login

### Login Styling (Login.css)
- Consistent design matching signup page
- Responsive and mobile-friendly

### Updated Navigation
- Home page now has both "Log In" and "Sign Up" buttons
- Signup page footer links to Login
- Login page footer links to Signup

### Updated Routing (App.js)
- Added `/login` route

## Backend:

### Login Endpoint (`/api/auth/login`)
- Email and password validation
- Password verification using bcrypt
- JWT token generation

### JWT Authentication
- Tokens valid for 7 days
- Tokens stored in localStorage on successful login
- User data saved alongside token

# User Flow:
1. Home → Sign Up → Create Account → Auto redirect to Home
2. Home → Log In → Login with credentials → Auto redirect to Home
3. Users can switch between Login and Signup pages

# To Test:
1. Start backend: `npm start` in the backend folder (runs on http://localhost:5000)
2. Start frontend: `npm start` in the frontend folder (runs on http://localhost:3000)
3. Create a new account or log in with existing credentials

All authentication tokens are now stored locally for session management!
