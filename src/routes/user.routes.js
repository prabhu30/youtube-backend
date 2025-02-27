import { Router } from "express";
import {
    changeUserPassword,
    getCurrentUser,
    getUserChannelProfile,
    getUserWatchHistory,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateUserAccountDetails,
    updateUserAvatarImage,
    updateUserCoverImage
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]), registerUser);


userRouter.route("/login").post(loginUser);

// Secured Routes (Executable only when user is logged in)
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refreshToken").post(refreshAccessToken);
userRouter.route("/change-password").post(verifyJWT, changeUserPassword);

userRouter.route("/current-user").get(verifyJWT, getCurrentUser);
userRouter.route("/channel-details/:username").get(verifyJWT, getUserChannelProfile);
userRouter.route("/history").get(verifyJWT, getUserWatchHistory);

userRouter.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatarImage);
userRouter.route("/update-coverimage").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
userRouter.route("/update-account-details").patch(verifyJWT, updateUserAccountDetails);

export default userRouter;