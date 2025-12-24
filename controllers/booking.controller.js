import asyncHandler from "../middleware/asyncHandler.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import RoomType from "../models/RoomType.js";
import { paginate } from "../utils/pagination.js";

const calcNights = (checkIn, checkOut) => {
  const s = new Date(checkIn);
  const e = new Date(checkOut);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  const diff = e.getTime() - s.getTime();
  const nights = Math.round(diff / (1000 * 60 * 60 * 24));
  return nights;
};

// @route POST /api/booking/create-booking
// @desc Create a new booking request
// @access Guest only
export const createBookingRequest = asyncHandler(async (req, res) => {
  const guestId = req.user.id;

  const {
    hotelId,
    roomTypeId,
    checkIn,
    checkOut,
    guestsAdults,
    roomsRequested,
    guestInfo,
  } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(hotelId) ||
    !mongoose.Types.ObjectId.isValid(roomTypeId)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid hotelId or roomTypeId" });
  }

  const nights = calcNights(checkIn, checkOut);
  if (!checkIn || !checkOut || nights <= 0) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Invalid dates (check-out must be after check-in)",
      });
  }

  if (!Number.isFinite(Number(guestsAdults)) || Number(guestsAdults) < 1) {
    return res
      .status(400)
      .json({ success: false, message: "guestsAdults must be >= 1" });
  }
  if (!Number.isFinite(Number(roomsRequested)) || Number(roomsRequested) < 1) {
    return res
      .status(400)
      .json({ success: false, message: "roomsRequested must be >= 1" });
  }

  // validate guest info (from confirm modal)
  if (!guestInfo?.fullName?.trim() || !guestInfo?.phone?.trim()) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Guest fullName and phone are required",
      });
  }

  const hotel = await Hotel.findById(hotelId);
  if (!hotel)
    return res.status(404).json({ success: false, message: "Hotel not found" });

  const roomType = await RoomType.findOne({ _id: roomTypeId, hotelId });
  if (!roomType)
    return res
      .status(404)
      .json({ success: false, message: "Room type not found for this hotel" });

  // ✅ Capacity logic:
  // guest selects one room type, system chooses roomsRequested accordingly (frontend helps)
  const capacity = Number(roomType.capacityAdults);
  const requiredRoomsMin = Math.ceil(Number(guestsAdults) / capacity);

  // Do not allow requesting fewer rooms than needed
  if (Number(roomsRequested) < requiredRoomsMin) {
    return res.status(400).json({
      success: false,
      message: `This room type fits ${capacity} adults. You need at least ${requiredRoomsMin} room(s) for ${guestsAdults} adults.`,
    });
  }

  // ✅ Availability check (simple version)
  // For now, just check declared room quantity.
  // Later: subtract overlapping approved/pending bookings.
  if (Number(roomsRequested) > Number(roomType.quantity)) {
    return res.status(400).json({
      success: false,
      message: `Only ${roomType.quantity} rooms available for this room type.`,
    });
  }

  const pricePerNight = Number(roomType.pricePerNight);
  const totalAmount = pricePerNight * nights * Number(roomsRequested);

  const booking = await Booking.create({
    hotelId,
    roomTypeId,
    guestId,
    checkIn,
    checkOut,
    guestsAdults: Number(guestsAdults),
    roomsRequested: Number(roomsRequested),
    currency: hotel.currency || "USD",
    pricePerNight,
    totalAmount,
    guestInfo: {
      fullName: guestInfo.fullName.trim(),
      phone: guestInfo.phone.trim(),
      email: guestInfo.email?.trim() || "",
      arrivalTime: guestInfo.arrivalTime?.trim() || "",
      notes: guestInfo.notes?.trim() || "",
    },
    status: "pending",
  });

  return res.status(201).json({
    success: true,
    message: "Booking request submitted (pending approval).",
    booking,
  });
});

// @route GET /api/booking/my-bookings
// desc guest booking list
// @access Guest only
export const getMyBookings = asyncHandler(async (req, res) => {
  const guestId = req.user.id;

  // pagination
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "10", 10), 1),
    50
  );
  const skip = (page - 1) * limit;

  // optional filter
  const status = req.query.status?.trim();
  const allowedStatuses = ["pending", "approved", "rejected", "cancelled"];

  const filter = { guestId };

  if (status && allowedStatuses.includes(status)) {
    filter.status = status;
  }

  const [bookings, totalItems] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("hotelId", "name city country images")
      .populate("roomTypeId", "title capacityAdults pricePerNight"),
    Booking.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    metadata: paginate({ totalItems, page, limit }),
    bookings,
  });
});

// @route GET /api/booking/owner-booking-list
// @desc get owner booking requests
// @access owner only
export const getOwnerBookingRequests = asyncHandler(async (req, res) => {
  const ownerId = req.user.id;

  // pagination
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "10", 10), 1),
    50
  );
  const skip = (page - 1) * limit;

  // optional filter
  const status = req.query.status?.trim();
  const allowedStatuses = ["pending", "approved", "rejected", "cancelled"];

  // find hotels owned by owner
  const hotels = await Hotel.find({ ownerId }).select("_id");
  const hotelIds = hotels.map((h) => h._id);

  // If owner has no hotels, return empty paginated response (clean UX)
  if (hotelIds.length === 0) {
    return res.status(200).json({
      success: true,
      metadata: paginate({ totalItems: 0, page, limit }),
      bookings: [],
    });
  }

  const filter = { hotelId: { $in: hotelIds } };

  if (status && allowedStatuses.includes(status)) {
    filter.status = status;
  }

  const [bookings, totalItems] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("hotelId", "name city country")
      .populate("roomTypeId", "title capacityAdults pricePerNight")
      .populate("guestId", "name email"),
    Booking.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    metadata: paginate({ totalItems, page, limit }),
    bookings,
  });
});

// @route PATCH /api/bookings/:id/decision
export const decideBookingRequest = asyncHandler(async (req, res) => {
  const ownerId = req.user.id;
  const { id } = req.params;
  const { decision, reason } = req.body; // decision: "approved" | "rejected"

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid booking id" });
  }
  if (!["approved", "rejected"].includes(decision)) {
    return res
      .status(400)
      .json({
        success: false,
        message: "decision must be approved or rejected",
      });
  }

  const booking = await Booking.findById(id);
  if (!booking)
    return res
      .status(404)
      .json({ success: false, message: "Booking not found" });

  // verify owner owns this hotel
  const hotel = await Hotel.findById(booking.hotelId);
  if (!hotel)
    return res.status(404).json({ success: false, message: "Hotel not found" });

  if (hotel.ownerId.toString() !== ownerId) {
    return res
      .status(403)
      .json({ success: false, message: "Forbidden: not your hotel" });
  }

  if (booking.status !== "pending") {
    return res
      .status(400)
      .json({
        success: false,
        message: "Only pending bookings can be decided",
      });
  }

  booking.status = decision;
  booking.ownerDecision = {
    decidedAt: new Date(),
    decidedBy: ownerId,
    reason: reason?.trim() || "",
  };

  await booking.save();

  return res.status(200).json({
    success: true,
    message: `Booking ${decision}.`,
    booking,
  });
});
