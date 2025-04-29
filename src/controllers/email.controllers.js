import { Otp } from "../models/Otp.model.js";
import sendEmail from "../utils/SendEmail.js";

const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();


export const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await Otp.findOneAndDelete({ email });
  await Otp.create({ email, code, expiresAt });

  await sendEmail({
    to: email,
    subject: "Your OTP Code",
    html: `<h1>Your OTP is ${code}</h1><p>It will expire in 10 minutes.</p>`,
  });
  
  

  res.status(200).json({ success: true, message: "OTP sent to email" });
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const record = await Otp.findOne({ email });
  if (!record) return res.status(400).json({ message: "OTP not found or expired" });

  if (record.code !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (record.expiresAt < new Date()) {
    return res.status(400).json({ message: "OTP expired" });
  }

  await Otp.deleteOne({ email });

  res.status(200).json({ success: true, message: "OTP verified" });
};

export const resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.findOneAndDelete({ email });
  await Otp.create({ email, code, expiresAt });

  await sendEmail({
    to: email,
    subject: "Your New OTP Code",
    html: `<h1>Your new OTP is ${code}</h1><p>It will expire in 10 minutes.</p>`,
  });

  res.status(200).json({ success: true, message: "OTP resent" });
};
