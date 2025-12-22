import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Invalid email"],
    },

    // E.164 recommended: +[country][number]
    phone: {
      type: String,
      trim: true,
      default: null,
      match: [/^[\d\s()+-]{8,20}$/, "Invalid phone number"],
      index: true,
    },

    passwordHash: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: ["guest", "owner", "admin"],
      required: true,
      default: "guest",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
