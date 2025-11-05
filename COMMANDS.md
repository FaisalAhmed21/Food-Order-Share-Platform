<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- <title>MERN Stack Setup Guide</title>
  <style>
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      line-height: 1.6;
      background-color: #f9f9f9;
      color: #333;
      margin: 40px;
    }
    code, pre {
      background-color: #272822;
      color: #f8f8f2;
      padding: 10px;
      border-radius: 6px;
      display: block;
      white-space: pre-wrap;
      font-family: Consolas, monospace;
    }
    h1, h2, h3 {
      color: #222;
    }
    h3.red {
      color: red;
    }
    .tip {
      background-color: #fff3cd;
      border-left: 5px solid #ffcc00;
      padding: 10px;
      margin-top: 20px;
    }
  </style> -->
</head>
<body>

  <h1>🚀 MERN Stack Setup Guide</h1>
  <p>This guide walks you through setting up a basic <strong>MERN (MongoDB, Express, React, Node.js)</strong> project structure.</p>

  <hr>

  <h2>🧩 Prerequisites</h2>
  <p>Make sure you have <strong>Node.js</strong> and <strong>npm</strong> installed.</p>

  <h3>Check Node.js and npm versions:</h3>
  <pre><code>node -v
npm -v</code></pre>

  <hr>

  <h2>⚙️ Step 1: Install React App Package Globally</h2>
  <pre><code>npm install create-react-app --global</code></pre>

  <hr>

  <h2>📁 Step 2: Setup Project Structure</h2>
  <p>Create a main <strong>project folder</strong> and two subfolders inside it:</p>
  <pre><code>project-folder/
│
├── backend/
└── frontend/</code></pre>

  <hr>

  <h2>🖥️ Step 3: Setup Backend</h2>
  <p>Navigate to the backend folder:</p>
  <pre><code>cd project-folder/backend</code></pre>

  <p>Initialize Node.js:</p>
  <pre><code>npm init -y</code></pre>

  <p>Install dependencies:</p>
  <pre><code>npm install express
npm install mongoose</code></pre>

  <hr>

  <h2>💻 Step 4: Setup Frontend</h2>
  <p>Navigate to the frontend folder:</p>
  <pre><code>cd ../frontend</code></pre>

  <p>Create a React app inside the frontend directory:</p>
  <pre><code>npx create-react-app .</code></pre>

  <hr>

  <h3 class="red">You Can Either Run Frontend and Backend Separately</h3>
  <h3 class="red">Or Run Both Frontend and Backend Together</h3>

  <hr>

  <h2>🔄 Step 5: Run Frontend and Backend Separately</h2>

  <h3>Run Frontend:</h3>
  <pre><code>cd project-folder/frontend
npm start</code></pre>

  <h3>Run Backend:</h3>
  <pre><code>cd project-folder/backend
npm start</code></pre>

  <hr>

  <h2>⚡ Step 6: Run Both Frontend and Backend Together</h2>
  <p>Navigate to the main project folder:</p>
  <pre><code>cd project-folder</code></pre>

  <p>Initialize Node.js:</p>
  <pre><code>npm init -y</code></pre>

  <p>Install <strong>concurrently</strong> to run both servers together:</p>
  <pre><code>npm install concurrently</code></pre>

  <p>Add the following script to your <strong>package.json</strong> in the main project folder:</p>
  <pre><code>{
  "scripts": {
    "frontend": "cd frontend && npm start",
    "backend": "cd backend && npm start",
    "dev": "concurrently \"npm run backend\" \"npm run frontend\""
  }
}</code></pre>

  <p>Now, run both servers with:</p>
  <pre><code>npm run dev</code></pre>

  <hr>

  <h2>✅ You’re All Set!</h2>
  <p>Your MERN project structure is ready.  
  You can now start building your full-stack application with <strong>MongoDB</strong>, <strong>Express</strong>, <strong>React</strong>, and <strong>Node.js</strong>.</p>

  <div class="tip">
    <strong>🧠 Tip:</strong> If you face any permission or port issues, try running commands with <code>sudo</code> (Mac/Linux) or as Administrator (Windows).
  </div>

</body>
</html>
