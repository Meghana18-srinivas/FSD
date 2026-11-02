import { Router } from "express";
import { checkVehicleNumber } from "../utils/vehicle.js";

const router = Router();

// Public helper so the UI can show live "valid / invalid" feedback.
router.get("/validate", (req, res) => {
  res.json(checkVehicleNumber(req.query.number));
});

export default router;
