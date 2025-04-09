import express from "express";
import authRoutes from "../src/auth/auth.routes";
import chatRoutes from "../src/chat/chat.route";
const router = express.Router();

router.use("/auth", authRoutes);

router.use("/chat", chatRoutes);

export default router;
