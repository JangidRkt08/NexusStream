import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { stringify } from "flatted";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({
      validateBeforeSave: false,
    });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { fullname, username, email, password } = req.body;

    if (
      //.some method checks for individual fields and if any one of them is true then it returns true
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
      throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
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

const loginUser = asyncHandler(async (req, res) => {
  //  req body -> data
  // username or email
  // check user
  // check password
  // create access token and refresh token
  // send cookies
  // send response

  const { email, username, password } = req.body;
  // console.log("Request Body: ", req.body);
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }
  const user = await User.findOne({ $or: [{ username }, { email }] }); // $or: operator find one value whether it is username or email
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordvalid = await user.isPasswordCorrect(password);
  if (!isPasswordvalid) {
    throw new ApiError(401, "Password Incorrect");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refereshToken"
  );

  // For cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = //send by user
    req.cookies.refereshToken || req.body.refereshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unAuthorised Token");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "invalid refresh Token");
    }
    if (incomingRefreshToken !== user.refereshToken) {
      throw new ApiError(401, "refresh Token is expired or Used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong while refreshing tokens"
    );
  }
});
export { registerUser, loginUser, logoutUser, refreshAccessToken };
