const http = require('http');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path'); // Required for path manipulation

// Connecting to the MongoDB database
mongoose.connect('mongodb://localhost:27017/')
  .then(function() {
    console.log('DB Connected');
  })
  .catch(function(err) {
    console.error('DB Connection Error:', err);
  });

// Defining the structure of MongoDB document
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String // Assuming you'll need a password field for signup
});

// Create collection model
const UserModel = mongoose.model('users', userSchema);

const server = http.createServer(function(req, res) {
  // Serve the signup.html page
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream('signup.html').pipe(res);
  } 
  // Handle POST request to /signup
  else if (req.url === '/signup' && req.method === 'POST') {
    let rawdata = '';
    req.on('data', function(data) {
      rawdata += data;
    });
    req.on('end', function() {
      const formdata = new URLSearchParams(rawdata);
      const userData = {
        name: formdata.get('name'),
        email: formdata.get('email'),
        phone: formdata.get('phone'),
        password: formdata.get('password') // Capture password from signup form
      };

      UserModel.create(userData)
        .then(function() {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.write('Signed Up Successfully');
          res.end();
        })
        .catch(function(err) {
          console.error('Error saving data:', err);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.write('Error Saving Data');
          res.end();
        });
    });
  } 
  // Serve static files (CSS and JS)
  else if (req.url.startsWith('/css/') || req.url.startsWith('/js/')) {
    const filePath = path.join(__dirname, req.url); // Create the full path to the requested file
    fs.readFile(filePath, function(err, data) {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.write('404 Not Found');
        res.end();
      } else {
        const ext = path.extname(filePath);
        let contentType = 'text/plain';
        if (ext === '.css') {
          contentType = 'text/css';
        } else if (ext === '.js') {
          contentType = 'application/javascript';
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  } 
  // Handle 404 Not Found
  else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.write('404 Not Found');
    res.end();
  }
});

server.listen(8000, function() {
  console.log('Server started at http://localhost:8000/');
});
