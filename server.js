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
   TRUST PROXY
   Render sits behind a proxy. Without this,
   express-rate-limit can't read the real client IP.
========================================================= */

app.set("trust proxy", 1);

/* =========================================================
   CORS
   CLIENT_URL = comma-separated list of allowed origins
   e.g. http://localhost:5173,https://your-frontend.com
========================================================= */

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((s) =>
      s.trim().replace(/\/+$/, "")
    )
  : ["http://localhost:5173"];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser tools (Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Don't throw: a thrown error becomes a 500 with no CORS headers
    console.warn("⚠️ CORS blocked for origin:", origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Global cors middleware also answers OPTIONS preflight requests
app.use(cors(corsOptions));

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
      console.log(`🚀 API running on port ${PORT}`);
      console.log("🌐 Allowed origins:", allowedOrigins);
    });
  })
  .catch((err) => {
    console.error("❌ Startup failed:", err.message);
    process.exit(1);
  });