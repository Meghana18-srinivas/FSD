
import "dotenv/config";
import mongoose from "mongoose";

import User from "./models/User.js";
import ParkingLot from "./models/ParkingLot.js";
import Slot from "./models/Slot.js";
import Booking from "./models/Booking.js";

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    await Promise.all([
      User.deleteMany(),
      ParkingLot.deleteMany(),
      Slot.deleteMany(),
      Booking.deleteMany(),
    ]);

    await User.create({
      name: "Admin",
      email: "admin@parking.com",
      password: "admin123",
      role: "admin",
    });

    await User.create({
      name: "Demo User",
      email: "user@parking.com",
      password: "user123",
      vehicleNumber: "KA01AB1234",
    });

    const lots = [
      {
        name: "MG Road Basement",
        address: "MG Road, Bengaluru",
        pricePerHour: 40,
        rows: ["A", "B", "C"],
        perRow: 6,
      },
      {
        name: "Orion Mall Parking",
        address: "Rajajinagar, Bengaluru",
        pricePerHour: 60,
        rows: ["A", "B"],
        perRow: 8,
      },
      {
        name: "Campus Gate Lot",
        address: "University Campus",
        pricePerHour: 15,
        rows: ["A", "B"],
        perRow: 5,
      },
    ];

    for (const item of lots) {
      const lot = await ParkingLot.create({
        name: item.name,
        address: item.address,
        pricePerHour: item.pricePerHour,
      });

      const slots = [];

      item.rows.forEach((row) => {
        for (let i = 1; i <= item.perRow; i++) {
          slots.push({
            lot: lot._id,
            label: `${row}${i}`,
            type:
              i === 1 && row === "A"
                ? "disabled"
                : i === item.perRow
                  ? "ev"
                  : "car",
          });
        }
      });

      await Slot.insertMany(slots);
    }

    console.log("Seed data created successfully");
    console.log("Demo admin: admin@parking.com");
    console.log("Demo user: user@parking.com");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
