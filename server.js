  const http = require('http');
  const fs = require('fs');
  const path = require('path'); 
  const mongoose = require('mongoose');
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');

  const JWT_SECRET = 'your-secret-key'; // In production, use environment variable

  // Connect to MongoDB
  mongoose.connect('mongodb://localhost:27017/signupDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true
  })
  .then(() => {
      console.log('MongoDB connected successfully');
  })
  .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
  });

  // MongoDB connection error handling
  mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
  });

  // Define user schema
  const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      phone: { type: String, required: true },
      password: { type: String, required: true }
  });
  // Define rental schema
  const rentalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    rentPrice: { type: Number, required: true },
    days: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    rentedAt: { type: Date, default: Date.now }
  });

  const RentalModel = mongoose.model('rentals', rentalSchema);
  const UserModel = mongoose.model('users', userSchema);

  // Helper function to parse cookies
  function parseCookies(req) {
      const cookies = {};
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
          cookieHeader.split(';').forEach(cookie => {
              const parts = cookie.split('=');
              cookies[parts[0].trim()] = (parts[1] || '').trim();
          });
      }
      return cookies;
  }

  // Create the server
  const server = http.createServer(async function(req, res) {
      console.log(`${req.method} request to ${req.url}`);

      // Parse the URL to handle query parameters
      const urlParts = req.url.split('?');
      const baseUrl = urlParts[0];

      // Home route
      if (baseUrl === '/' || baseUrl === '/index') {
          serveFile('index.html', res);
      }
      
      // Signin route
      else if (baseUrl === '/signin') {
          if (req.method === 'GET') {
              serveFile('signin.html', res);
          } else if (req.method === 'POST') {
              let rawData = '';
              req.on('data', chunk => rawData += chunk);
              req.on('end', async () => {
                  try {
                      const formData = new URLSearchParams(rawData);
                      const email = formData.get('email');
                      const password = formData.get('password');

                      console.log('Login attempt for email:', email);

                      const user = await UserModel.findOne({ email: email });
                      console.log('User found:', user ? 'Yes' : 'No');

                      if (user && user.password === password) {
                          const token = jwt.sign(
                              { userId: user._id, email: user.email },
                              JWT_SECRET,
                              { expiresIn: '1h' }
                          );

                          res.writeHead(302, {
                              'Set-Cookie': `token=${token}; HttpOnly; Path=/`,
                              'Location': '/dashboard'
                          });
                          res.end();
                      } else {
                          res.writeHead(302, {
                              'Location': '/signin?error=invalid'
                          });
                          res.end();
                      }
                  } catch (err) {
                      console.error('Login error:', err);
                      res.writeHead(302, {
                          'Location': '/signin?error=server'
                      });
                      res.end();
                  }
              });
          }
      }

      // Signup route
      else if (baseUrl === '/signup') {
          if (req.method === 'GET') {
              serveFile('signup.html', res);
          } else if (req.method === 'POST') {
              let rawData = '';
              req.on('data', chunk => rawData += chunk);
              req.on('end', async () => {
                  try {
                      const formData = new URLSearchParams(rawData);
                      const userData = {
                          name: formData.get('name'),
                          email: formData.get('email'),
                          phone: formData.get('phone'),
                          password: formData.get('password')
                      };

                      await UserModel.create(userData);
                      console.log('User created successfully');
                      res.writeHead(302, {
                          'Location': '/signin?signup=success'
                      });
                      res.end();
                  } catch (err) {
                      console.error('Error saving data:', err);
                      res.writeHead(302, {
                          'Location': '/signup?error=' + (err.code === 11000 ? 'duplicate' : 'server')
                      });
                      res.end();
                  }
              });
          }
      }

      // Protected dashboard route
      else if (baseUrl === '/dashboard') {
          const cookies = parseCookies(req);
          if (cookies.token) {
              try {
                  const decoded = jwt.verify(cookies.token, JWT_SECRET);
                  serveFile('dashboard.html', res);
              } catch (err) {
                  console.error('Token verification failed:', err);
                  res.writeHead(302, {
                      'Location': '/signin?error=auth'
                  });
                  res.end();
              }
          } else {
              console.log('No token found, redirecting to signin');
              res.writeHead(302, {
                  'Location': '/signin?error=auth'
              });
              res.end();
          }
      }

      else if (baseUrl === '/api/users') {
        try {
            const users = await UserModel.find({}, { password: 0 }); // Exclude password from the response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(users));
        } catch (err) {
            console.error('Error fetching users:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      }
      

      // API route for user data
      else if (baseUrl === '/api/user-data') {
          const cookies = parseCookies(req);
          if (cookies.token) {
              try {
                  const decoded = jwt.verify(cookies.token, JWT_SECRET);
                  const user = await UserModel.findById(decoded.userId);
                  if (user) {
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({
                          name: user.name,
                          email: user.email
                      }));
                  } else {
                      res.writeHead(404, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ error: 'User not found' }));
                  }
              } catch (err) {
                  res.writeHead(401, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Invalid token' }));
              }
          } else {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'No token provided' }));
          }
      }

      // API route for renting a product
      else if (baseUrl === '/api/rent' && req.method === 'POST') {
        const cookies = parseCookies(req);
        if (cookies.token) {
            try {
                const decoded = jwt.verify(cookies.token, JWT_SECRET);
                const userId = decoded.userId;

                let rawData = '';
                req.on('data', chunk => rawData += chunk);
                req.on('end', async () => {
                    const rentData = JSON.parse(rawData);
                    const rental = new RentalModel({
                        userId: userId,
                        productName: rentData.productName,
                        rentPrice: rentData.rentPrice,
                        days: rentData.days,
                        totalAmount: rentData.totalAmount
                    });

                    await rental.save();
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Rental request successful' }));
                });
            } catch (err) {
                console.error('Token verification failed:', err);
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid token' }));
            }
        } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No token provided' }));
        }
      }



      // Logout route
      else if (baseUrl === '/logout') {
        if (req.method === 'POST') {
          // Clear the token cookie
          res.writeHead(200, {
              'Set-Cookie': 'token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
              'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({ success: true }));
      } else {
          // Redirect GET requests to signin
          res.writeHead(302, {
              'Location': '/signin'
          });
          res.end();
      }
    }

      // Other routes
      else if (baseUrl === '/products') {
          serveFile('products.html', res);
      } 
      else if (baseUrl === '/about') {
          serveFile('about.html', res);
      } 
      else if (baseUrl === '/help') {
          serveFile('help.html', res);
      }
      // Product details route
      else if (baseUrl === '/product-details') {
        serveFile('product-details.html', res);
      }
      else if (baseUrl === '/admin') {
        serveFile('admin.html', res);
      }


      // Handle static files
      else if (baseUrl.startsWith('/css/') || 
              baseUrl.startsWith('/js/') || 
              baseUrl.startsWith('/images/')) {
          serveStaticFile(baseUrl, res);
      }

      // 404 - Not Found
      else {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res. end('404 Not Found');
      }
  });

  // Function to serve HTML files
  function serveFile(fileName, res) {
      const filePath = path.join(__dirname, fileName);
      fs.readFile(filePath, function(err, data) {
          if (err) {
              res.writeHead(404, { 'Content-Type': 'text/html' });
              res.end('404 Not Found');
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