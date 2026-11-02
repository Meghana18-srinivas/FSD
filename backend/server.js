
import "dotenv/config";
import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import lotRoutes from "./routes/lotRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/lots", lotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/vehicles", vehicleRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    const keysConfigured = keyId.startsWith("rzp_test_") &&
      keySecret.length > 10 &&
      !keyId.includes("REPLACE_WITH") &&
      !keySecret.includes("REPLACE_WITH") &&
      !keySecret.includes("your_razorpay");
    if (!keysConfigured) {
      console.warn("Razorpay test keys are not configured. Add real RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET values to backend/.env; checkout will not work until then.");
    }

    const port = process.env.PORT || 5001;

    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err.message);
    process.exit(1);
  }
};

startServer();
