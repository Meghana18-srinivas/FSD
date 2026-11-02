// A slot is blocked by confirmed bookings AND by unpaid bookings that are
// still inside their payment window (so two people can't pay for the same bay).
export const HOLD_MINUTES = 10;

export const activeBookingFilter = () => ({
  $or: [
    { status: "confirmed" },
    {
      status: "pending_payment",
      createdAt: { $gt: new Date(Date.now() - HOLD_MINUTES * 60 * 1000) },
    },
  ],
});
