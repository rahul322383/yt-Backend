// import jwt from "jsonwebtoken";
// import { User } from "../models/user.model.js";

// export const optionalJWT = async (req, res, next) => {
//   try {
//     const token = req.headers["authorization"]?.replace("Bearer ", "");
//    console.log(token)
  
//     if (!token) {
//       req.user = null; // No user, but still allow access
//       return next();
//     }

//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//     } catch (error) {
//       console.log("optionalJWT error:", error.message);
//       req.user = null; // Token invalid/expired, continue as guest
//       return next();
//     }

//     if (!decoded?._id) {
//       req.user = null;
//       return next();
//     }

//     const user = await User.findById(decoded._id).select("-password -refreshToken");
//     if (!user) {
//       req.user = null;
//       return next();
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     console.log("optionalJWT unexpected error:", error.message);
//     req.user = null;
//     next(); // Still allow the route to run as guest
//   }
// };


import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const optionalJWT = async (req, res, next) => {
  try {
    const rawAuth = req.headers["authorization"] || "";
    const token = rawAuth.startsWith("Bearer ") ? rawAuth.slice(7).trim() : null;

    // No token → guest
    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      // Ignore expiration so we can still decode payload for optional routes
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
        ignoreExpiration: true
      });
    } catch (error) {
      console.log("optionalJWT decode error:", error.message);
      req.user = null;
      return next();
    }

    // If there's no _id in token payload → treat as guest
    if (!decoded?._id) {
      req.user = null;
      return next();
    }

    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.log("Token expired → treating as guest");
      req.user = null;
      return next();
    }

    // Fetch the user from DB
    const user = await User.findById(decoded._id).select("-password -refreshToken");
    if (!user) {
      req.user = null;
      return next();
    }

    // Attach user to request
    req.user = user;
    return next();

  } catch (error) {
    console.log("optionalJWT unexpected error:", error.message);
    req.user = null;
    return next();
  }
};
