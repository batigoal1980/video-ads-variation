// index.js

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files from the React app
app.use(express.static(path.join(__dirname, '../video-ads-uploader/build')));

// API routes can be defined here
// Example: app.use('/api', require('./routes/api'));

// Catch-all handler to serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../video-ads-uploader/build/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
