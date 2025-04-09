import express from "express";
import authRoutes from "../src/auth/auth.routes";
import User from "../models/user";
const router = express.Router();

router.use("/auth", authRoutes);

router.get("/chat", async (req, res) => {
    return res.render("chat", {});
});

export default router;
