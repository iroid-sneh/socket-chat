import express from "express";
import asyncWrap from "express-async-handler";
import chatController from "./chat.controller";
import { Auth } from "../common/middleware/auth";
const router = express.Router();

router.get("/", asyncWrap(chatController.usersList));

router.get("/:id", asyncWrap(chatController.userChatById));

router.post("/group", asyncWrap(chatController.createGroup));

router.get("/group/:id", asyncWrap(chatController.groupChatById));

router.get("/messages/:id", asyncWrap(chatController.getPrivateChatMessages));

router.get(
    "/group/messages/:id",
    asyncWrap(chatController.getGroupChatMessages)
);
export default router;
