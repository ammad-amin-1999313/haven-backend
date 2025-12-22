import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createHotel } from '../controllers/hotel.controller.js';



const router = express.Router();

// Owner-only: Add hotel
router.post("/add-hotel", requireAuth, requireRole("owner"), createHotel)

export default router;
