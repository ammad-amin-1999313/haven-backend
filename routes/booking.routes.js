import express from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import { requireRole } from "../middleware/requireRole.js"
import { createBookingRequest, decideBookingRequest, getMyBookings, getOwnerBookingRequests } from "../controllers/booking.controller.js";


const router = express.Router()

// Guest-only : booking request
router.post("/create-booking", requireAuth, requireRole("guest"), createBookingRequest)
// Guest: my bookings/requests (history)
router.get("/my-bookings", requireAuth, requireRole("guest"), getMyBookings);
// Owner: list booking requests for my hotels
router.get("/owner-booking-list", requireAuth, requireRole("owner"), getOwnerBookingRequests);
// Owner: approve/reject (decision)
router.patch("/:id/decision", requireAuth, requireRole("owner"), decideBookingRequest);

export default router