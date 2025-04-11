import mongoose from "mongoose";

const chatGroupSchema = new mongoose.Schema(
    {
        image: {
            type: String,
            default: null,
        },
        name: {
            type: String,
            required: true,
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const ChatGroup = mongoose.model("ChatGroup", chatGroupSchema);
export default ChatGroup;
