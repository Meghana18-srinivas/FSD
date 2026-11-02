import crypto from "node:crypto";
import Razorpay from "razorpay";

export const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    const error = new Error(
      "Razorpay keys are missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env."
    );
    error.status = 503;
    throw error;
  }

  if (/REPLACE|your_razorpay|xxxx/i.test(keyId + keySecret)) {
    const error = new Error(
      "Razorpay keys in backend/.env are still placeholders. Paste your real Test Mode Key ID and Secret from dashboard.razorpay.com/app/keys, then restart the backend."
    );
    error.status = 503;
    throw error;
  }

  if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
    const error = new Error("Invalid Razorpay Key ID format. Check backend/.env.");
    error.status = 503;
    throw error;
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

export const wrapRazorpayError = (err, fallback = "Razorpay request failed") => {
  if (err?.status) return err;
  const message = err?.error?.description || err?.message || fallback;
  const wrapped = new Error(`Razorpay error: ${message}`);
  wrapped.status = err?.statusCode === 401 ? 502 : err?.statusCode || 502;
  return wrapped;
};

export const signatureValid = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret || !orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(String(signature), "hex");

  return expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

export const createRazorpayOrder = async ({ rupees, receipt, notes }) => {
  try {
    const amount = Math.round(Number(rupees) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    return await getRazorpay().orders.create({
      amount,
      currency: "INR",
      receipt,
      notes,
    });
  } catch (err) {
    throw wrapRazorpayError(err, "Could not create Razorpay order");
  }
};

// Payments ledger helpers -------------------------------------------------

export const ensureLedger = (booking) => {
  if (!booking.payments?.length && booking.payment === "paid" && booking.razorpayPaymentId) {
    booking.payments.push({
      orderId: booking.razorpayOrderId,
      paymentId: booking.razorpayPaymentId,
      amount: booking.amount,
      refunded: 0,
    });
    booking.paidAmount = booking.amount;
  }
};

export const refundableAmount = (booking) => {
  ensureLedger(booking);
  return Math.max((booking.paidAmount || 0) - (booking.refundedAmount || 0), 0);
};

// Refund in rupees, using newest payments first. Mutates booking; saves partial refunds before throwing.
export const refundBooking = async (booking, rupees) => {
  ensureLedger(booking);
  let left = Math.min(Math.round(Number(rupees)), refundableAmount(booking));
  let total = 0;
  const razorpay = getRazorpay();

  for (const payment of [...booking.payments].reverse()) {
    if (left <= 0) break;

    const available = payment.amount - (payment.refunded || 0);
    const part = Math.min(available, left);
    if (part <= 0) continue;

    try {
      await razorpay.payments.refund(payment.paymentId, {
        amount: Math.round(part * 100),
        speed: "normal",
        notes: { bookingId: String(booking._id) },
      });
    } catch (err) {
      if (total > 0) {
        booking.refundedAmount = (booking.refundedAmount || 0) + total;
        booking.payment = "partially_refunded";
        await booking.save();
      }
      throw wrapRazorpayError(err, "Refund failed");
    }

    payment.refunded = (payment.refunded || 0) + part;
    total += part;
    left -= part;
  }

  booking.refundedAmount = (booking.refundedAmount || 0) + total;
  if (total > 0) {
    booking.payment = booking.refundedAmount >= (booking.paidAmount || 0)
      ? "refunded"
      : "partially_refunded";
  }
  return total;
};
