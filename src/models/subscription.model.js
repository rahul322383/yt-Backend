import mangoose, { Schema } from 'mongoose';
const subscriptionSchema = new Schema({
    subscriber: {
         type: Schema.Types.ObjectId, ref: 'User'
         },
    
    channel: {
        type: Schema.Types.ObjectId,
        ref: 'Channel',
    }
},
{ timestamps: true });

export const Subscription = mangoose.model('subscription', subscriptionSchema);