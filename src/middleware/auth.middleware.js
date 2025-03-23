import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {

    try{
    const Token = req.cookies?.accessToken || req.headers["authorization"]
    ?.replace("Bearer", "")

    if(!Token){
        return res.status(401).json({
            message: "Unauthorized"
        })
    }
    const decodedToken = jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET)

    const user= await User.findById(decodedToken?._id).select("-password -refreshToken")
    
    if(!user){
        throw new ApiError(404, "User not found")
    }
    req.user = user;
    next()
    }catch(error){
       throw new ApiError(401, error?.message || " Invalid token or Unauthorized")
    }
    
})