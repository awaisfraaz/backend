const express = require('express');
const router = express.Router();
const transporter = require('../utilis/mailer');

router.get('/', (req, res) => {
    res.send("Email API is working!");
});

router.post('/sendcustomemail', async (req, res) => {
    try {
        const { to, subject, htmlDesign } = req.body;


        if (!to || !subject) {
            return res.status(400).json({ error: "Missing required fields: to and subject" });
        }

    
        let emailHtml = htmlDesign;

        if (!htmlDesign) {
            emailHtml = `
               <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Congratulations 🎉 Your Ring Is Ready</title>
  </head>

  <body style="margin:0; padding:0; background-color:#F6F7FB;">
    <!-- Preheader (hidden preview text) -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      Your Orukka Ring has been ordered and delivery is in progress.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F6F7FB; padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <!-- Container -->
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
            style="width:100%; max-width:600px; background-color:#ffffff; border-radius:14px; overflow:hidden;">

            <!-- Top Accent Bar -->
            <tr>
              <td style="height:6px; background-color:#3EB489; line-height:6px; font-size:0;">&nbsp;</td>
            </tr>

            <!-- Header with Logo -->
            <tr>
              <td align="center" style="padding:22px 24px 10px 24px; background-color:#ffffff;">
                <img
                  src="https://storage.googleapis.com/flutterflow-prod-hosting/builds/rFBIK23NAahjNr7yevpq/monesave_app_icon_720.png"
                  alt="Orukka"
                  width="88"
                  style="display:block; border:0; outline:none; text-decoration:none; border-radius:18px;"
                />
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px; color:#6b7280; margin-top:10px;">
                  Orukka Ring • Account &amp; Support
                </div>
              </td>
            </tr>

            <!-- Hero -->
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:30px; font-weight:800; color:#111827;">
                  Congratulations 🎉 
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:14px 24px 0 24px;">
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:24px; color:#111827;">
                  Hi {{Customer First Name}},
                </div>

                <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:24px; color:#111827; margin-top:12px;">
                  Congratulations and welcome to <strong>Orukka</strong>! Your <strong>Orukka Ring</strong> has been successfully ordered and is on its way to your finger.
                </div>

                <!-- Highlight Box -->
                <div style="margin-top:16px; padding:14px 14px; border-radius:12px; background-color:#ECFDF5; border:1px solid #D1FAE5;">
                  <div style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:22px; color:#065F46; font-weight:700;">
                    What you can do now
                  </div>
                  <ul style="margin:10px 0 0 18px; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:22px; color:#065F46;">
                    <li style="margin-bottom:8px;">Make secure, contactless transactions</li>
                    <li style="margin-bottom:8px;">Track your activity through the Orukka app</li>
                    <li style="margin-bottom:0;">Enjoy fast and convenient payments, wherever Orukka is accepted</li>
                  </ul>
                </div>

                <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:24px; color:#111827; margin-top:16px;">
                No further action is required from you at this time. Once your ring arrives, you can start using it right away.
                </div>

                <!-- Optional CTA button -->
                <!--
                <div style="margin-top:18px;">
                  <a href="{{CTA Link}}" target="_blank"
                    style="display:inline-block; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:18px; font-weight:800;
                           text-decoration:none; padding:12px 16px; border-radius:10px; background-color:#3EB489; color:#ffffff;">
                    Open the Orukka App
                  </a>
                </div>
                -->

                <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:22px; color:#374151; margin-top:18px;">
                  If you need help getting started or have any questions, reach us anytime at
                  <a href="mailto:support@monesave.com" style="color:#3EB489; font-weight:800; text-decoration:none;">
                    support@monesave.com
                  </a>.
                </div>

                <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:24px; color:#111827; margin-top:18px;">
                  Welcome aboard,<br />
                  <strong>The Orukka Team</strong>
                </div>

                <!-- Security Note (optional) -->
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px; color:#6b7280; margin-top:14px;">
                  For your security, Orukka will never ask for your password or full payment details by email.
                </div>
              </td>
            </tr>

            <!-- Socials Footer -->
            <tr>
              <td style="padding:18px 24px 22px 24px; background-color:#F9FAFB; border-top:1px solid #EEF2F7;">
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px; color:#6b7280; text-align:center;">
                  Stay connected
                </div>

                <!-- Social buttons (replace links) -->
                <div style="text-align:center; margin-top:10px;">
                  <a href="https://www.instagram.com/orukka_monesave_rings" target="_blank"
                    style="display:inline-block; margin:0 6px; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:800;
                           color:#111827; text-decoration:none; border:1px solid #E5E7EB; padding:8px 10px; border-radius:999px;">
                    Instagram
                  </a>
                  <a href="https://web.facebook.com/orukka/" target="_blank"
                    style="display:inline-block; margin:0 6px; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:800;
                           color:#111827; text-decoration:none; border:1px solid #E5E7EB; padding:8px 10px; border-radius:999px;">
                    Facebook
                  </a>
                  <a href="https://x.com/monesave_" target="_blank"
                    style="display:inline-block; margin:0 6px; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:800;
                           color:#111827; text-decoration:none; border:1px solid #E5E7EB; padding:8px 10px; border-radius:999px;">
                    X
                  </a>
                  <a href="https://www.monesave.com/" target="_blank"
                    style="display:inline-block; margin:0 6px; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:800;
                           color:#111827; text-decoration:none; border:1px solid #E5E7EB; padding:8px 10px; border-radius:999px;">
                    Website
                  </a>
                </div>

                <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px; color:#9CA3AF; text-align:center; margin-top:14px;">
                  © {{Year}} Orukka. All rights reserved.
                </div>
              </td>
            </tr>

          </table>
          <!-- /Container -->
        </td>
      </tr>
    </table>
  </body>
</html>

            `;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: emailHtml
        };


        const info = await transporter.sendMail(mailOptions);

        console.log("Email sent: " + info.response);
        res.status(200).json({
            message: "Email sent successfully",
            messageId: info.messageId,
            usedDefaultTemplate: !htmlDesign
        });

    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
});

module.exports = router;