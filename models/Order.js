import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    /* =====================================================
       USER (OPTIONAL)
       Guests can place bookings without logging in.
    ===================================================== */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    /* =====================================================
       PUBLIC TRACKING ID
       Example: BK-240115-00042
    ===================================================== */

    trackingId: {
      type: String,
      unique: true,
      index: true,
    },

    /* =====================================================
       CUSTOMER CONTACT
    ===================================================== */

    customer: {
      fullName: { type: String, required: true },
      email: { type: String, default: "" },
      phone: { type: String, required: true },
    },

    /* =====================================================
       ITEMS
    ===================================================== */

    items: [
      {
        _id: false,
        productId: Number,
        name: String,
        price: Number,
        image: String,
        qty: Number,
      },
    ],

    /* =====================================================
       TOTALS
    ===================================================== */

    subtotal: Number,
    shipping: Number,
    total: Number,

    /* =====================================================
       ✅ ADVANCE PAID (new)
       Amount paid in advance by the customer.
       Balance Due = total - advancePaid
    ===================================================== */

    advancePaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* =====================================================
       ADDRESS
    ===================================================== */

    address: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    /* =====================================================
       PAYMENT
    ===================================================== */

    paymentMethod: {
      type: String,
      enum: ["BOOKING", "COD"],
      default: "BOOKING",
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "partial",
        "paid",
        "failed",
        "not_required",
      ],
      default: "not_required",
    },

    /* =====================================================
       ORDER STATUS
    ===================================================== */

    status: {
      type: String,
      enum: [
        "booked",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "booked",
    },

    /* =====================================================
       NOTE
    ===================================================== */

    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);