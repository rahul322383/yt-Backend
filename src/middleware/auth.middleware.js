

// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import jwt from "jsonwebtoken";
// import { User } from "../models/user.model.js";

// export const verifyJWT = asyncHandler(async (req, res, next) => {
//   // Get token from cookie or Authorization header


//   // const token =
//   //   req.cookies?.accessToken ||
//   //   req.headers.authorization?.startsWith("Bearer ")
//   //     ? req.headers.authorization.split(" ")[1]
//   //     : null;

//   // if (!token) {
//   //   throw new ApiError(401, "Unauthorized: No token provided");
//   // }
//   const token =
//   req.cookies?.accessToken ||
//   (req.headers.authorization?.startsWith("Bearer ") && req.headers.authorization.split(" ")[1]);

// if (!token) {
//   throw new ApiError(401, "Unauthorized: No token provided");
// }


//   try {
//     // Verify and decode the token
//     const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//     if (!decoded?._id) {
//       throw new ApiError(401, "Invalid token payload");
//     }

//     const user = await User.findById(decoded._id).select("-password -refreshToken");

//     if (!user) {
//       throw new ApiError(404, "User not found");
//     }

//     req.user = user; // Attach user to request
//     next();
//   } catch (error) {
//     throw new ApiError(401, "Invalid or expired token");
//   }
// });



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
    console.error("JWT Verification Error:", error.message);
    throw new ApiError(401, "Invalid or expired token");
  }
});
