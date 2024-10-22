const http = require('http');
const fs = require('fs');
const path = require('path'); 
const mongoose = require('mongoose');

// Connect to MongoDB (without deprecated options)
mongoose.connect('mongodb://localhost:27017/signupDB')
  .then(function() {
    console.log('DB Connected');
  })
  .catch(function(err) {
    console.error('DB Connection Error:', err);
  });

// Define MongoDB schema for users
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true }
});

// Create collection model
const UserModel = mongoose.model('users', userSchema);

// Create the server
const server = http.createServer(function(req, res) {
  if (req.url === '/' || req.url === '/index') {
    serveFile('index.html', res);
  } else if (req.url === '/signin') {
    serveFile('signin.html', res);
  } else if (req.url === '/signup' && req.method === 'GET') {
    serveFile('signup.html', res);
  } else if (req.url === '/signup' && req.method === 'POST') {
    // Collect form data and store it in MongoDB
    let rawData = '';
    req.on('data', function(data) {
      rawData += data;
    });
    req.on('end', function() {
      const formData = new URLSearchParams(rawData);
      const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password')
      };

      UserModel.create(userData)
        .then(() => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.write('Data Saved Successfully');
          res.end();
        })
        .catch(err => {
          console.error('Error saving data:', err);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.write('Error Saving Data');
          res.end();
        });
    });
  } else if (req.url === '/products') {
    serveFile('products.html', res);
  } else if (req.url === '/product-details') {
    serveFile('product-details.html', res);
  } else if (req.url === '/about') {
    serveFile('about.html', res);
  } else if (req.url === '/help') {
    serveFile('help.html', res);
  }
    else if (req.url.startsWith('/css/') || req.url.startsWith('/js/') || req.url.startsWith('/images/')) {
    serveStaticFile(req.url, res);
  } else {
    // Handle 404 - Page not found
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.write('404 Not Found');
    res.end();
  }
});

// Function to serve HTML files
function serveFile(fileName, res) {
  const filePath = path.join(__dirname, fileName);
  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.write('404 Not Found');
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write(data);
      res.end();
    }
  });
}

// Function to serve static files (CSS, JS, Images)
function serveStaticFile(filePath, res) {
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  
  if (extname === '.css') {
    contentType = 'text/css';
  } else if (extname === '.js') {
    contentType = 'text/javascript';
  } else if (extname === '.jpg' || extname === '.jpeg') {
    contentType = 'image/jpeg';
  } else if (extname === '.png') {
    contentType = 'image/png';
  }

  const fullPath = path.join(__dirname, filePath);
  fs.readFile(fullPath, function(err, data) {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.write(data);
      res.end();
    }
  });
}

// Start the server on port 8000
server.listen(8000, function() {
  console.log('Server started at http://localhost:8000/');
});
