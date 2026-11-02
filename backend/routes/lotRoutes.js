
import { Router } from "express";
import {
  getLots,
  getLot,
  createLot,
  updateLot,
  deleteLot,
} from "../controllers/lotController.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

router.get("/", getLots);
router.get("/:id", getLot);

router.post("/", protect, adminOnly, createLot);
router.put("/:id", protect, adminOnly, updateLot);
router.delete("/:id", protect, adminOnly, deleteLot);

export default router;
