import mongoose from "mongoose";

const subSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // slug, e.g. "chain-bracelets"
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true }, // slug, e.g. "necklaces"
    label: { type: String, required: true, trim: true },
    subcategories: { type: [subSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export default mongoose.model("Category", categorySchema);