import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
    {
        hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
        roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: true, index: true },

        guestId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

        // dates
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },

        // counts
        guestsAdults: { type: Number, required: true, min: 1 },
        roomsRequested: { type: Number, required: true, min: 1 },

        // money snapshot (important)
        currency: { type: String, default: "USD" },
        pricePerNight: { type: Number, required: true, min: 0 }, // snapshot from roomType at booking time
        totalAmount: { type: Number, required: true, min: 0 },   // snapshot

        // info collected in confirm modal
        guestInfo: {
            fullName: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true },
            email: { type: String, trim: true },
            arrivalTime: { type: String, trim: true },
            notes: { type: String, trim: true },
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "cancelled"],
            default: "pending",
            index: true,
        },

        ownerDecision: {
            decidedAt: { type: Date },
            decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            reason: { type: String, trim: true },
        },
    },
    { timestamps: true }
);

// helpful for sorting per hotel
BookingSchema.index({ hotelId: 1, createdAt: -1 });

export default mongoose.model("Booking", BookingSchema);
