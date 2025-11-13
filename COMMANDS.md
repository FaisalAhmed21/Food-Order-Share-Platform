# 🚀 MERN Stack Setup Guide

This guide walks you through setting up a basic **MERN (MongoDB, Express, React, Node.js)** project structure.

## 🧩 Prerequisites
  <p>Initialize Node.js:</p>
  <pre><code>npm init -y</code></pre>

Make sure you have **Node.js** and **npm** installed.

### Check Node.js and npm versions:
```bash
node -v
npm -v
```
⚙️ Step 1: Install React App Package Globally
```bash
npm install create-react-app --global
```
📁 Step 2: Setup Project Structure

Create a main project folder and two subfolders inside it:
```bash
project-folder/
│
├── backend/
└── frontend/
```
🖥️ Step 3: Setup Backend

Navigate to the backend folder:
```bash
cd project-folder/backend
```

Initialize Node.js:
```bash
npm init -y
```

 Install dependencies:
```bash
npm install express
npm install mongoose
```
💻 Step 4: Setup Frontend

Navigate to the frontend folder:  
```bash
cd ../frontend
```
Create a React app inside the frontend directory:
```bash
npx create-react-app .
```

```diff
@@ 🔴 You Can Either Run Frontend and Backend Separately @@
@@ 🔴 Or Run Both Frontend and Backend Together @@

- So either do Step 5 or Step 6
```

🔄 Step 5: Run Frontend and Backend Separately

Run Frontend:
```bash
cd project-folder/frontend
npm start
```

Run Backend:
```bash
cd project-folder/backend
npm start
```
⚡ Step 6: Run Both Frontend and Backend Together

Install concurrently to run both servers together:
```bash
npm install concurrently
```
Navigate to the main project folder:
```bash
cd project-folder
```
Initialize Node.js:
```bash
npm init -y
```
Add the following script to your package.json in the main project folder:
```bash
"scripts": {
  "frontend": "cd frontend && npm start",
  "backend": "cd backend && npm start",
  "dev": "concurrently \"npm run backend\" \"npm run frontend\""
}
```

Now, run both servers with:

```bash
npm run dev
```
SO now, MERN project structure is ready.
