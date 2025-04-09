import express from "express";
import asyncWrap from "express-async-handler";
import authController from "./auth.controller";
import storeFiles from "../common/middleware/store-files";
const router = express.Router();

router.post(
    "/register",
    storeFiles("public/users", "image", "single"),
    asyncWrap(authController.register)
);

export default router;
