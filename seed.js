// npm run seed  -> inserts your 20 products + an admin user
// Admin login comes from ADMIN_EMAIL / ADMIN_PASSWORD env vars (or the defaults below - change them!)
import "dotenv/config";
import mongoose from "mongoose";
import Product from "./models/Product.js";
import User from "./models/User.js";

const d = "Elegant handcrafted jewellery, made to be treasured.";
const make = (id, name, price, category) => ({ id, name, price, category, description: d, image: "", images: [] });



await mongoose.connect(process.env.MONGO_URI);

await Product.deleteMany({});
console.log(`Seeded ${data.length} products`);

const email = process.env.ADMIN_EMAIL || "aura@gmail.com";
const password = process.env.ADMIN_PASSWORD || "Admin@12345";
if (!(await User.findOne({ email }))) {
  await User.create({ name: "Admin", email, password, role: "admin" });
  console.log(`Admin created: ${email} / ${password}  (change this password!)`);
}

await mongoose.disconnect();
