import Category from "../models/Category.js";
import { slugify } from "./slugify.js";

const sub = (label) => ({ key: slugify(label), label });

export const DEFAULTS = [
  { key: "necklaces", label: "Necklaces", subcategories: [sub("Pendants"), sub("Chains"), sub("Chokers")] },
  { key: "earrings", label: "Earrings", subcategories: [sub("Studs"), sub("Hoops"), sub("Danglers")] },
  { key: "rings", label: "Rings", subcategories: [sub("Solitaire"), sub("Bands")] },
  { key: "bracelets", label: "Bracelets", subcategories: [sub("Chain Bracelets"), sub("Charm Bracelets")] },
  { key: "anklets", label: "Anklets", subcategories: [] },
];

// runs on server start: only inserts when there are no categories yet
export async function ensureDefaultCategories() {
  if ((await Category.countDocuments()) > 0) return;
  await Category.insertMany(DEFAULTS);
  console.log("Default categories created");
}