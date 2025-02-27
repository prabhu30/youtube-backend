import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorHandler from "../src/middlewares/errorHandler.middleware.js";

const app = express();

// .use is used to configure middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"))
app.use(cookieParser());


// Routes Configuration
import userRouter from "./routes/user.routes.js";
app.use("/api/v1/users", userRouter);


// Error Handling Middleware (placed after all middleware and route handlers)
app.use(errorHandler);

export { app }