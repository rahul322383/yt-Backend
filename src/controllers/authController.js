import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "../models/user.model.js";
import sendEmail from "../utils/SendEmail.js";

dotenv.config();

/** ✅ OAuth Success Handler */
export const handleOAuthCallback = (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(400).json({ success: false, message: "OAuth user not found" });
    }

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const redirectUrl = `${process.env.CLIENT_URL}/oauth-success?token=${accessToken}`;

    // Optional: Extra protection against open redirects
    const url = new URL(redirectUrl);
    if (!url.origin.startsWith(process.env.CLIENT_URL)) {
      return res.status(400).json({ success: false, message: "Invalid redirect URL" });
    }

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("OAuth Callback Error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/** 🔐 Forgot Password */
const generateResetLink = (email) => {
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return `http://localhost:5173/reset-password/${token}`; // Adjust to your frontend URL
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send("Email is required.");
  }

  try {
    // Check if the email exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("User with this email does not exist.");
    }

    // Generate the reset link
    const resetLink = generateResetLink(email);
    const subject = "🔐 Password Reset Request";
    const html = `
      <p>Hi,</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    // Send the reset email
    await sendEmail(email, subject, html);

    // Respond with success message
    res.status(200).send("Password reset email sent.");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error sending email.");
  }
};

/** 🔁 Reset Password */
// export const resetPassword = async (req, res) => {
//   try {
//     const { token } = req.params;
//     const { password } = req.body;

//     if (!token || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Token and new password are required",
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id);

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);
//     user.password = hashedPassword;

//     await user.save();

//     return res.status(200).json({
//       success: true,
//       message: "Password has been reset successfully",
//     });
//   } catch (err) {
//     console.error("Reset Password Error:", err.message);
//     return res.status(400).json({
//       success: false,
//       message: err.name === "TokenExpiredError" ? "Token has expired" : "Invalid or expired token",
//     });
//   }
// };
