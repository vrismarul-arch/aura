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
   CORS
========================================================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://aurakraftie.netlify.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`❌ CORS blocked for origin: ${origin}`);

      return callback(
        new Error(`CORS blocked for origin: ${origin}`),
        false
      );
    },
    credentials: true,
  })
);

/* =========================================================
   SECURITY & MIDDLEWARE
========================================================= */

app.use(helmet());

app.use(express.json({ limit: "1mb" }));

app.use(morgan("dev"));

/* =========================================================
   RATE LIMIT
========================================================= */

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

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Jewellery API",
  });
});

/* =========================================================
   ROUTES
========================================================= */

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/me", userRoutes);
app.use("/api/orders", orderRoutes);

/* =========================================================
   404
========================================================= */

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

/* =========================================================
   ERROR HANDLER
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
  .then(ensureDefaultCategories)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API running on http://localhost:${PORT}`);
      console.log("🌐 Allowed origins:", allowedOrigins);
    });
  })
  .catch((err) => {
    console.error("❌ Startup failed:", err.message);
    process.exit(1);
  });