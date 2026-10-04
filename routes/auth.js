import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();

const sign = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const safeUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  wishlist: u.wishlist,
});

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ message: "Name, email and password (min 6 chars) required" });

    if (await User.findOne({ email })) return res.status(409).json({ message: "Email already registered" });

    // role is always "user" here; admins are created by seed / directly in the DB
    const user = await User.create({ name, email, password });
    res.status(201).json({ token: sign(user._id), user: safeUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    res.json({ token: sign(user._id), user: safeUser(user) });
  } catch (e) {
    next(e);
  }
});

router.get("/me", protect, (req, res) => res.json({ user: safeUser(req.user) }));

export default router;
