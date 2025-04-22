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
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decoded?._id) {
      throw new ApiError(401, "Invalid token payload");
    }

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    req.user = user; // attach user to req
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
    
  }
});
