import User from "../../models/user";

class authServices {
    /**
     * @description: Register Users
     * @param {*} data
     * @param {*} file
     * @param {*} req
     * @param {*} res
     */
    static async register(data, file, req, res) {
        try {
            const { name, email, password } = data;
            const findUser = await User.findOne({ email: email });
            if (findUser) {
                return res.status(400).send({
                    success: false,
                    message: "User Already Exists",
                });
            }
            const image = `user/${file.filename}`;
            const user = await User.create({ name, email, password, image });

            return res.status(200).send({
                success: true,
                data: user,
            });
        } catch (error) {
            console.log("Error", error);
            return res.status(500).send({
                success: false,
                message: "Internal Server Error",
            });
        }
    }
}

export default authServices;
