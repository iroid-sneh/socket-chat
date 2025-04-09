import User from "../../models/user";

class chatService {
    /**
     * @description: Users Page
     * @param {*} req
     * @param {*} res
     */
    static async usersList(req, res) {
        const users = await User.find();
        return res.render("users", {
            users,
        });
    }
}

export default chatService;
