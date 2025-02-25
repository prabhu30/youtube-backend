import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

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

export { registerUser }