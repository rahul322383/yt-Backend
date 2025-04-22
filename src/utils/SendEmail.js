import nodemailer from "nodemailer";

const sendEmail = async (to, subject, html) => {
  // Validate the input parameters
  if (!to || !subject || !html) {
    throw new Error("Missing required email fields: to, subject, or html.");
  }

  console.log("Sending email to:", to);
  console.log("Email subject:", subject);

  // Create a transporter using Gmail service
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,  // Make sure to check the environment variable
      pass: process.env.EMAIL_PASS,  // Same for the password
    },
  });

  // Log email credentials (useful for debugging, but remove this in production)
  console.log("Using email account:", process.env.EMAIL_USER);

  // Define the mail options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,        // recipient email address
    subject,   // subject of the email
    html,      // HTML body of the email
  };

  // Try sending the email and log success or failure
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error.message);
    if (error.response) {
      console.error("Detailed SMTP error:", error.response);
    }
  }
};

export default sendEmail;
