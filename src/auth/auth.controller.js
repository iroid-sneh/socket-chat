import authServices from "./auth.service";
class authController {
    /**
     * @description: Register Users
     * @param {*} req
     * @param {*} res
     */
    static async register(req, res) {
        const data = await authServices.register(req.body, req.file, req, res);
        return;
    }
}

export default authController;
