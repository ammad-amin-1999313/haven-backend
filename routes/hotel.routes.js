import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createHotel, getHotels, getOwnerHotels, getSingleHotel, updateHotelData } from '../controllers/hotel.controller.js';



const router = express.Router();

// Owner-only: Add hotel
router.post("/add-hotel", requireAuth, requireRole("owner"), createHotel)
// Public: Get all hotels
router.get("/", getHotels)
// Public: Get single hotel details
router.get("/hotel-details/:id", getSingleHotel)
// Owner-only: Get Own hootels data
router.get("/owner-hotels/:ownerId", requireAuth, requireRole("owner"), getOwnerHotels)
// Owner-only: edit hotel data
router.patch("/edit-hotel/:id", requireAuth, requireRole("owner"), updateHotelData)

export default router;
