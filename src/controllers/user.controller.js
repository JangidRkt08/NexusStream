// import { User } from "../models/user.model.js";
// import { ApiError } from "../utils/ApiError.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { uploadonCloudinary } from "../utils/cloudinary.js";
// import { stringify } from "flatted";

// const registerUser = asyncHandler(async (req, res) => {
// ------------------------------------------------------------------------
// get user detail from frontend.
// Validation -> not empty
// check if user already exists: username or email
// check for images, check for avatar
// upload to cloudinary, avatar
// create user object - create entry in db
// remove password and refresh token field from response
// check for user creation
// return response

// ------------------------------------------------------------------------

//   const { fullname, username, email, password } = req.body;
//   // console.log("email", email);

//   if (
//     [fullname, username, email, password].some((field) => field?.trim() === "")
//   ) {
//     throw new ApiError(
//       400,
//       "All fields are required",
//       ["fullname", "username", "email", "password"].filter(
//         (field) => field?.trim() === ""
//       )
//     );
//   }

//   const existedUser = await User.findOne({ $or: [{ username }, { email }] });
//   if (existedUser) {
//     throw new ApiError(400, "User already exists");
//   }

//   const avatarLocalPath = req.files?.avatar[0]?.path;
//   const coverImageLocalPath = req.files?.coverImage[0]?.path;
//   if (!avatarLocalPath) {
//     throw new ApiError(400, "Avatar is required");
//   }

//   const avatar = await uploadonCloudinary(avatarLocalPath);
//   const coverImage = await uploadonCloudinary(coverImageLocalPath);
//   if (!avatar || !coverImage) {
//     throw new ApiError(400, "Image upload failed");
//   }

//   const user = await User.create({
//     fullname,
//     avatar: avatar.url,
//     coverImage: coverImage?.url || "",
//     username: username.toLowerCase(),
//     email,
//     password,
//   });
//   const createdUser = User.findById(user._id)
//     .select("-password -refreshToken")
//     .lean();
//   if (!createdUser) {
//     throw new ApiError(500, "Something went wrong while registering the user");
//     console.log("createdUser", user.fullname);
//   }
//   return res
//     .status(201)
//     .json(new ApiResponse(200, createdUser, "User created successfully"));
// });

// export { registerUser };

// ------------------------------------------------------------------------

import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { stringify } from "flatted";

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { fullname, username, email, password } = req.body;

    if (
      [fullname, username, email, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      throw new ApiError(
        400,
        "All fields are required",
        ["fullname", "username", "email", "password"].filter(
          (field) => field?.trim() === ""
        )
      );
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
      throw new ApiError(400, "User already exists");
    }
    // console.log(req.files);

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
      coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadonCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
      ? await uploadonCloudinary(coverImageLocalPath)
      : null;
    if (!avatar || (coverImageLocalPath && !coverImage)) {
      throw new ApiError(400, "Image upload failed");
    }

    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      username: username.toLowerCase(),
      email,
      password,
    });

    const createdUser = await User.findById(user._id)
      .select("-password -refreshToken")
      .lean();

    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(200, "User created successfully", createdUser));
  } catch (err) {
    console.error("Controller Error:", err);
    const errorResponse = {
      success: false,
      message: err.message,
      stack: err.stack,
    };

    // If a circular structure error occurs, stringify the error object using flatted
    res
      .status(err.statusCode || 500)
      .json(JSON.parse(stringify(errorResponse)));
  }
});


export { registerUser };
