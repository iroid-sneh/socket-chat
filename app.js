import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import ejs from "ejs";
import fs from "fs";
import session from "express-session";
import http from "http";
import cookieParser from "cookie-parser";
import io from "./src/chat/chat.connection";
import routes from "./routes/index";
import { mongoConnection } from "./models/connection";

const app = express();
const port = process.env.PORT || 1002;
mongoConnection();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
    session({
        secret: "hjs89d",
        resave: false,
        saveUninitialized: true,
    })
);

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
// In your Express app setup (e.g., app.js or server.js)
app.use("/media/files", express.static(path.join(__dirname, "media/files")));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", routes);

const server = http.createServer(app);
io.attach(server);

const isSecure = process.env.IS_SECURE === "true";

if (isSecure) {
    let options;
    const environment = process.env.ENV || "local";

    if (environment == "production") {
        options = {
            key: fs.readFileSync(
                `${process.env.SSL_CERT_BASE_PATH}/private.key`
            ),
            cert: fs.readFileSync(`${process.env.SSL_CERT_BASE_PATH}/cert.crt`),
        };
    } else {
        options = {
            key: fs.readFileSync(
                `${process.env.SSL_CERT_BASE_PATH}/privkey.pem`
            ),
            cert: fs.readFileSync(`${process.env.SSL_CERT_BASE_PATH}/cert.pem`),
            ca: [
                fs.readFileSync(`${process.env.SSL_CERT_BASE_PATH}/cert.pem`),
                fs.readFileSync(
                    `${process.env.SSL_CERT_BASE_PATH}/fullchain.pem`
                ),
            ],
        };
    }
    const https = require("https").Server(options, app);
    https.listen(port, () => {
        console.log(
            `Https server is running on  ${process.env.BASE_URL}:${process.env.PORT}`
        );
    });
} else {
    // var http = require("http").Server(app);
    server.listen(port, () => {
        console.log(`Listening on port: ${process.env.BASE_URL}:${port}`);
    });
}
