const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration for Vercel
app.use(cors({
    origin: '*', // Change this to your frontend URL in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// Routes
const personroute = require('./routes/person');
const homeroute = require('./routes/home');
const ringroute = require('./routes/ring');
const emailroute = require('./routes/email');

app.use('/', homeroute);
app.use('/person', personroute);
app.use('/ring', ringroute);
app.use('/email', emailroute);

// For Vercel serverless functions
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, function() {
        console.log('Server is running on port ' + PORT);
    });
}

// Export for Vercel
module.exports = app;