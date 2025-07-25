import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const optionalJWT = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.replace("Bearer ", "");
  
    

    if (!token) {
      req.user = null; // No user, but still allow access
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      console.log("optionalJWT error:", error.message);
      req.user = null; // Token invalid/expired, continue as guest
      return next();
    }

    if (!decoded?._id) {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded._id).select("-password -refreshToken");
    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("optionalJWT unexpected error:", error.message);
    req.user = null;
    next(); // Still allow the route to run as guest
  }
};
