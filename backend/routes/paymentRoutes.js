import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { createOrder, verifyPayment, verifyExtension } from "../controllers/paymentController.js";

const router = Router();
router.use(protect);
router.post("/order/:bookingId", createOrder);
router.post("/verify/:bookingId", verifyPayment);
router.post("/extend/:bookingId/verify", verifyExtension);
export default router;
