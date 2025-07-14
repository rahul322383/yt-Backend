import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const optionalJWT = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.replace("Bearer ", "");

    // If there's no token, just continue without attaching user
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select("-password");

    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Invalid or expired token – silent fail
  }

  return next(); // Always continue
};
