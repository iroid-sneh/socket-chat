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
}

export default chatController;
