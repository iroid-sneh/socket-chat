import User from "../../models/user";
import ChatMessages from "../../models/chatMessages";
import ChatGroup from "../../models/groupChat"
import mongoose from "mongoose";

class chatService {
    /**
     * @description: Users Page
     * @param {*} req
     * @param {*} res
     */
    static async usersList(req, res) {

        const currentUserId = new mongoose.Types.ObjectId(req.user._id); // or however you're storing user
        // Inside chatService.usersList
        const groups = await ChatGroup.find({ members: currentUserId });
        // console.log("Groups found for user:", groups);


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

            res.render("users", { users: usersWithLastMessages, senderId: currentUserId, groups }); // Your EJS page
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
        const sender = req.user;
        const recipientId = id;

        const recipient = await User.findById(recipientId);
        const groups = await ChatGroup.find({ members: sender._id });

        // Get messages between these users
        const messages = await ChatMessages.find({
            $or: [
                { senderId: sender._id, receiverId: recipientId },
                { senderId: recipientId, receiverId: sender._id },
            ],
        }).sort({ createdAt: 1 });

        // Left Side Panel Users list
        const users = await User.find({
            _id: { $nin: [sender._id, recipientId] },
        });

        res.render("chat", {
            senderId: sender._id,
            recipientId,
            senderName: sender.name,
            recipientName: recipient?.name || "User",
            recipientImage: recipient.image,
            users,
            initialMessages: messages, // Pass messages to the view
            groups
        });
    }

    /**
     * @description: Create Group Chat
     * @param {*} req
     * @param {*} res
     */
    static async createGroup(req, res) {
        const { name, members, admin } = req.body;

        if (!name || !members || members.length < 2) {
            return res.status(400).json({ message: "Group name & at least 2 members required." });
        }

        const group = await ChatGroup.create({
            name,
            members,
            admin,
        });

        // Redirect to group chat page
        res.status(200).json({ success: true, groupId: group._id });
    }


    /**
     * @description: Group Chat by Id
     * @param {*} req
     * @param {*} res
     */
    static async groupChatById(id, req, res) {
        const group = await ChatGroup.findById(id)
            .populate("members", "name image")
            .populate("admin", "name");

        if (!group) return res.status(404).send("Group not found");

        const users = await User.find({ _id: { $ne: req.user._id } });

        res.render("chat", {
            senderId: req.user._id,
            recipientId: group._id,
            senderName: req.user.name,
            recipientName: group.name,
            recipientImage: "/assets/group.png", // Default group avatar
            users,
            initialMessages: [], // Load later with socket/messages model
            isGroup: true,
            groupMembers: group.members,
        });
    }

}

export default chatService;
