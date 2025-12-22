import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
        roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: true, index: true },
        checkIn: { type: Date, required: true, index: true },
        checkOut: { type: Date, required: true, index: true }, // treat as exclusive (standard)
        rooms: { type: Number, required: true, min: 1, default: 1 },
        adults: { type: Number, required: true, min: 1 },
        status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed", index: true },
    },
    { timestamps: true }
);

// Useful compound index for overlap queries
BookingSchema.index({ roomTypeId: 1, checkIn: 1, checkOut: 1, status: 1 });

export default mongoose.model("Booking", BookingSchema);
