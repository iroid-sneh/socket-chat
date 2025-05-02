import chatService from "./chat.service";

class chatController {
    /**
     * @description: Users
     * @param {*} req
     * @param {*} res
     */
    static async usersList(req, res) {
        const data = await chatService.usersList(req, res);
        return;
    }

    /**
     * @description: User chat
     * @param {*} req
     * @param {*} res
     */
    static async userChatById(req, res) {
        const data = await chatService.userChatById(req.params.id, req, res);
        return;
    }

    /**
     * @description: create Group Chat
     * @param {*} req
     * @param {*} res
     */
    static async createGroup(req, res) {
        const data = await chatService.createGroup(req, res);
        return;
    }

    /**
     * @description: Group Chat by ID
     * @param {*} req
     * @param {*} res
     */
    static async groupChatById(req, res) {
        const data = await chatService.groupChatById(req.params.id, req, res);
        return;
    }

    /**
     * @description: Get Chat Messages Of Private Chats
     * @param {*} req
     * @param {*} res
     */
    static async getPrivateChatMessages(req, res) {
        const data = await chatService.getPrivateChatMessages(req, res);
        return;
    }

    /**
     * @description: Get Chat Messages Of Groups Chats
     * @param {*} req
     * @param {*} res
     */
    static async getGroupChatMessages(req, res) {
        const data = await chatService.getGroupChatMessages(req, res);
        return;
    }
}

export default chatController;
