import { Router } from "express";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { slugify } from "../utils/slugify.js";

const router = Router();
const admin = [protect, adminOnly];

const cleanLabel = (v) => String(v || "").trim();

// ---------- PUBLIC: GET /api/categories -> categories with subcategories + product counts ----------
router.get("/", async (_req, res, next) => {
  try {
    const [cats, catCounts, subCounts] = await Promise.all([
      Category.find().sort({ createdAt: 1 }),
      Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
      Product.aggregate([
        { $match: { subcategory: { $ne: "" } } },
        { $group: { _id: { c: "$category", s: "$subcategory" }, count: { $sum: 1 } } },
      ]),
    ]);
    const cMap = Object.fromEntries(catCounts.map((x) => [x._id, x.count]));
    const sMap = Object.fromEntries(subCounts.map((x) => [`${x._id.c}:${x._id.s}`, x.count]));

    res.json(
      cats.map((c) => ({
        key: c.key,
        label: c.label,
        count: cMap[c.key] || 0,
        subcategories: c.subcategories.map((s) => ({
          key: s.key,
          label: s.label,
          count: sMap[`${c.key}:${s.key}`] || 0,
        })),
      }))
    );
  } catch (e) {
    next(e);
  }
});

// ---------- ADMIN: create category  { label } ----------
router.post("/", ...admin, async (req, res, next) => {
  try {
    const label = cleanLabel(req.body.label);
    const key = slugify(label);
    if (!label || !key) return res.status(400).json({ message: "Category name is required" });
    if (await Category.exists({ key })) return res.status(409).json({ message: "Category already exists" });

    const cat = await Category.create({ key, label });
    res.status(201).json(cat);
  } catch (e) {
    next(e);
  }
});

// ---------- ADMIN: rename category (key stays the same so products stay linked) ----------
router.put("/:key", ...admin, async (req, res, next) => {
  try {
    const label = cleanLabel(req.body.label);
    if (!label) return res.status(400).json({ message: "Category name is required" });

    const cat = await Category.findOneAndUpdate({ key: req.params.key }, { label }, { new: true });
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (e) {
    next(e);
  }
});

// ---------- ADMIN: delete category (blocked if products use it) ----------
router.delete("/:key", ...admin, async (req, res, next) => {
  try {
    const used = await Product.countDocuments({ category: req.params.key });
    if (used > 0)
      return res.status(409).json({ message: `${used} product(s) use this category. Move or delete them first.` });

    const cat = await Category.findOneAndDelete({ key: req.params.key });
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (e) {
    next(e);
  }
});

// ---------- ADMIN: add subcategory  { label } ----------
router.post("/:key/subcategories", ...admin, async (req, res, next) => {
  try {
    const label = cleanLabel(req.body.label);
    const key = slugify(label);
    if (!label || !key) return res.status(400).json({ message: "Subcategory name is required" });

    const cat = await Category.findOne({ key: req.params.key });
    if (!cat) return res.status(404).json({ message: "Category not found" });
    if (cat.subcategories.some((s) => s.key === key))
      return res.status(409).json({ message: "Subcategory already exists" });

    cat.subcategories.push({ key, label });
    await cat.save();
    res.status(201).json(cat);
  } catch (e) {
    next(e);
  }
});

// ---------- ADMIN: rename subcategory ----------
router.put("/:key/subcategories/:sub", ...admin, async (req, res, next) => {
  try {
    const label = cleanLabel(req.body.label);
    if (!label) return res.status(400).json({ message: "Subcategory name is required" });

    const cat = await Category.findOne({ key: req.params.key });
    const sub = cat?.subcategories.find((s) => s.key === req.params.sub);
    if (!sub) return res.status(404).json({ message: "Subcategory not found" });

    sub.label = label;
    await cat.save();
    res.json(cat);
  } catch (e) {
    next(e);
  }
});

// ---------- ADMIN: delete subcategory (blocked if products use it) ----------
router.delete("/:key/subcategories/:sub", ...admin, async (req, res, next) => {
  try {
    const used = await Product.countDocuments({ category: req.params.key, subcategory: req.params.sub });
    if (used > 0)
      return res.status(409).json({ message: `${used} product(s) use this subcategory. Move or edit them first.` });

    const cat = await Category.findOne({ key: req.params.key });
    if (!cat) return res.status(404).json({ message: "Category not found" });

    cat.subcategories = cat.subcategories.filter((s) => s.key !== req.params.sub);
    await cat.save();
    res.json(cat);
  } catch (e) {
    next(e);
  }
});

export default router;