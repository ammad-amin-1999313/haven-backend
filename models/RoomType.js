import mongoose from "mongoose";

const RoomTypeSchema = new mongoose.Schema(
    {
        hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
        title: { type: String, required: true }, // e.g. "Standard Double"
        capacityAdults: { type: Number, required: true, min: 1, index: true }, // 2,3,4...
        quantity: { type: Number, required: true, min: 1 }, // how many rooms of this type exist
        pricePerNight: { type: Number, required: true, min: 0 },
        amenities: [String],
        images: [String],
    },
    { timestamps: true }
);

export default mongoose.model("RoomType", RoomTypeSchema);
