import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, _req, res, _next) => {
    console.log("Error Handler Called");

    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    } else {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            errors: [],
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

export default errorHandler;