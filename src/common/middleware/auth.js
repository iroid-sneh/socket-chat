import { verifyToken } from "../helper.js";
import User from "../../../models/user.js";

export const Auth = async (req, res, next) => {
    try {

        const token = req.cookies?.token;
        if (!token) return res.redirect("/api/v1/auth/login");

        const decoded = verifyToken(token);
        if (!decoded?.userId) return res.redirect("/api/v1/auth/login");

        const user = await User.findById(decoded.userId);
        if (!user) return res.redirect("/api/v1/auth/login");

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth middleware error:", err);
        return res.redirect("/api/v1/auth/login");
    }
};
