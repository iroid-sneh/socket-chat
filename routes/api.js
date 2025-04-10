import express from "express";
import authRoutes from "../src/auth/auth.routes";
import chatRoutes from "../src/chat/chat.route";
import { Auth } from "../src/common/middleware/auth"
const router = express.Router();

router.use("/auth", authRoutes);

router.use("/chat", Auth, chatRoutes);

export default router;
