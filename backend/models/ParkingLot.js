
import mongoose from "mongoose";

const parkingLotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Lot name is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    pricePerHour: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const ParkingLot = mongoose.model("ParkingLot", parkingLotSchema);

export default ParkingLot;
