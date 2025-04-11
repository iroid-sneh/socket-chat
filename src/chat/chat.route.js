import express from "express";
import asyncWrap from "express-async-handler";
import chatController from "./chat.controller";
const router = express.Router();

router.get("/", asyncWrap(chatController.usersList));

router.get("/:id", asyncWrap(chatController.userChatById));

router.post("/group", asyncWrap(chatController.createGroup))

router.get("/group/:id", asyncWrap(chatController.groupChatById))
export default router;
