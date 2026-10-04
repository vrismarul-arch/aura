import { Router } from "express";
import Product from "../models/Product.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);

const MAX_QTY = 10;

async function populatedCart(user) {
  const ids = user.cart.map((c) => c.productId);
  const prods = await Product.find({ id: { $in: ids } });
  const byId = Object.fromEntries(prods.map((p) => [p.id, p]));
  const items = user.cart
    .filter((c) => byId[c.productId])
    .map((c) => ({ ...byId[c.productId].toJSON(), qty: c.qty }));
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  return { items, subtotal };
}

// ---------- WISHLIST ----------
router.get("/wishlist", async (req, res) => {
  const products = await Product.find({ id: { $in: req.user.wishlist } });
  res.json({ ids: req.user.wishlist, products });
});

// toggle: POST /api/me/wishlist/:id
router.post("/wishlist/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await Product.exists({ id }))) return res.status(404).json({ message: "Product not found" });

    const has = req.user.wishlist.includes(id);
    req.user.wishlist = has ? req.user.wishlist.filter((x) => x !== id) : [...req.user.wishlist, id];
    await req.user.save();
    res.json({ liked: !has, ids: req.user.wishlist });
  } catch (e) {
    next(e);
  }
});

// ---------- CART ----------
router.get("/cart", async (req, res, next) => {
  try {
    res.json(await populatedCart(req.user));
  } catch (e) {
    next(e);
  }
});

// add: POST /api/me/cart { productId, qty }
router.post("/cart", async (req, res, next) => {
  try {
    const productId = Number(req.body.productId);
    const qty = Math.max(1, Math.min(MAX_QTY, Number(req.body.qty) || 1));
    if (!(await Product.exists({ id: productId }))) return res.status(404).json({ message: "Product not found" });

    const found = req.user.cart.find((c) => c.productId === productId);
    if (found) found.qty = Math.min(MAX_QTY, found.qty + qty);
    else req.user.cart.push({ productId, qty });

    await req.user.save();
    res.json(await populatedCart(req.user));
  } catch (e) {
    next(e);
  }
});

router.put("/cart/:id", async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    const qty = Math.max(1, Math.min(MAX_QTY, Number(req.body.qty) || 1));
    const found = req.user.cart.find((c) => c.productId === productId);
    if (!found) return res.status(404).json({ message: "Not in cart" });
    found.qty = qty;
    await req.user.save();
    res.json(await populatedCart(req.user));
  } catch (e) {
    next(e);
  }
});

router.delete("/cart/:id", async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    req.user.cart = req.user.cart.filter((c) => c.productId !== productId);
    await req.user.save();
    res.json(await populatedCart(req.user));
  } catch (e) {
    next(e);
  }
});

router.delete("/cart", async (req, res, next) => {
  try {
    req.user.cart = [];
    await req.user.save();
    res.json({ items: [], subtotal: 0 });
  } catch (e) {
    next(e);
  }
});

export default router;
