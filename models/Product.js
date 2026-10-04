import mongoose from "mongoose";

/* =========================================================
   VARIANT SCHEMA
   SIMPLIFIED: only color + image
========================================================= */

const variantSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

/* =========================================================
   PRODUCT SCHEMA
========================================================= */

const productSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    subcategory: {
      type: String,
      default: "",
      index: true,
    },

    description: {
      type: String,
      default:
        "Elegant handcrafted jewellery, made to be treasured.",
    },

    image: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    stock: {
      type: Number,
      default: 100,
      min: 0,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    hasVariants: {
      type: Boolean,
      default: false,
    },

    variants: {
      type: [variantSchema],
      default: [],
    },
  },

  {
    timestamps: true,

    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

export default mongoose.model("Product", productSchema);