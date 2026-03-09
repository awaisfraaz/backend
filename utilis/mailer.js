const nodemailer = require('nodemailer');
require('dotenv').config();

// Validate environment variable
if (!process.env.SENDGRID_API_KEY) {
  console.error('ERROR: SENDGRID_API_KEY is not set in environment variables');
}

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: 'apikey', // This is literally the word "apikey"
    pass: process.env.SENDGRID_API_KEY // Your actual API key
  }
});

module.exports = transporter;