import { Router } from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

const FREE_SHIPPING_ABOVE = 999;
const SHIPPING_FEE = 79;

/* =========================================================
   TRACKING ID GENERATOR
========================================================= */

async function generateTrackingId() {
  const now = new Date();

  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const datePart = `${yy}${mm}${dd}`;

  for (let attempt = 0; attempt < 6; attempt++) {
    const random = String(
      Math.floor(Math.random() * 100000)
    ).padStart(5, "0");

    const trackingId = `BK-${datePart}-${random}`;

    const exists = await Order.exists({ trackingId });
    if (!exists) return trackingId;
  }

  return `BK-${datePart}-${Date.now()
    .toString()
    .slice(-5)}`;
}

/* =========================================================
   NORMALIZE ADDRESS
========================================================= */

function normalizeAddress(raw = {}) {
  const fullName =
    raw.fullName ||
    [raw.firstName, raw.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return {
    fullName: fullName || "Customer",
    phone: raw.phone || "",
    line1: raw.line1 || raw.address || "",
    line2: raw.line2 || raw.landmark || "",
    city: raw.city || "",
    state: raw.state || "",
    pincode: raw.pincode || "",
  };
}

/* =========================================================
   POST /api/orders  —  PUBLIC BOOKING
========================================================= */

router.post("/", async (req, res, next) => {
  try {
    const {
      customer,
      address,
      items: clientItems,
      note = "",
    } = req.body;

    /* -------- VALIDATE CUSTOMER -------- */

    if (!customer || !customer.fullName) {
      return res
        .status(400)
        .json({ message: "Customer name is required" });
    }

    if (!customer.phone) {
      return res
        .status(400)
        .json({ message: "Phone number is required" });
    }

    /* -------- VALIDATE ADDRESS -------- */

    const normalizedAddress = normalizeAddress(address);

    const required = [
      "fullName",
      "phone",
      "line1",
      "city",
      "state",
      "pincode",
    ];

    for (const key of required) {
      if (!normalizedAddress[key]) {
        return res.status(400).json({
          message: `Address field "${key}" is required`,
        });
      }
    }

    /* -------- VALIDATE ITEMS -------- */

    if (!Array.isArray(clientItems) || !clientItems.length) {
      return res
        .status(400)
        .json({ message: "No items to book" });
    }

    /* -------- LOAD PRODUCTS -------- */

    const productIds = clientItems
      .map((i) => i.productId || i.id)
      .filter((id) => id !== undefined && id !== null);

    const prods = await Product.find({
      id: { $in: productIds },
    });

    const byId = Object.fromEntries(
      prods.map((p) => [p.id, p])
    );

    const finalItems = [];

    for (const c of clientItems) {
      const pid = c.productId || c.id;
      const qty = Number(c.qty) || 1;

      const p = byId[pid];

      if (!p) continue;

      if (p.stock < qty) {
        return res.status(400).json({
          message: `${p.name}: only ${p.stock} left in stock`,
        });
      }

      finalItems.push({
        productId: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        qty,
      });
    }

    if (!finalItems.length) {
      return res
        .status(400)
        .json({ message: "No valid items to book" });
    }

    /* -------- TOTALS -------- */

    const subtotal = finalItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    const shipping =
      subtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;

    const total = subtotal + shipping;

    /* -------- TRACKING ID -------- */

    const trackingId = await generateTrackingId();

    /* -------- OPTIONAL USER LINK -------- */

    let userId = null;

    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);

        const jwt = (await import("jsonwebtoken")).default;

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET
        );

        if (decoded?.id) userId = decoded.id;
      }
    } catch {
      /* Guest booking — ignore */
    }

    /* -------- CREATE ORDER -------- */

    const order = await Order.create({
      user: userId,
      trackingId,
      customer: {
        fullName: customer.fullName,
        email: customer.email || "",
        phone: customer.phone,
      },
      items: finalItems,
      subtotal,
      shipping,
      total,
      advancePaid: 0,
      address: normalizedAddress,
      paymentMethod: "BOOKING",
      paymentStatus: "not_required",
      status: "booked",
      note,
    });

    /* -------- DECREMENT STOCK -------- */

    await Promise.all(
      finalItems.map((item) =>
        Product.updateOne(
          { id: item.productId },
          { $inc: { stock: -item.qty } }
        )
      )
    );

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   PUBLIC — TRACK ORDER
========================================================= */

router.get("/track/:trackingId", async (req, res, next) => {
  try {
    const order = await Order.findOne({
      trackingId: req.params.trackingId,
    }).select(
      "trackingId customer.fullName status items subtotal shipping total advancePaid createdAt"
    );

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   ADMIN — LIST ALL
========================================================= */

router.get(
  "/",
  protect,
  adminOnly,
  async (_req, res, next) => {
    try {
      const orders = await Order.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 });

      res.json(orders);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ADMIN — UPDATE STATUS
========================================================= */

router.patch(
  "/:id/status",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true, runValidators: true }
      );

      if (!order) {
        return res
          .status(404)
          .json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ✅ ADMIN — UPDATE DELIVERY FEE + ADVANCE PAID
   Auto-sets paymentStatus to pending / partial / paid.
========================================================= */

router.patch(
  "/:id/delivery",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const shipping = Number(req.body.shipping);
      const advancePaid = Number(
        req.body.advancePaid ?? 0
      );

      /* -------- VALIDATE -------- */

      if (Number.isNaN(shipping) || shipping < 0) {
        return res.status(400).json({
          message: "Invalid delivery fee",
        });
      }

      if (
        Number.isNaN(advancePaid) ||
        advancePaid < 0
      ) {
        return res.status(400).json({
          message: "Invalid advance amount",
        });
      }

      /* -------- FETCH ORDER -------- */

      const order = await Order.findById(req.params.id);

      if (!order) {
        return res
          .status(404)
          .json({ message: "Order not found" });
      }

      /* -------- PREVENT OVERPAY -------- */

      const newTotal =
        Number(order.subtotal || 0) + shipping;

      if (advancePaid > newTotal) {
        return res.status(400).json({
          message: `Advance cannot exceed total (₹${newTotal})`,
        });
      }

      /* -------- UPDATE -------- */

      order.shipping = shipping;
      order.advancePaid = advancePaid;
      order.total = newTotal;

      /* -------- AUTO PAYMENT STATUS -------- */

      if (advancePaid === 0) {
        order.paymentStatus = "pending";
      } else if (advancePaid < newTotal) {
        order.paymentStatus = "partial";
      } else {
        order.paymentStatus = "paid";
      }

      await order.save();

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ADMIN — GET SINGLE (must be LAST)
========================================================= */

router.get(
  "/:id",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res
          .status(404)
          .json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

export default router;