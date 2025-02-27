import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: '../.env'
})

const port = process.env.PORT || 8000;

connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port: ${port}`);
    })
    app.on("error", (error) => {
        console.error(`Error: Problem occurred while running the server: ${error}`)
    })
}).catch(() => {
    console.error(`Error: Could not connect to the database: ${error}`);
});
















// -----------------------------------------------------------------------
//  APPROACH 01 (Not Clean)

// import mongoose from "mongoose";
// import express from "express";
// import { DB_NAME } from "./constants";

// const app = express();

// (async () => {
//     try {
//         await mongoose.connect(`${process.env.DB_URL}/${process.env.DB_NAME}`);
//         app.on("error", (error) => {
//             console.error("ERROR: ", error);
//             throw error;
//         })
//         app.listen(process.env.PORT, () => {
//             console.log(`App is listening on port ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error("ERROR: ", error);
//         throw error;
//     }
// })()