import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

export default function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Access token required", 401, "NO_ACCESS_TOKEN"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // payload has: sub (userId), role, iat, exp
    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    return next();
  } catch (err) {
    // token expired or invalid
    return next(new AppError("Invalid or expired access token", 401, "INVALID_ACCESS_TOKEN"));
  }
}
