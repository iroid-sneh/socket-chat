import bcrypt from "bcryptjs";
import User from "../../models/user";

class authServices {
    /**
     * @description: Register Page
     * @param {*} req
     * @param {*} res
     */
    static async registerPage(req, res) {
        return res.render("register");
    }

    /**
     * @description: Register Users
     * @param {*} data
     * @param {*} file
     * @param {*} req
     * @param {*} res
     */
    static async register(data, file, req, res) {
        // console.log(data);
        try {
            const { name, email, password } = data;
            const findUser = await User.findOne({ email: email });
            if (findUser) {
                return res.status(400).send({
                    success: false,
                    message: "User Already Exists",
                });
            }
            const image = `users/${file.filename}`;
            const user = await User.create({ name, email, password, image });

            return res.status(200).redirect("/api/v1/chat");
        } catch (error) {
            console.log("Error", error);
            return res.status(500).send({
                success: false,
                message: "Internal Server Error",
            });
        }
    }

    /**
     * @description: Login Page
     * @param {*} req
     * @param {*} res
     */
    static async loginPage(req, res) {
        return res.render("login");
    }

    /**
     * @description: Login
     * @param {*} data
     * @param {*} req
     * @param {*} res
     */
    static async login(data, req, res) {
        const { email, password } = data;

        const findUser = await User.findOne({ email });
        if (!findUser) {
            return res.redirect("back");
        }

        const checkPassword = bcrypt.compare(findUser.password, password);
        if (!checkPassword) {
            return res.redirect("back");
        }

        return res.redirect("/api/v1/chat");
    }
}

export default authServices;
