import Hotel from "../models/Hotel.js";
import RoomType from "../models/RoomType.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { paginate } from "../utils/pagination.js";
import mongoose from "mongoose";

// @route POST /api/hotels/add-hotel
// @desc Create a new hotel
// @access Owner only
export const createHotel = asyncHandler(async (req, res) => {
  const ownerId = req.user.id;
  if (!ownerId) return res.status(401).json({ message: "Unauthorized" });

  const {
    name,
    city,
    country,
    images = [],
    description,
    amenities = [],
    rating,
    currency = "USD",
    roomTypes = [],
  } = req.body;

  if (!name || !city || !country) {
    return res
      .status(400)
      .json({ message: "name, city, country are required" });
  }

  if (!Array.isArray(roomTypes) || roomTypes.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one room type is required" });
  }

  // ✅ compute starting price from roomTypes (don’t trust frontend field)
  const startingPricePerNight = Math.min(
    ...roomTypes.map((r) => Number(r.pricePerNight))
  );

  const session = await mongoose.startSession();
  let createdHotel;

  try {
    await session.withTransaction(async () => {
      const [hotel] = await Hotel.create(
        [
          {
            ownerId,
            name,
            city,
            country,
            images,
            description,
            amenities,
            rating,
            startingPricePerNight,
            currency,
          },
        ],
        { session }
      );

      const roomDocs = roomTypes.map((rt) => ({
        hotelId: hotel._id,
        title: rt.title,
        capacityAdults: rt.capacityAdults,
        quantity: rt.quantity,
        pricePerNight: rt.pricePerNight,
        amenities: rt.amenities || [],
        images: rt.images || [],
      }));

      await RoomType.insertMany(roomDocs, { session });
      createdHotel = hotel;
    });

    return res.status(201).json({
      success: true,
      hotel: createdHotel,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
});

// -----------
// @route Patch /api/hotels/edit-hotel/:${id}
// @desc update hotel details
// @access Owner
export const updateHotelData = asyncHandler(async (req, res) => {
  const { id: hotelId } = req.params;
  const ownerId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(hotelId)) {
    return res.status(400).json({ message: "Invalid Hotel ID format" });
  }

  const { hotel: hotelData, roomTypes } = req.body;

  if (!hotelData || !Array.isArray(roomTypes)) {
    return res.status(400).json({
      message: "hotel data and roomTypes array are required",
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // 1️⃣ Fetch & ownership check
      const hotel = await Hotel.findById(hotelId).session(session);
      if (!hotel) throw new Error("Hotel not found");

      if (hotel.ownerId.toString() !== ownerId) {
        throw new Error("Forbidden: not your hotel");
      }

      // Prevent ownership tampering
      delete hotelData.ownerId;

      // 2️⃣ Update hotel fields
      await Hotel.findByIdAndUpdate(hotelId, hotelData, {
        runValidators: true,
        session,
      });

      // 3️⃣ Sync room types
      const existingRoomTypes = await RoomType.find({ hotelId }).session(
        session
      );
      const existingIds = existingRoomTypes.map((rt) => rt._id.toString());

      const incomingIds = roomTypes
        .filter((rt) => rt._id)
        .map((rt) => rt._id.toString());

      // A) UPDATE existing room types
      for (const rt of roomTypes.filter((r) => r._id)) {
        if (!mongoose.Types.ObjectId.isValid(rt._id)) {
          throw new Error("Invalid RoomType ID");
        }

        await RoomType.findOneAndUpdate(
          { _id: rt._id, hotelId },
          {
            title: rt.title,
            capacityAdults: rt.capacityAdults,
            quantity: rt.quantity,
            pricePerNight: rt.pricePerNight,
          },
          { runValidators: true, session }
        );
      }

      // B) CREATE new room types
      const newRoomTypes = roomTypes
        .filter((rt) => !rt._id)
        .map((rt) => ({
          hotelId,
          title: rt.title,
          capacityAdults: rt.capacityAdults,
          quantity: rt.quantity,
          pricePerNight: rt.pricePerNight,
        }));

      if (newRoomTypes.length) {
        await RoomType.insertMany(newRoomTypes, { session });
      }

      // C) DELETE removed room types
      const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

      if (toDelete.length) {
        await RoomType.deleteMany(
          { hotelId, _id: { $in: toDelete } },
          { session }
        );
      }

      // 4️⃣ Recalculate startingPricePerNight
      const prices = await RoomType.find({ hotelId })
        .select("pricePerNight")
        .session(session);

      if (!prices.length) {
        throw new Error("Hotel must have at least one room type");
      }

      const minPrice = Math.min(...prices.map((p) => p.pricePerNight));

      await Hotel.findByIdAndUpdate(
        hotelId,
        { startingPricePerNight: minPrice },
        { session }
      );
    });

    return res.status(200).json({
      success: true,
      message: "Hotel and room types updated successfully",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    session.endSession();
  }
});
// @route GET /api/hotels
// @desc Get all hotels with optional filters
// @access Public
export const getHotels = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const search = req.query.search?.trim();
  const ratingSort = req.query.rating; // flag → sort by rating desc
  const amenitiesParam = req.query.amenities; // "wifi,pool,parking"
  const priceUpTo = req.query.price; // e.g. 250

  const filter = {};

  // ✅ Search by name / city / country
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { country: { $regex: search, $options: "i" } },
    ];
  }

  // ✅ Amenities filter (ALL selected)
  if (amenitiesParam) {
    const amenities = amenitiesParam
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    if (amenities.length > 0) {
      filter.amenities = { $all: amenities };
    }
  }

  // ✅ Price filter (UP TO X)
  if (priceUpTo) {
    filter.startingPricePerNight = {
      $lte: Number(priceUpTo),
    };
  }

  // ✅ Sorting
  // default → newest
  // rating flag → rating high → low
  const sort = ratingSort ? { rating: -1, createdAt: -1 } : { createdAt: -1 };

  const hotels = await Hotel.find(filter).sort(sort).skip(skip).limit(limit);

  const totalItems = await Hotel.countDocuments(filter);

  const metadata = paginate({ totalItems, page, limit });

  res.status(200).json({
    success: true,
    metadata,
    hotels,
  });
});

// @route GET /api/hotels/hotel-details/{id}
// @desc Get single hotel details on the basic of id
// @access Public
export const getSingleHotel = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid Hotel ID format" });
  }

  const hotel = await Hotel.findById(id);
  if (!hotel) {
    return res.status(404).json({ message: "Hotel not found" });
  }

  const roomTypes = await RoomType.find({ hotelId: id }).sort({ createdAt: 1 });

  return res.status(200).json({
    hotel,
    roomTypes,
  });
});

// @route GET /api/hotels/owner-hotels/{id}
// @desc Get hotels on the basic of ownerId
// @access Role:Owner
export const getOwnerHotels = asyncHandler(async (req, res) => {
  const ownerId = req.user.id;

  const hotels = await Hotel.aggregate([
    // 1️⃣ Only owner hotels
    { $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } },

    // 2️⃣ BOOKINGS COUNTS
    {
      $lookup: {
        from: "bookings",
        let: { hid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$hotelId", "$$hid"] } } },
          {
            $group: {
              _id: null,
              totalBookingsCount: { $sum: 1 },
              activeRequestsCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
                },
              },
            },
          },
        ],
        as: "bookingCounts",
      },
    },

    // 3️⃣ ROOMS COUNT (sum of room quantities)
    {
      $lookup: {
        from: "roomtypes", // ⚠️ collection name (check exact name)
        let: { hid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$hotelId", "$$hid"] } } },
          {
            $group: {
              _id: null,
              totalRoomsCount: { $sum: "$quantity" },
            },
          },
        ],
        as: "roomCounts",
      },
    },

    // 4️⃣ FLATTEN COUNTS + DEFAULTS
    {
      $addFields: {
        totalBookingsCount: {
          $ifNull: [
            { $arrayElemAt: ["$bookingCounts.totalBookingsCount", 0] },
            0,
          ],
        },
        activeRequestsCount: {
          $ifNull: [
            { $arrayElemAt: ["$bookingCounts.activeRequestsCount", 0] },
            0,
          ],
        },
        totalRoomsCount: {
          $ifNull: [{ $arrayElemAt: ["$roomCounts.totalRoomsCount", 0] }, 0],
        },
      },
    },

    // 5️⃣ CLEANUP
    { $project: { bookingCounts: 0, roomCounts: 0 } },

    // 6️⃣ SORT
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).json({
    success: true,
    count: hotels.length,
    hotels,
  });
});
