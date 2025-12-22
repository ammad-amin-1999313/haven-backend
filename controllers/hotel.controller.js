import Hotel from "../models/Hotel.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @route POST /api/add-hotel
// @desc Create a new hotel
// @access Owner only
export const createHotel = asyncHandler(async (req, res) => {
    const ownerId = req.user.id; // from requireAuth middleware
    if (!ownerId) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    const { name, city, country, images, description, amenities, rating } = req.body;
    const hotel = new Hotel({
        name,
        city,
        country,
        images,
        description,
        amenities,
        rating,
        ownerId
    });
    await hotel.save();
    return res.status(201).json({ hotel });
})