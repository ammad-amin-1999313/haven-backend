import mongoose from "mongoose";

const HotelSchema = new mongoose.Schema(
    {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        city: { type: String, required: true, index: true },
        country: { type: String, required: true, index: true },
        images: [{ type: String }], // Array of image URLs
        description: { type: String },
        amenities: [String],
        rating: { type: Number, min: 0, max: 5 },
    },
    { timestamps: true }
);

export default mongoose.model("Hotel", HotelSchema);
