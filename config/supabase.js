import { createClient } from "@supabase/supabase-js";
import ws from "ws"; // needed on Node < 22 (no native WebSocket)

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  }
);

export const BUCKET = process.env.SUPABASE_BUCKET || "aura";