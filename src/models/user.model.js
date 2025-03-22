import mongoose ,{Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema (
    {

        username: {
            type :String,
            required: true,
            unique: true,
            trim: true,
            lowecase: true,
            index: true
        },
        email: {
            type :String,
            required:true,
            unique: true,
            trim: true,
            lowecase: true,
        },
        password: {
            type :String,
            required: [true, "Password is required"],
        },

        fullName: {
            type :String,
            required: true,
            trim: true,
            index: true
        },
        avatar : { //cloudinary url
            type :String,
            required: true,
        },
        coverImage :{
            type :String,
        },
        watchHistory: {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        refreshToken:{
            type :String
        }
    },
        {
            timestamps: true
        
    }
)

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();

        this.password = await bcrypt.hash(this.password, 10)

    next()
})

userSchema.methods.isPasswordCorrect= async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.method.generateAccessToken = function(){
     return jwt.sign(
        {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME
    }
)
}

userSchema.method.generateRefreshToken = function(){
    return jwt.sign(
        {
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRE_TIME
    }
)
}

export const User = mongoose.model("User", userSchema)