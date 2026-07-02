const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration for Vercel
app.use(cors({
    origin: [
        'https://monesave-6039hl.flutterflow.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
}));

app.use(express.json());

// Routes
const personroute = require('./routes/person');
const homeroute = require('./routes/home');
const ringroute = require('./routes/ring');
const emailroute = require('./routes/email');
const cardroute = require('./routes/card');
const tollroute = require('./routes/toll');
const voiceroute = require('./routes/voice');

app.use('/', homeroute);
app.use('/person', personroute);
app.use('/ring', ringroute);
app.use('/email', emailroute);
app.use('/card', cardroute);
app.use('/toll', tollroute);
app.use('/voice', voiceroute);


// For Vercel serverless functions
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, function () {
        console.log('Server is running on port ' + PORT);
    });
}
// Cron endpoint 
const sendProfilesReport = require('./utilis/scheduledReport');
app.get('/api/cron/daily-report', async (req, res) => {
    // Verify the request is from Vercel Cron using the secret
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        await sendProfilesReport();
        res.status(200).json({ message: 'Daily report sent successfully' });
    } catch (err) {
        console.error('Cron report failed:', err.message);
        res.status(500).json({ error: 'Report failed', details: err.message });
    }
});
// Export for Vercel
module.exports = app;