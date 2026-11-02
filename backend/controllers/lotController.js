
import ParkingLot from "../models/ParkingLot.js";
import Slot from "../models/Slot.js";
import Booking from "../models/Booking.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { activeBookingFilter } from "../utils/availability.js";

// Find slots with overlapping confirmed bookings
async function busySlotIds(lotId, start, end) {
  const bookings = await Booking.find({
    ...activeBookingFilter(),
    lot: lotId,
    startTime: { $lt: end },
    endTime: { $gt: start },
  }).select("slot");

  return new Set(bookings.map((b) => String(b.slot)));
}

// Get all active parking lots
export const getLots = asyncHandler(async (req, res) => {
  const lots = await ParkingLot.find({ isActive: true })
    .sort("name")
    .lean();

  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000);

  const result = await Promise.all(
    lots.map(async (lot) => {
      const total = await Slot.countDocuments({
        lot: lot._id,
        isActive: true,
      });

      const busy = await busySlotIds(lot._id, now, soon);

      return {
        ...lot,
        totalSlots: total,
        availableNow: Math.max(total - busy.size, 0),
      };
    })
  );

  res.json(result);
});

// Get one lot and its slots for a selected time window
export const getLot = asyncHandler(async (req, res) => {
  const lot = await ParkingLot.findById(req.params.id).lean();

  if (!lot) {
    return res.status(404).json({
      message: "Parking lot not found",
    });
  }

  const start = req.query.start
    ? new Date(req.query.start)
    : new Date();

  const end = req.query.end
    ? new Date(req.query.end)
    : new Date(start.getTime() + 60 * 60 * 1000);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return res.status(400).json({
      message: "Choose a valid start and end time",
    });
  }

  const slots = await Slot.find({
    lot: lot._id,
    isActive: true,
  })
    .sort("label")
    .lean();

  const busy = await busySlotIds(lot._id, start, end);

  res.json({
    ...lot,
    slots: slots.map((slot) => ({
      ...slot,
      booked: busy.has(String(slot._id)),
    })),
  });
});

// Create a parking lot and generate its slots (admin)
export const createLot = asyncHandler(async (req, res) => {
  const { name, address, pricePerHour } = req.body;

  const rows =
    Array.isArray(req.body.rows) && req.body.rows.length
      ? req.body.rows
      : ["A", "B"];

  const perRow = Math.min(Number(req.body.perRow) || 6, 30);

  const lot = await ParkingLot.create({
    name,
    address,
    pricePerHour,
  });

  try {
    const slots = [];

    rows.forEach((row) => {
      for (let i = 1; i <= perRow; i++) {
        slots.push({
          lot: lot._id,
          label: `${row}${i}`,
        });
      }
    });

    await Slot.insertMany(slots);
  } catch (err) {
    await ParkingLot.findByIdAndDelete(lot._id);
    throw err;
  }

  res.status(201).json(lot);
});

// Update a parking lot (admin)
export const updateLot = asyncHandler(async (req, res) => {
  const { name, address, pricePerHour, isActive } = req.body;

  const lot = await ParkingLot.findByIdAndUpdate(
    req.params.id,
    { name, address, pricePerHour, isActive },
    { new: true, runValidators: true }
  );

  if (!lot) {
    return res.status(404).json({
      message: "Parking lot not found",
    });
  }

  res.json(lot);
});

// Delete a parking lot (admin)
export const deleteLot = asyncHandler(async (req, res) => {
  const upcoming = await Booking.countDocuments({
    lot: req.params.id,
    status: "confirmed",
    endTime: { $gt: new Date() },
  });

  if (upcoming) {
    return res.status(409).json({
      message: `Cannot delete: ${upcoming} active booking(s) exist`,
    });
  }

  const lot = await ParkingLot.findByIdAndDelete(req.params.id);

  if (!lot) {
    return res.status(404).json({
      message: "Parking lot not found",
    });
  }

  await Slot.deleteMany({ lot: lot._id });

  res.json({ message: "Parking lot deleted" });
});
