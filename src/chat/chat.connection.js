// 🔄 Updated chat.connection.js
import mongoose from "mongoose";
import User from "../../models/user";
import ChatMessages from "../../models/chatMessages";
import { NotFoundException } from "../common/middleware/error-exceptions";
import { writeFile } from "fs";
import path from "path";
import mime from "mime-types";

const io = require("socket.io")({
    maxHttpBufferSize: 1e8,
});

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

        try {
            const chatMessage = await new ChatMessages({
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
                socket.to(recipient).emit("message", messageToSend);
            } else {
                const recipientSocket = connectedSockets.get(recipient);
                if (recipientSocket) {
                    io.to(recipientSocket).emit("message", messageToSend);
                }
                socket.emit("message", messageToSend); // Send back to sender too
            }
        } catch (error) {
            console.error("Error handling message:", error);
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
    // Typing indicator
    socket.on("typing", ({ sender, recipient, isGroup = false }) => {
        if (isGroup) {
            socket.to(recipient).emit("typing", { sender });
        } else {
            const recipientSocket = connectedSockets.get(recipient);
            if (recipientSocket) {
                io.to(recipientSocket).emit("typing", { sender });
            }
        }
    });

    // Stop typing indicator
    socket.on("stopTyping", ({ sender, recipient, isGroup = false }) => {
        if (isGroup) {
            socket.to(recipient).emit("stopTyping", { sender });
        } else {
            const recipientSocket = connectedSockets.get(recipient);
            if (recipientSocket) {
                io.to(recipientSocket).emit("stopTyping", { sender });
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
        const user = [...connectedSockets.entries()].find(
            ([, socketId]) => socketId === socket.id
        )?.[0];
        if (user) {
            connectedSockets.delete(user);
            connectedUsers.delete(user);
            io.emit("userStatus", Array.from(connectedUsers));
        }
    });

    //-------------------------------------------------------/
    // File Sharing
    //-------------------------------------------------------/
    socket.on("file", async (fileData) => {
        const { sender, recipient, fileName, fileBuffer } = fileData;
        const recipientSocketId = connectedSockets.get(recipient);

        if (!recipientSocketId) return;

        const filePath = `/media/files/${Date.now()}-${fileName}`;
        const mimeType = mime.lookup(fileName);
        const isAudio = mimeType?.startsWith("audio/");
        const isVideo = mimeType?.startsWith("video/");

        const absolutePath = path.join(__dirname, "../..", filePath);

        writeFile(absolutePath, Buffer.from(fileBuffer), async (err) => {
            if (err) {
                console.error("File write error:", err);
                return;
            }

            // Save to DB
            const chatMessage = await new ChatMessages({
                senderId: sender,
                receiverId: recipient,
                message: filePath,
                isGroup: false,
            }).save();

            const senderUser = await User.findById(sender);
            const messageToSend = {
                ...chatMessage.toObject(),
                senderName: senderUser?.name || "Unknown",
                isAudio,
                isVideo,
            };

            // Emit to both parties
            socket.emit("message", messageToSend);
            io.to(recipientSocketId).emit("message", messageToSend);
        });
    });
});

export default io;
