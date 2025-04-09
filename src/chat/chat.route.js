import express from "express";
import asyncWrap from "express-async-handler";
import chatController from "./chat.controller";
const router = express.Router();

router.get("/", asyncWrap(chatController.usersList));

export default router;
