import asyncHandler from "../middleware/asyncHandler.js";
import {
  signupService,
  loginService,
  refreshService,
} from "../services/auth.service.js";
import User from "../models/User.js";
import argon2 from "argon2";

// @route   POST /auth/sign-up
// @desc    Register new user
// @access  Public
export const signup = asyncHandler(async (req, res) => {
  const result = await signupService(req.body);

  // set refresh token cookie
  res.cookie("refreshToken", result.refreshToken, result.cookieOptions);

  return res.status(201).json({
    message: "User registered successfully",
    user: result.user,
    accessToken: result.accessToken,
  });
});

// @route   POST /auth/login
// @desc    Authenticate user & get tokens
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const result = await loginService(req.body);

  res.cookie("refreshToken", result.refreshToken, result.cookieOptions);

  return res.status(200).json({
    message: "User logged in successfully",
    user: result.user,
    accessToken: result.accessToken,
  });
});

// @route   POST /auth/refresh
// @desc    Refresh access token (rotate refresh token)
// @access  Public (uses HttpOnly refresh cookie)
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  const result = await refreshService(token);

  // rotate cookie
  res.cookie("refreshToken", result.refreshToken, result.cookieOptions);

  return res.status(200).json({
    user: result.user,
    accessToken: result.accessToken,
  });
});

// @route   POST /auth/logout
// @desc    Logout user (clear refresh token cookie)
// @access  Public
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("refreshToken", { path: "/auth/refresh" });
  return res.status(200).json({ message: "Logged out" });
});

// @route   PATCH /auth/update
// @desc    Update user details
// @access  Private (requireAuth middleware)
export const updateUser = asyncHandler(async (req, res) => {
  // For logged-in user route: /users/me (requireAuth sets req.user.id)
  // Fallback to params if you also use /users/:id
  const userId = req.user?.id || req.params.id;

  console.log(req.body);
  const { firstName, lastName, email, phone, password } = req.body;
  
  // IMPORTANT: passwordHash is select:false in schema, so we must explicitly select it
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.firstName = firstName ?? user.firstName;
  user.lastName  = lastName  ?? user.lastName;
  user.email     = email     ?? user.email;
  user.phone     = phone     ?? user.phone;

  // Password update (store hash only)
  if (password) {
    user.passwordHash = await argon2.hash(password);
  }

  const updatedUser = await user.save();

  res.status(200).json({
    message: "User updated successfully",
    user: {
      id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    },
  });
});

