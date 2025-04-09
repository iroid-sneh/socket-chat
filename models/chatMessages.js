import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Can be a user ID (for private chat) or group ID (for group chat)
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
        // Seen by multiple users (important for group chat)
        seenBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        // true if this message belongs to a group chat
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
