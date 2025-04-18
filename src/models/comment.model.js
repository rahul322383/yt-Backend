// import mongoose, {Schema} from "mongoose";
// import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// const commentSchema = new Schema(
//     {
//         content: {
//             type: String,
//             required: true
//         },
//         video: {
//             type: Schema.Types.ObjectId,
//             ref: "Video"
//         },
//         owner: {
//             type: Schema.Types.ObjectId,
//             ref: "User"
//         }
//     },
//     {
//         timestamps: true
//     }
// )


// commentSchema.plugin(mongooseAggregatePaginate)

// export const Comment = mongoose.model("Comment", commentSchema)


import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema({
  content: {
    type: String,
    required: true,
  },
  video: {
    type: Schema.Types.ObjectId,
    ref: "Video",
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);
