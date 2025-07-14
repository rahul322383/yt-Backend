import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  let token = null;

  // Priority 1: Cookie
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  // Priority 2: Authorization header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // No token found
  if (!token) {
  
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decoded?._id) {
      
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
     
      return res.status(404).json({ success: false, message: "User not found" });
    }

    req.user = user; // attach user to req
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
    
  }
});
