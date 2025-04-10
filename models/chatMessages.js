import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["0 - text", "1 - audio", "2 - video", "3 - photo"],
            default: "0 - text",
        },
        seenBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        isGroup: {
            type: Boolean,
            default: false,
        },
        sentMessage: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

const ChatMessages = mongoose.model("ChatMessages", chatMessageSchema);

export default ChatMessages;
