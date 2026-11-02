
import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    lot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingLot",
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["car", "bike", "ev", "disabled"],
      default: "car",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

slotSchema.index({ lot: 1, label: 1 }, { unique: true });

const Slot = mongoose.model("Slot", slotSchema);

export default Slot;
