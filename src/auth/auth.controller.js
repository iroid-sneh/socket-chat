import authServices from "./auth.service";
class authController {
    /**
     * @description: Register Page
     * @param {*} req
     * @param {*} res
     */
    static async registerPage(req, res) {
        const data = await authServices.registerPage(req, res);
        return;
    }

    /**
     * @description: Register Users
     * @param {*} req
     * @param {*} res
     */
    static async register(req, res) {
        const data = await authServices.register(req.body, req.file, req, res);
        return;
    }

    /**
     * @description: Login Page
     * @param {*} req
     * @param {*} res
     */
    static async loginPage(req, res) {
        const data = await authServices.loginPage(req, res);
        return;
    }

    /**
     * @description: Login
     * @param {*} req
     * @param {*} res
     */
    static async login(req, res) {
        const data = await authServices.login(req.body, req, res);
        return;
    }
}

export default authController;
