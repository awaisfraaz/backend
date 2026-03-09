const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 465,
  auth: {
    user: 'apikey', // This is literally the word "apikey"
    pass: process.env.SENDGRID_API_KEY // Your actual API key
  }
});

module.exports = transporter;