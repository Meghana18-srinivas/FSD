
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingLot",
      required: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
      index: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    payment: { type: String, default: "pending" }, // pending | paid | partially_refunded | refunded
    paidAmount: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 },
    payments: [
      {
        orderId: String,
        paymentId: String,
        amount: Number, // rupees
        refunded: { type: Number, default: 0 },
        _id: false,
      },
    ],
    // Set while a paid extension is waiting for payment; applied only after verification.
    pendingExtension: {
      endTime: Date,
      amount: Number, // new total price
      diff: Number, // extra rupees to pay
      orderId: String,
      _id: false,
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending_payment", "confirmed", "cancelled"],
      default: "pending_payment",
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
