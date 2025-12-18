import AppError from "../utils/AppError.js";

export default function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = "Something went wrong";
  let code = "INTERNAL_ERROR";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }

  if (err?.code === 11000) {
    statusCode = 409;
    message = "Email already exists";
    code = "DUPLICATE_KEY";
  }

  if (err?.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    code = "TOKEN_EXPIRED";
  }

  if (err?.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    code = "INVALID_TOKEN";
  }

  const response = { message, code };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}
