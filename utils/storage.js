import crypto from "crypto";
import path from "path";
import { supabase, BUCKET } from "../config/supabase.js";

export async function uploadImage(file) {
  const ext = path.extname(file.originalname) || ".png";
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(name, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw new Error("Image upload failed: " + error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

export async function deleteImageByUrl(url) {
  try {
    const name = url.split(`/${BUCKET}/`)[1];
    if (name) await supabase.storage.from(BUCKET).remove([name]);
  } catch {
    /* ignore */
  }
}
