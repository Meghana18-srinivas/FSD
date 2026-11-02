
import { Router } from "express";
import {
  createBooking,
  myBookings,
  allBookings,
  updateBooking,
  cancelBooking,
} from "../controllers/bookingController.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.post("/", createBooking);
router.get("/mine", myBookings);
router.get("/", adminOnly, allBookings);
router.put("/:id", updateBooking);
router.delete("/:id", cancelBooking);

export default router;
