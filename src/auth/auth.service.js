import bcrypt from "bcryptjs";
import User from "../../models/user";
import { generateToken } from "../common/helper";

class authServices {
    static async registerPage(req, res) {
        return res.render("register");
    }

    static async register(data, file, req, res) {
        try {
            const { name, email, password } = data;
            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return res.status(400).send({
                    success: false,
                    message: "User already exists",
                });
            }

            console.log("FIle", file);
            const hashedPassword = await bcrypt.hash(password, 10);
            const image = `users/${file.filename}`;
            const user = await User.create({
                name,
                email,
                password: hashedPassword,
                image,
            });

            const token = generateToken(user._id);
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 24 * 60 * 60 * 1000,
            });

            return res.redirect("/api/v1/chat");
        } catch (error) {
            console.log("Error", error);
            return res.status(500).send({
                success: false,
                message: "Internal Server Error",
            });
        }
    }

    static async loginPage(req, res) {
        return res.render("login", { error: null });
    }

    static async login(data, req, res) {
        const { email, password } = data;

        const user = await User.findOne({ email });
        if (!user) {
            return res.render("login", { error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render("login", { error: "Invalid credentials" });
        }

        const token = generateToken(user._id);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.redirect("/api/v1/chat");
    }
}

export default authServices;
