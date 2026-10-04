// scripts/resetAdmin.js
// Run from the backend folder:  node scripts/resetAdmin.js
//
// Uses the SAME DB connection as your server (MONGO_URI in .env).
// To fix the Render DB, put Render's MONGO_URI in your local .env first.

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const EMAIL = "aura@gmail.com";
const PASSWORD = "Admin@123"; // change this after you can log in

async function run() {
  await connectDB();

  let user = await User.findOne({ email: EMAIL }).select("+password");

  if (!user) {
    user = new User({ name: "Admin", email: EMAIL, password: PASSWORD, role: "admin" });
    console.log("Creating new admin user...");
  } else {
    // Plain text here: the pre("save") hook hashes it exactly once
    user.password = PASSWORD;
    user.role = "admin";
    console.log("Resetting password for existing admin...");
  }

  await user.save();

  const check = await User.findOne({ email: EMAIL }).select("+password");
  console.log("DB name:", mongoose.connection.name);
  console.log("Password check:", (await check.matchPassword(PASSWORD)) ? "OK" : "FAILED");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});