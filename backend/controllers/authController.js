
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { checkVehicleNumber } from "../utils/vehicle.js";

const sign = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const payload = (user) => ({
  token: sign(user),
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    vehicleNumber: user.vehicleNumber,
  },
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, vehicleNumber } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password are required",
    });
  }

  let vehicle;
  if (vehicleNumber && String(vehicleNumber).trim()) {
    const check = checkVehicleNumber(vehicleNumber);
    if (!check.valid) {
      return res.status(400).json({ message: check.message });
    }
    vehicle = check.normalized;
  }

  const user = await User.create({
    name,
    email,
    password,
    vehicleNumber: vehicle,
  });

  res.status(201).json(payload(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
  }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      message: "Incorrect email or password",
    });
  }

  res.json(payload(user));
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
