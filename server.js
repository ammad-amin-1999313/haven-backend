import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/dbConnection.js";
import allowedOrigins from "./config/allowedOrigins.js";
import authRoutes from "./routes/user.routes.js";
import hotelRoutes from "./routes/hotel.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import errorHandler from "./middleware/errorHandler.js";
// sardarammad6_db_user
// s1I5MH373PcYo3b4
const app = express();

// ---------- Middleware ----------
app.use(express.json());
app.use(cookieParser());

// ---------- CORS ----------
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (Postman, curl, mobile apps)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // REQUIRED for HttpOnly cookies
  })
);

// ---------- Routes ----------
app.use("/auth", authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/booking",bookingRoutes)
app.use(errorHandler); // Custom error handler middleware

const PORT = process.env.PORT || 3500;

// ---------- Start Server ----------
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
