import Booking from "../models/Booking.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { HOLD_MINUTES, activeBookingFilter } from "../utils/availability.js";
import { createRazorpayOrder, signatureValid, refundBooking } from "../utils/razorpay.js";

const orderResponse = (order, bookingId) => ({
  orderId: order.id,
  amount: order.amount,
  currency: order.currency,
  keyId: process.env.RAZORPAY_KEY_ID,
  bookingId: String(bookingId),
});

const readProof = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ message: "Payment verification details are required" });
    return null;
  }
  if (!process.env.RAZORPAY_KEY_SECRET) {
    res.status(503).json({ message: "Razorpay secret is missing on the server." });
    return null;
  }
  return { razorpay_order_id, razorpay_payment_id, razorpay_signature };
};

// Pay for a new booking ----------------------------------------------------

export const createOrder = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.user) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your booking" });
  }
  if (booking.status !== "pending_payment" || booking.payment === "paid") {
    return res.status(400).json({ message: "This booking is not awaiting payment" });
  }
  if (Date.now() - new Date(booking.createdAt).getTime() > HOLD_MINUTES * 60 * 1000) {
    return res.status(410).json({ message: "This booking expired. Please select the bay again." });
  }

  const order = await createRazorpayOrder({
    rupees: booking.amount,
    receipt: `booking_${booking._id}`,
    notes: { bookingId: String(booking._id), userId: String(req.user._id) },
  });
  booking.razorpayOrderId = order.id;
  await booking.save();

  res.status(201).json(orderResponse(order, booking._id));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const proof = readProof(req, res);
  if (!proof) return;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = proof;

  const booking = await Booking.findOne({
    _id: req.params.bookingId,
    user: req.user._id,
    razorpayOrderId: razorpay_order_id,
  });
  if (!booking) return res.status(404).json({ message: "Booking/order not found" });

  if (booking.payment === "paid" && booking.status === "confirmed") {
    return res.json({ message: "Payment already verified", bookingId: booking._id });
  }
  if (booking.status === "cancelled") {
    return res.status(400).json({ message: "This booking was cancelled. If money was debited, contact support for a refund." });
  }
  if (!signatureValid(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return res.status(400).json({ message: "Payment signature is invalid" });
  }

  booking.payment = "paid";
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.paidAmount = booking.amount;
  booking.payments.push({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    amount: booking.amount,
    refunded: 0,
  });
  booking.status = "confirmed";
  await booking.save();
  res.json({ message: "Payment verified and booking confirmed", bookingId: booking._id });
});

// Pay the difference when extending a booking -------------------------------

export const verifyExtension = asyncHandler(async (req, res) => {
  const proof = readProof(req, res);
  if (!proof) return;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = proof;

  const booking = await Booking.findOne({
    _id: req.params.bookingId,
    user: req.user._id,
    "pendingExtension.orderId": razorpay_order_id,
  });
  if (!booking) {
    return res.status(404).json({ message: "No pending extension found for this payment" });
  }
  if (!signatureValid(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return res.status(400).json({ message: "Payment signature is invalid" });
  }
  if (booking.status !== "confirmed") {
    return res.status(400).json({ message: "This booking is no longer active" });
  }

  const ext = booking.pendingExtension;

  // Record the money first so it can always be refunded.
  booking.payments.push({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, amount: ext.diff, refunded: 0 });
  booking.paidAmount = (booking.paidAmount || 0) + ext.diff;
  await booking.save();

  // Someone may have taken the bay while the user was paying.
  const clash = await Booking.findOne({
    ...activeBookingFilter(),
    _id: { $ne: booking._id },
    slot: booking.slot,
    startTime: { $lt: ext.endTime },
    endTime: { $gt: booking.startTime },
  });
  if (clash) {
    await refundBooking(booking, ext.diff);
    booking.pendingExtension = undefined;
    await booking.save();
    return res.status(409).json({ message: "The bay was taken for that time. Your extra payment has been refunded." });
  }

  booking.endTime = ext.endTime;
  booking.amount = ext.amount;
  booking.payment = booking.refundedAmount > 0 ? "partially_refunded" : "paid";
  booking.pendingExtension = undefined;
  await booking.save();
  res.json({ message: "Extra payment verified and booking extended", bookingId: booking._id });
});
