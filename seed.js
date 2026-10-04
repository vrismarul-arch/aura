// npm run seed  -> inserts your 20 products + an admin user
// Admin login comes from ADMIN_EMAIL / ADMIN_PASSWORD env vars (or the defaults below - change them!)
import "dotenv/config";
import mongoose from "mongoose";
import Product from "./models/Product.js";
import User from "./models/User.js";

const d = "Elegant handcrafted jewellery, made to be treasured.";
const make = (id, name, price, category) => ({ id, name, price, category, description: d, image: "", images: [] });

const data = [
  make(1, "Butterfly Pendant Necklace", 1499, "necklaces"),
  make(2, "Elegant Butterfly Earrings", 899, "earrings"),
  make(3, "Bloom Ring", 1299, "rings"),
  make(4, "Grace Bracelet", 1099, "bracelets"),
  make(5, "Shine Anklet", 999, "anklets"),
  make(6, "Pearl Drop Necklace", 1799, "necklaces"),
  make(7, "Floral Stud Earrings", 699, "earrings"),
  make(8, "Solitaire Ring", 1499, "rings"),
  make(9, "Charm Bracelet", 1299, "bracelets"),
  make(10, "Star Charm Anklet", 849, "anklets"),
  make(11, "Heart Locket Chain", 1299, "necklaces"),
  make(12, "Gold Hoop Earrings", 799, "earrings"),
  make(13, "Twin Leaf Ring", 1099, "rings"),
  make(14, "Tennis Bracelet", 1899, "bracelets"),
  make(15, "Pearl Anklet", 1099, "anklets"),
  make(16, "Layered Gold Necklace", 1999, "necklaces"),
  make(17, "Pearl Drop Earrings", 999, "earrings"),
  make(18, "Infinity Ring", 899, "rings"),
  make(19, "Chain Link Bracelet", 999, "bracelets"),
  make(20, "Butterfly Anklet", 1199, "anklets"),
];

await mongoose.connect(process.env.MONGO_URI);

await Product.deleteMany({});
await Product.insertMany(data);
console.log(`Seeded ${data.length} products`);

const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "Admin@12345";
if (!(await User.findOne({ email }))) {
  await User.create({ name: "Admin", email, password, role: "admin" });
  console.log(`Admin created: ${email} / ${password}  (change this password!)`);
}

await mongoose.disconnect();
