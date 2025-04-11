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

        connectedSockets.set(userId, socket.id);
        connectedUsers.add(userId);

        // Join private room
        socket.join(userId);

        // Join group rooms from DB
        const userGroups = await ChatGroup.find({ members: userId });
        userGroups.forEach((group) => socket.join(group._id.toString()));

        // Join any extra provided rooms (optional)
        chatRoomIds.forEach((room) => socket.join(room));

        // Notify everyone about this user's online status
        io.emit("userStatus", {
            userId,
            isOnline: true,
        });

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
                messages = await GroupMessages.find({
                    groupId: recipient,
                }).sort({ createdAt: 1 });
            } else {
                messages = await ChatMessages.find({
                    $or: [
                        { senderId: sender, receiverId: recipient },
                        { senderId: recipient, receiverId: sender },
                    ],
                    isGroup: false,
                }).sort({ createdAt: 1 });
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
            io.emit("userStatus", {
                userId: user,
                isOnline: false,
            });
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

    // Online Status
    socket.on("userStatus", ({ userId, isOnline }) => {
        const dot = document.getElementById("onlineStatusDot");
        if (recipientId === userId && dot) {
            dot.style.backgroundColor = isOnline ? "limegreen" : "gray";
        }
    });

    // members.forEach((memberId) => {
    //     const memberSocket = connectedSockets.get(memberId);
    //     if (memberSocket) {
    //         io.to(memberSocket).emit("groupCreated", group);
    //     }
    // });
});

export default io;
