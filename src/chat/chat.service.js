import User from "../../models/user";
import ChatMessages from "../../models/chatMessages";
import ChatGroup from "../../models/groupChat";
import GroupMessages from "../../models/groupMessages";
import mongoose from "mongoose";

class chatService {
    /**
     * @description: Users Page
     * @param {*} req
     * @param {*} res
     */
    static async usersList(req, res) {
        const currentUserId = new mongoose.Types.ObjectId(req.user._id);

        const groups = await ChatGroup.find({ members: currentUserId });

        try {
            const users = await User.find({ _id: { $ne: currentUserId } });

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

            res.render("users", {
                users: usersWithLastMessages,
                senderId: currentUserId,
                groups,
            });
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

        const group = await ChatGroup.findById(id)
            .populate("members", "name image")
            .populate("admin", "name");

        const groups = await ChatGroup.find({ members: sender._id });

        const recipient = await User.findById(recipientId);
        const leftSidePanelGroups = await ChatGroup.find({
            _id: { $nin: [groups._id] },
        });

        const messages = await ChatMessages.find({
            $or: [
                { senderId: sender._id, receiverId: recipientId },
                { senderId: recipientId, receiverId: sender._id },
            ],
        }).sort({ createdAt: 1 });

        const users = await User.find({
            _id: { $nin: [sender._id, recipientId] },
        });

        const usersForGroup = await User.find({
            _id: { $nin: [sender._id] },
        });

        res.render("chat", {
            senderId: sender._id,
            recipientId,
            senderName: sender.name,
            recipientName: recipient?.name || "User",
            recipientImage: recipient.image,
            users,
            initialMessages: messages,
            group: group,
            sideGroup: leftSidePanelGroups,
            usersForGroup: usersForGroup,
            isGroup: false,
        });
    }

    /**
     * @description: Create Group Chat
     * @param {*} req
     * @param {*} res
     */
    static async createGroup(req, res) {
        const { name, members } = req.body;
        const admin = req.user.id;
        if (!name || !members || members.length < 2) {
            return res
                .status(400)
                .json({ message: "Group name & at least 2 members required." });
        }

        const group = await ChatGroup.create({
            name,
            members,
            admin: admin,
        });

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

        const leftSidePanelGroups = await ChatGroup.find({
            _id: { $nin: [group._id] },
        });

        const usersForGroup = await User.find({
            _id: { $nin: [users._id] },
        });

        const messages = await GroupMessages.find({
            groupId: group._id,
        })
            .sort({ createdAt: 1 })
            .populate("senderId", "name image");

        res.render("chat", {
            senderId: req.user._id,
            recipientId: group._id,
            senderName: req.user.name,
            recipientName: group.name,
            recipientImage: "/assets/images/background/group-img.jpg",
            users,
            initialMessages: messages,
            isGroup: true,
            groupMembers: group.members,
            group: group,
            sideGroup: leftSidePanelGroups,
            usersForGroup: usersForGroup,
        });
    }

    /**
     * @description: Get Private Chat Messages
     * @param {*} req
     * @param {*} res
     */
    static async getPrivateChatMessages(req, res) {
        // console.log("Fetching private chat messages...");
        if (!req.user || !req.user._id) {
            return res
                .status(400)
                .json({ error: "User is not authenticated properly." });
        }

        const userId = req.user._id;
        const recipientId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        try {
            const messages = await ChatMessages.find({
                $or: [
                    { senderId: userId, receiverId: recipientId },
                    { senderId: recipientId, receiverId: userId },
                ],
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);

            const totalMessages = await ChatMessages.countDocuments({
                $or: [
                    { senderId: userId, receiverId: recipientId },
                    { senderId: recipientId, receiverId: userId },
                ],
            });

            res.json({
                success: true,
                messages,
                hasMore: page * limit < totalMessages,
            });
        } catch (error) {
            console.error("Error fetching messages:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * @description: Get Group Chat Messages
     * @param {*} req
     * @param {*} res
     */
    static async getGroupChatMessages(req, res) {
        const groupId = req.params.id;

        const messages = await GroupMessages.find({ groupId }).sort({
            createdAt: 1,
        });

        res.json({ success: true, messages });
    }
}

export default chatService;
