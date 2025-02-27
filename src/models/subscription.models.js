import mongoose, { Schema } from "mongoose"

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,    // person who is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,    // person to whom the "subscriber" is subscribing 
        ref: "User"
    }
}, { timestamps: true })

export const Subscription = mongoose.model("Subscription", subscriptionSchema);