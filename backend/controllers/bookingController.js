
import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import ParkingLot from "../models/ParkingLot.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { activeBookingFilter } from "../utils/availability.js";
import { checkVehicleNumber } from "../utils/vehicle.js";
import { createRazorpayOrder, refundBooking, refundableAmount, ensureLedger } from "../utils/razorpay.js";

const MAX_HOURS = 24;

// CREATE booking
export const createBooking = asyncHandler(async (req, res) => {
  const { slotId, startTime, endTime, vehicleNumber } = req.body;

  if (!slotId || !startTime || !endTime) {
    return res.status(400).json({
      message: "Slot, start time and end time are required",
    });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return res.status(400).json({
      message: "Choose valid start and end times",
    });
  }

  if (start < new Date(Date.now() - 60 * 1000)) {
    return res.status(400).json({
      message: "Start time is in the past",
    });
  }

  if (end <= start) {
    return res.status(400).json({
      message: "End time must be after start time",
    });
  }

  const hours = (end - start) / 3600000;

  if (hours > MAX_HOURS) {
    return res.status(400).json({
      message: `Maximum booking is ${MAX_HOURS} hours`,
    });
  }

  const vehicle = (
    vehicleNumber || req.user.vehicleNumber || ""
  ).trim();

  if (!vehicle) {
    return res.status(400).json({
      message: "Vehicle number is required",
    });
  }

  const check = checkVehicleNumber(vehicle);
  if (!check.valid) {
    return res.status(400).json({ message: check.message });
  }
  const normalizedVehicle = check.normalized;

  const slot = await Slot.findById(slotId);

  if (!slot || !slot.isActive) {
    return res.status(404).json({
      message: "Slot not found",
    });
  }

  const lot = await ParkingLot.findOne({
    _id: slot.lot,
    isActive: true,
  });

  if (!lot) {
    return res.status(404).json({
      message: "Parking lot not found or inactive",
    });
  }

  // Reject overlapping confirmed bookings for this slot
  const clash = await Booking.findOne({
    ...activeBookingFilter(),
    slot: slot._id,
    startTime: { $lt: end },
    endTime: { $gt: start },
  });

  if (clash) {
    return res.status(409).json({
      message: `Slot ${slot.label} is already booked for that time`,
    });
  }

  const amount = Math.ceil(hours) * lot.pricePerHour;

  const booking = await Booking.create({
    user: req.user._id,
    lot: lot._id,
    slot: slot._id,
    vehicleNumber: normalizedVehicle,
    startTime: start,
    endTime: end,
    amount,
    status: "pending_payment",
    payment: "pending",
  });

  await booking.populate([
    { path: "lot", select: "name address" },
    { path: "slot", select: "label type" },
  ]);

  res.status(201).json(booking);
});

// READ my bookings
export const myBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    user: req.user._id,
  })
    .populate("lot", "name address")
    .populate("slot", "label type")
    .sort("-startTime");

  res.json(bookings);
});

// READ all bookings (admin)
export const allBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate("user", "name email")
    .populate("lot", "name")
    .populate("slot", "label")
    .sort("-createdAt")
    .limit(200);

  res.json(bookings);
});

// UPDATE booking end time
export const updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({
      message: "Booking not found",
    });
  }

  if (
    String(booking.user) !== String(req.user._id) &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      message: "Not your booking",
    });
  }

  if (booking.status !== "confirmed") {
    return res.status(400).json({
      message: "Cancelled bookings cannot be changed",
    });
  }

  if (!req.body.endTime) {
    return res.status(400).json({
      message: "End time is required",
    });
  }

  const end = new Date(req.body.endTime);

  if (
    Number.isNaN(end.getTime()) ||
    end <= booking.startTime
  ) {
    return res.status(400).json({
      message: "Choose a valid end time",
    });
  }

  const hours = (end - booking.startTime) / 3600000;

  if (hours > MAX_HOURS) {
    return res.status(400).json({
      message: `Maximum booking is ${MAX_HOURS} hours`,
    });
  }

  if (end <= new Date()) {
    return res.status(400).json({
      message: "End time must be in the future",
    });
  }

  // Check for conflicts with other bookings (confirmed or inside their payment window)
  const clash = await Booking.findOne({
    ...activeBookingFilter(),
    _id: { $ne: booking._id },
    slot: booking.slot,
    startTime: { $lt: end },
    endTime: { $gt: booking.startTime },
  });

  if (clash) {
    return res.status(409).json({
      message: "Slot is booked by someone else during that time",
    });
  }

  const lot = await ParkingLot.findById(booking.lot);

  if (!lot) {
    return res.status(404).json({
      message: "Parking lot not found",
    });
  }

  ensureLedger(booking);
  const newAmount = Math.ceil(hours) * lot.pricePerHour;
  const diff = newAmount - booking.amount;

  // Longer stay: the extra amount must be paid before the booking changes.
  if (diff > 0) {
    const order = await createRazorpayOrder({
      rupees: diff,
      receipt: `ext_${booking._id}`,
      notes: { bookingId: String(booking._id), type: "extension" },
    });
    booking.pendingExtension = { endTime: end, amount: newAmount, diff, orderId: order.id };
    await booking.save();
    return res.status(202).json({
      requiresPayment: true,
      extraAmount: diff,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      bookingId: String(booking._id),
    });
  }

  // Shorter stay: refund the difference, but only while the booking hasn't started.
  if (diff < 0) {
    if (booking.startTime > new Date()) {
      const refunded = await refundBooking(booking, -diff);
      booking.endTime = end;
      booking.amount = newAmount;
      await booking.save();
      return res.json({ booking, refunded, message: `Booking shortened. ₹${refunded} refunded.` });
    }
    booking.endTime = end;
    await booking.save();
    return res.json({
      booking,
      refunded: 0,
      message: "Booking shortened. No refund because parking has already started.",
    });
  }

  booking.endTime = end;
  await booking.save();

  res.json({ booking, refunded: 0, message: "Booking updated" });
});

// CANCEL booking
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({
      message: "Booking not found",
    });
  }

  if (
    String(booking.user) !== String(req.user._id) &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      message: "Not your booking",
    });
  }

  if (booking.status === "cancelled") {
    return res.status(400).json({
      message: "Booking is already cancelled",
    });
  }

  // Refund policy: full refund if cancelled before the start time, none once parking has started.
  let refunded = 0;
  let note = "";
  if (booking.status === "confirmed") {
    const outstanding = refundableAmount(booking);
    if (outstanding > 0) {
      if (booking.startTime > new Date()) {
        // If Razorpay rejects the refund this throws and the booking stays active.
        refunded = await refundBooking(booking, outstanding);
      } else {
        note = " No refund because parking has already started.";
      }
    }
  }

  booking.status = "cancelled";
  booking.pendingExtension = undefined;
  await booking.save();

  res.json({
    message: refunded > 0
      ? `Booking cancelled. ₹${refunded} will be refunded to your original payment method in 5-7 working days.`
      : `Booking cancelled.${note}`,
    refunded,
  });
});
