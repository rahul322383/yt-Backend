import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const generateAccessTokenAndRefreshToken = async (userId)=>{
    try{
     const user = await User.findByIdAndUpdate(userId) 
        const  accessToken=user.generateAccessToken()
        const  refreshToken=user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
       
        return {accessToken, refreshToken}

    } catch(error){
        throw  new ApiError(500, "Error generating token")
    }
}

const registerUser= asyncHandler(async (req, res) => {

    const{fullname, email, username, password} = req.body;
    console.log("fullname",fullname)

    // if(fullname===""){
    //     throw new ApiError(400,"Fullname is required")
    // }

    if(
        [fullname, email, username, password].some((field)=>
        field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }
  const existedUser =  User.findOne({
        $or: [{ email }, { username }]
  })
        
        if(existedUser){
            throw new ApiError(409,"Username or email already exists")
        }
       const avataLocalPath = req.files?.avatar[0]?.path;
         const coverImageLocalPath = req.files?.cover[0]?.path;

         if(!avataLocalPath){
             throw new ApiError(400,"Avatar are required")
         }
         const avatar = await uploadOnCloudinary(avataLocalPath);
         const coverImage = await uploadOnCloudinary(coverImageLocalPath);

         if(!avatar ){
             throw new ApiError(500,"Cloudinary Error")
         }

         const user = await User.create({
             fullname,
             email, 
             username: username.toLowerCase(),
             password,
             avatar: avatar.url,
             coverImage: coverImage?.url||""
         })

         const createduser = await user.findById(user._id).select(
            -"password" -"-refreshToken"
         )

         if(!createduser){
             throw new ApiError(500,"User not created")
         }
           return res.status(201).json(
                new ApiResponse(201,createduser,"User created successfully")
           )

        

} )

const loginUser = asyncHander(async(res,res) =>{
    
    const {username,email, password} = req.body;

   if(!username || !email){
    throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({
    $or: [{username} , {email}]
   })

   if(!user){
    throw new ApiError(404, "User not found")
   }

  const isPasswordCorrectValid = await user.isPasswordCorrect(password)



    if(!isPasswordCorrectValid){
     throw new ApiError(401, "Invalid credentials")
    }
    
    const {accessToken, refreshToken} =await generateAccessTokenAndRefreshToken(user._id)
    .then(({accessToken, refreshToken})=>{
        res.status(200).json(
            new ApiResponse(200,{accessToken, refreshToken},"Login successful")
        )
    })

        
 
    




})
 
export {
    registerUser,
    loginUser
}

