import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import userRoutes from "./routes/user.js";
import orderRoutes from "./routes/orders.js";

import { ensureDefaultCategories } from "./utils/defaultCategories.js";

const app = express();

/* =========================================================
   SECURITY & MIDDLEWARE
========================================================= */

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",").map((s) => s.trim())
      : "*",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

/* Brute-force protection on login/register */
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/", (_req, res) =>
  res.json({ ok: true, name: "Jewellery API" })
);

/* =========================================================
   ROUTES
========================================================= */

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/me", userRoutes);

/* ✅ Orders router (includes public booking + admin actions + delivery update) */
app.use("/api/orders", orderRoutes);

/* =========================================================
   404 HANDLER
========================================================= */

app.use((_req, res) =>
  res.status(404).json({ message: "Route not found" })
);

/* =========================================================
   CENTRAL ERROR HANDLER
========================================================= */

app.use((err, _req, res, _next) => {
  console.error("🔥 Error:", err);

  const status =
    err.name === "ValidationError"
      ? 400
      : err.name === "CastError"
      ? 400
      : err.status || 500;

  res.status(status).json({
    message: err.message || "Server error",
  });
});

/* =========================================================
   START SERVER
========================================================= */

const PORT = process.env.PORT || 5000;

connectDB()
  .then(ensureDefaultCategories) // creates default categories only if none exist
  .then(() =>
    app.listen(PORT, () =>
      console.log(`🚀 API running on http://localhost:${PORT}`)
    )
  )
  .catch((err) => {
    console.error("❌ Startup failed:", err.message);
    process.exit(1);
  });