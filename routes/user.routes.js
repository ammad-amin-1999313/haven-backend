import express from "express";
import {
  signup,
  login,
  refresh,
  logout,
  updateUser,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

// AUTH ROUTES
router.post("/sign-up", signup);   // register user
router.post("/login", login);      // login user
router.post("/refresh", refresh);  // refresh access token (cookie-based)
router.post("/logout", logout);    // logout user (clear refresh cookie)

// Update User Details
router.patch("/update/:id", requireAuth, updateUser); 

export default router;
