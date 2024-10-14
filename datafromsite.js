const http = require('http');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path'); // For handling file paths

// Connect to the MongoDB database
mongoose.connect('mongodb://localhost:27017/rentalDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('DB Connected');
    })
    .catch(err => {
        console.error('DB Connection Error:', err);
    });

// Defining the structure of the MongoDB document
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    password: String // Add password field for sign-up
});

// Create collection model 
const UserModel = mongoose.model('users', userSchema);

const server = http.createServer(function(req, res) {
    if (req.url === '/') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        fs.createReadStream('index.html').pipe(res); // Serve the main page
    } else if (req.url === '/signup' && req.method === 'POST') {
        let rawData = '';
        
        req.on('data', function(data) {
            rawData += data;
        });

        req.on('end', function() {
            const formData = new URLSearchParams(rawData);
            const newUser = new UserModel({
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: formData.get('password') // Get password from form data
            });

            newUser.save()
                .then(() => {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end('Data Saved Successfully');
                })
                .catch(err => {
                    console.error('Error saving data:', err);
                    res.writeHead(500, {'Content-Type': 'text/html'});
                    res.end('Error saving data');
                });
        });
    } else if (req.url === '/signin' && req.method === 'POST') {
        let rawData = '';

        req.on('data', function(data) {
            rawData += data;
        });

        req.on('end', function() {
            const formData = new URLSearchParams(rawData);
            const email = formData.get('email');
            const password = formData.get('password');

            // Find user in the database
            UserModel.findOne({ email: email, password: password })
                .then(user => {
                    if (user) {
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end('Welcome back, ' + user.name);
                    } else {
                        res.writeHead(401, {'Content-Type': 'text/html'});
                        res.end('Invalid credentials');
                    }
                })
                .catch(err => {
                    console.error('Error fetching user:', err);
                    res.writeHead(500, {'Content-Type': 'text/html'});
                    res.end('Error checking credentials');
                });
        });
    } else {
        // Serve static files (CSS, JS, images)
        const filePath = path.join(__dirname, req.url);
        fs.exists(filePath, (exists) => {
            if (exists) {
                res.writeHead(200, {'Content-Type': getContentType(req.url)});
                fs.createReadStream(filePath).pipe(res);
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('404 Not Found');
            }
        });
    }
});

// Function to determine content type
function getContentType(url) {
    const ext = path.extname(url);
    switch (ext) {
        case '.html': return 'text/html';
        case '.css': return 'text/css';
        case '.js': return 'application/javascript';
        case '.jpg': return 'image/jpeg';
        case '.png': return 'image/png';
        default: return 'text/plain';
    }
}

server.listen(8000, function() {
    console.log('Server started at http://localhost:8000');
});
