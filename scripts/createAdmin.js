import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import argon2 from "argon2";
import User from "../models/User.js";

async function createAdmin() {
  try {
    // 1. Validate env vars
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error("ADMIN_EMAIL or ADMIN_PASSWORD missing in .env");
    }

    // 2. Connect DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const email = process.env.ADMIN_EMAIL.toLowerCase();

    // 3. Check if admin already exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("⚠️ Admin already exists:", email);
      return;
    }

    // 4. Hash password
    const passwordHash = await argon2.hash(process.env.ADMIN_PASSWORD);

    // 5. Create admin user
    const admin = await User.create({
      firstName: process.env.ADMIN_FIRST_NAME || "Haven",
      lastName: process.env.ADMIN_LAST_NAME || "Admin",
      email,
      passwordHash,
      role: "admin",
    });

    console.log("✅ Admin created successfully:");
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
  } catch (err) {
    console.error("❌ Failed to create admin:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
