import mongoose from "mongoose";
import User from "../../models/user";
import ChatMessages from "../../models/chatMessages";
import ChatGroup from "../../models/groupChat";
import GroupMessages from "../../models/groupMessages";
import { NotFoundException } from "../common/middleware/error-exceptions";
import { writeFile } from "fs";
import path from "path";
import mime from "mime-types";

const io = require("socket.io")({
    maxHttpBufferSize: 1e8,
});

const connectedSockets = new Map();
const connectedUsers = new Set();

//-------------------------------------------------------/
// socket for connection
//-------------------------------------------------------/
io.on("connection", (socket) => {
    socket.on("join", async ({ userId }) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) return;

        const user = await User.findById(userId);
        if (!user) throw new NotFoundException("User not found");

        connectedSockets.set(userId, socket.id);
        connectedUsers.add(userId);

        socket.join(userId);

        const userGroups = await ChatGroup.find({ members: userId });
        userGroups.forEach((group) => socket.join(group._id.toString()));

        socket.emit("onlineUsers", Array.from(connectedUsers));
    });

    //-------------------------------------------------------/
    // socket for private or group message saving
    //-------------------------------------------------------/
    socket.on("message", async (msg) => {
        const { sender, recipient, message, isGroup = false } = msg;
        if (!message) return;

        try {
            let chatMessage;

            if (isGroup) {
                chatMessage = await new GroupMessages({
                    senderId: sender,
                    groupId: recipient,
                    message,
                }).save();
            } else {
                chatMessage = await new ChatMessages({
                    senderId: sender,
                    receiverId: recipient,
                    message,
                    isGroup,
                }).save();
            }

            const senderUser = await User.findById(sender);
            const messageToSend = {
                ...chatMessage.toObject(),
                senderName: senderUser?.name || "Unknown",
            };

            if (isGroup) {
                socket.to(recipient).emit("message", messageToSend);
                socket.emit("message", messageToSend);
            } else {
                const recipientSocket = connectedSockets.get(recipient);
                if (recipientSocket) {
                    io.to(recipientSocket).emit("message", messageToSend);
                }
                socket.emit("message", messageToSend);
            }
        } catch (error) {
            console.error("Error handling message:", error);
        }
    });

    //-------------------------------------------------------/
    // Typing indicator
    //-------------------------------------------------------/
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

    socket.on("getMessages", async ({ userId, otherUserId }) => {
        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(otherUserId)
        ) {
            return socket.emit("chatHistory", []);
        }

        try {
            const messages = await ChatMessages.find({
                isGroup: false,
                $or: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId },
                ],
            }).sort({ createdAt: 1 });

            const messagesWithSenderNames = await Promise.all(
                messages.map(async (msg) => {
                    const sender = await User.findById(msg.senderId);
                    return {
                        ...msg.toObject(),
                        senderName: sender?.name || "Unknown",
                    };
                })
            );

            socket.emit("chatHistory", messagesWithSenderNames);
        } catch (err) {
            console.error("Error fetching chat history:", err);
            socket.emit("chatHistory", []);
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

            socket.emit("message", messageToSend);
            io.to(recipientSocketId).emit("message", messageToSend);
        });
    });

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
        }
    });
});

export default io;
