import argon2 from "argon2";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
} from "../utils/tokens.js";

export const toSafeUser = (user) => {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    // Add this line to format the date
    joinedDate: user.createdAt 
      ? new Date(user.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        }) 
      : "Recent"
  };
};

// SIGNUP
export async function signupService({ firstName, lastName, email, password, role }) {
  if (!firstName || !lastName || !email || !password) {
    throw new AppError("Missing required fields", 400, "VALIDATION_ERROR");
  }

  // only guest/owner can sign up from UI
  const finalRole = role === "owner" ? "owner" : "guest";

  const passwordHash = await argon2.hash(password);

  try {
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      role: finalRole,
    });

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const refreshToken = signRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
      cookieOptions: refreshCookieOptions(),
    };
  } catch (err) {
    // Unique email error from Mongo
    if (err?.code === 11000) {
      throw new AppError("Email already exists", 409, "EMAIL_ALREADY_EXISTS");
    }
    throw err;
  }
}

// LOGIN
export async function loginService({ email, password, role }) {
  if (!email || !password) {
    throw new AppError("Email and password are required", 400, "VALIDATION_ERROR");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  // optional: enforce role-based login
  if (role && user.role !== role) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) {
    console.log("LOGIN INPUT:", { email, role,password });
    // console.log("FOUND USER?", !!user);
    // if (user) console.log("USER EMAIL/ROLE:", user.email, user.role);

    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    role: user.role,
  });

  const refreshToken = signRefreshToken({
    userId: user._id.toString(),
    role: user.role,
  });

  return {
    user: toSafeUser(user),
    accessToken,
    refreshToken,
    cookieOptions: refreshCookieOptions(),
  };
}

// REFRESH (new access token using refresh cookie)
export async function refreshService(refreshToken) {
  if (!refreshToken) {
    throw new AppError("Missing refresh token", 401, "MISSING_REFRESH_TOKEN");
  }

  // verifyRefreshToken will throw TokenExpiredError / JsonWebTokenError
  const payload = verifyRefreshToken(refreshToken);

  const userId = payload.sub;
  if (!userId) {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 401, "USER_NOT_FOUND");
  }

  // rotate refresh token
  const newAccessToken = signAccessToken({
    userId: user._id.toString(),
    role: user.role,
  });

  const newRefreshToken = signRefreshToken({
    userId: user._id.toString(),
    role: user.role,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    cookieOptions: refreshCookieOptions(),
    user: toSafeUser(user),
  };
}
