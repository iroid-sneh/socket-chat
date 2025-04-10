import express from "express";
import asyncWrap from "express-async-handler";
import authController from "./auth.controller";
import storeFiles from "../common/middleware/store-files";
const router = express.Router();

router.get("/register", asyncWrap(authController.registerPage));

router.post(
    "/register",
    storeFiles("public/users", "image", "single"),
    asyncWrap(authController.register)
);

router.get("/login", asyncWrap(authController.loginPage));

router.post("/login", asyncWrap(authController.login));

export default router;
