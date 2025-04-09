// 🔄 Updated chat.connection.js
import mongoose from "mongoose";
import User from "../../models/user";
import ChatMessages from "../../models/chatMessages";
import { NotFoundException } from "../common/middleware/error-exceptions";

const io = require("socket.io")();

const connectedSockets = new Map(); // userId => socket
const connectedUsers = new Set(); // track online userIds

//-------------------------------------------------------/
// socket for connection
//-------------------------------------------------------/
io.on("connection", (socket) => {
    socket.on("join", async ({ userId, chatRoomIds = [] }) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) return;

        const user = await User.findById(userId);
        if (!user) throw new NotFoundException("User not found");

        connectedSockets.set(userId, socket.id); // ✅ only store socket.id
        connectedUsers.add(userId);

        socket.join(userId); // private messages
        chatRoomIds.forEach((room) => socket.join(room));

        io.emit("userStatus", Array.from(connectedUsers));
    });

    //-------------------------------------------------------/
    // socket for private or group message saving
    //-------------------------------------------------------/
    socket.on("message", async (msg) => {
        const { sender, recipient, message, isGroup = false } = msg;
        if (!message) return;

        const chatMessage = new ChatMessages({
            senderId: sender,
            receiverId: recipient,
            message,
            isGroup,
        }).save();

        const senderUser = await User.findById(sender);
        const messageToSend = {
            ...chatMessage.toObject(),
            senderName: senderUser?.name || "Unknown",
        };

        if (isGroup) {
            io.to(recipient).emit("message", chatMessage);
        } else {
            const recipientSocket = connectedSockets.get(recipient);
            if (recipientSocket) {
                recipientSocket.emit("message", messageToSend);
            }
            socket.emit("message", messageToSend);
        }
    });

    //-------------------------------------------------------/
    // Seen status handling
    //-------------------------------------------------------/
    socket.on("seen", async ({ messageId, userId }) => {
        await ChatMessages.findByIdAndUpdate(messageId, {
            $addToSet: { seenBy: userId },
        });

        io.emit("seen", { messageId, userId });
    });

    //-------------------------------------------------------/
    // Typing indicator
    //-------------------------------------------------------/
    socket.on("typing", ({ sender, recipient, isTyping, isGroup }) => {
        const typingEvent = { sender, isTyping };

        if (isGroup) {
            socket.to(recipient).emit("typing", typingEvent);
        } else {
            const recipientSocket = connectedSockets.get(recipient);
            if (recipientSocket) {
                io.to(recipientSocket).emit("typing", typingEvent);
            }
        }
    });

    //-------------------------------------------------------/
    // Load chat history
    //-------------------------------------------------------/
    socket.on(
        "loadMessages",
        async ({ sender, recipient, isGroup = false }) => {
            let messages;
            if (isGroup) {
                messages = await ChatMessages.find({
                    receiverId: recipient,
                    isGroup,
                });
            } else {
                messages = await ChatMessages.find({
                    $or: [
                        { senderId: sender, receiverId: recipient },
                        { senderId: recipient, receiverId: sender },
                    ],
                    isGroup: false,
                });
            }
            socket.emit("previousMessages", messages);
        }
    );

    //-------------------------------------------------------/
    // Disconnect
    //-------------------------------------------------------/
    socket.on("disconnect", () => {
        const user = [...connectedSockets.keys()].find(
            (key) => connectedSockets.get(key) === socket
        );
        if (user) {
            connectedSockets.delete(user);
            connectedUsers.delete(user);
            io.emit("userStatus", Array.from(connectedUsers));
        }
    });
});

export default io;
