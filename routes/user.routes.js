import express from "express";
import {
  signup,
  login,
  refresh,
  logout,
} from "../controllers/auth.controller.js";

const router = express.Router();

// AUTH ROUTES
router.post("/sign-up", signup);   // register user
router.post("/login", login);      // login user
router.post("/refresh", refresh);  // refresh access token (cookie-based)
router.post("/logout", logout);    // logout user (clear refresh cookie)

export default router;
