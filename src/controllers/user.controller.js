import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {
    // Get user details from frontend
    const { username, email, fullName, password } = req.body;

    // Validate all the fields and check if any field is empty
    if (
        [username, email, fullName, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if user already exists: using username and email
    const isUserExists = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (isUserExists) {
        throw new ApiError(409, "User with username or email already exists");
    }

    // Check for images and avatar in the request
    const avatarFileLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarFileLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload images and avatar to cloudinary
    const avatar = await uploadToCloudinary(avatarFileLocalPath);
    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Create user entry in database and fetch response
    const user = await User.create({
        username: username.toLowerCase(),
        password,
        email,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    // Validate that the user is created in database
    // Remove sensitive fields like password and refresh token from response
    const userResponse = await User.findById(user._id).select("-password -refreshToken");

    if (!userResponse) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Return response
    return res.status(201).json(new ApiResponse(201, userResponse, "User registered successfully!"));
})

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: true });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, `Error occurred while generating Access and Refresh tokens : ${error.message}`);
    }
}

const refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (refreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Invalid Request: Refresh token is expired or used")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res.status(200)
        .cookie("accessToken", newAccessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200,
            {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            },
            "Access Token refreshed successfully!"
        ))
})

const loginUser = asyncHandler(async (req, res) => {
    // Extract data from request body
    const { username, email, password } = req.body;

    // Check for username and email data existence in request body
    if (!username && !email) {
        throw new ApiError(400, "Username or Email are required")
    }

    // Verify user existence in database either using username or email
    const user = await User.findOne({ $or: [{ username }, { email }] })
    if (!user) {
        throw new Error(404, "User does not exist")
    }

    // Validate and compare password from request and password in database
    const isValidPassword = await user.isPasswordCorrect(password);
    if (!isValidPassword) {
        throw new ApiError(400, "Invalid password");
    }

    // Respond to user with Access Token and Refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Set Secured Cookies which have access and refresh tokens
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully!"))
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true
        })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully!"));
})

const changeUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Both old and new passwords are required");
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "User password updated successfully"));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "User details fetched successfully"));
})

const updateUserAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "Both full name and email are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "User account details updated successfully"));
})

const updateUserAvatarImage = asyncHandler(async (req, res) => {
    const avatarFilePath = req.file?.path;
    if (!avatarFilePath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const uploadedAvatar = await uploadToCloudinary(avatarFilePath);
    if (!uploadedAvatar.url) {
        throw new ApiError(500, "Error occurred while uploading avatar to cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: uploadedAvatar.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "User avatar image updated successfully"));
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageFilePath = req.file?.path;
    if (!coverImageFilePath) {
        throw new ApiError(400, "Cover Image file is required");
    }

    const uploadedCoverImage = await uploadToCloudinary(coverImageFilePath);
    if (!uploadedCoverImage.url) {
        throw new ApiError(500, "Error occurred while uploading cover image to cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: uploadedCoverImage.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "User cover image updated successfully"));
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToChannelsCount: {
                    $size: "subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                subscribedToChannelsCount: 1,
                isSubscribed: 1,
                email: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ])

    console.log("Channel Details : ", channel);

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found");
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "User channel fetched successfully"));
})

const getUserWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        email: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0].channel, "User watch history fetched successfully"));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeUserPassword,
    getCurrentUser,
    updateUserAvatarImage,
    updateUserCoverImage,
    updateUserAccountDetails,
    getUserChannelProfile,
    getUserWatchHistory
}