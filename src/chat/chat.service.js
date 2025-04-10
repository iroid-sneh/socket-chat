import User from "../../models/user";
import ChatMessages from "../../models/chatMessages";
import mongoose from "mongoose";

class chatService {
    /**
     * @description: Users Page
     * @param {*} req
     * @param {*} res
     */
    static async usersList(req, res) {
        // console.log("Chat page accessed");
        // console.log("Authenticated User in Chat:", req.user);

        const currentUserId = new mongoose.Types.ObjectId(req.user._id); // or however you're storing user

        try {
            // Step 1: Get all users (exclude self)
            const users = await User.find({ _id: { $ne: currentUserId } });

            // Step 2: For each user, find the last message
            const usersWithLastMessages = await Promise.all(
                users.map(async (user) => {
                    const lastMsg = await ChatMessages.findOne({
                        $or: [
                            { senderId: currentUserId, receiverId: user._id },
                            { senderId: user._id, receiverId: currentUserId },
                        ],
                    })
                        .sort({ createdAt: -1 })
                        .limit(1);

                    return {
                        ...user.toObject(),
                        lastMessage: lastMsg?.message || null,
                    };
                })
            );

            res.render("users", { users: usersWithLastMessages }); // Your EJS page
        } catch (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
        }
    }

    /**
     * @description: Users chat
     * @param {*} id
     * @param {*} req
     * @param {*} res
     */
    static async userChatById(id, req, res) {
        const sender = req.user; // from Auth middleware
        const recipientId = id;

        // (Optional) Get recipient name if you want to show it in the header
        const recipient = await User.findById(recipientId);

        //Left Side Panel Users list
        const users = await User.find({ _id: { $ne: sender._id } });

        res.render("chat", {
            senderId: sender._id,
            recipientId,
            senderName: sender.name, // or full name
            recipientName: recipient?.name || "User",
            recipientImage: recipient.image,
            users
        });
    }
}

export default chatService;
