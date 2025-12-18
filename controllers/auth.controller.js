import asyncHandler from "../middleware/asyncHandler.js";
import {
  signupService,
  loginService,
  refreshService,
} from "../services/auth.service.js";

// @route   POST /auth/sign-up
// @desc    Register new user
// @access  Public
export const signup = asyncHandler(async (req, res) => {
  const result = await signupService(req.body);

  // set refresh token cookie
  res.cookie("refreshToken", result.refreshToken, result.cookieOptions);

  return res.status(201).json({
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
