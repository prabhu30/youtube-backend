import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export default async function connectDB() {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.DB_URL}/${DB_NAME}`);
        console.log("Connection to DB Successful! Connection Host : ", connectionInstance.connection.host);
    } catch (error) {
        console.error("ERROR: Could not connect to the database: ", error);
        process.exit(1);
    }
}