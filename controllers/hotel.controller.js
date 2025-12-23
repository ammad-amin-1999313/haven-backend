import Hotel from "../models/Hotel.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { paginate } from "../utils/pagination.js";
import mongoose from "mongoose";

// @route POST /api/hotels/add-hotel
// @desc Create a new hotel
// @access Owner only
export const createHotel = asyncHandler(async (req, res) => {
    const ownerId = req.user.id; // from requireAuth middleware
    if (!ownerId) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    const { name, city, country, images, description, amenities, rating, startingPricePerNight, currency } = req.body;
    const hotel = new Hotel({
        name,
        city,
        country,
        images,
        description,
        amenities,
        rating,
        ownerId,
        startingPricePerNight,
        currency
    });
    await hotel.save();
    return res.status(201).json({ hotel });
})
// @route Patch /api/hotels/edit-hotel/:${id}
// @desc update hotel details
// @access Owner
export const updateHotelData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const hotel = await Hotel.findById(id);
    if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
    }
    // 3. Update the data
    // { new: true } returns the updated document
    // { runValidators: true } ensures the new data follows your Schema rules
    const updatedHotel = await Hotel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    );

    return res.status(200).json({
        success: true,
        message: "Hotel updated successfully",
        data: updatedHotel
    });

})
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
    const sort = ratingSort
        ? { rating: -1, createdAt: -1 }
        : { createdAt: -1 };

    const hotels = await Hotel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);

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
    const { id } = req.params
    const hotel = await Hotel.findById(id)
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Hotel ID format" });
    }
    if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
    }
    return res.status(200).json(hotel)
})

// @route GET /api/hotels/owner-hotels/{id}
// @desc Get hotels on the basic of ownerId
// @access Role:Owner
export const getOwnerHotels = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        return res.status(400).json({ message: "Invalid Owner ID format" });
    }

    const hotels = await Hotel.find({ ownerId: ownerId });

    if (!hotels || hotels.length === 0) {
        return res.status(404).json({
            message: "No hotels found for this owner",
            hotels: []
        });
    }
    return res.status(200).json({
        success: true,
        count: hotels.length,
        hotels
    });
});

