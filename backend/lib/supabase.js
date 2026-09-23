import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  console.error("❌ EXPO_PUBLIC_SUPABASE_URL is missing");
}

if (!supabasePublishableKey) {
  console.error("❌ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing");
}

console.log("🔥 SUPABASE.JS LOADED");
console.log("🔥 SUPABASE URL EXISTS:", !!supabaseUrl);
console.log(
  "🔥 SUPABASE KEY EXISTS:",
  !!supabasePublishableKey
);

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Temporary connection test
supabase
  .from("drivers")
  .select("driver_id")
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error("❌ SUPABASE CONNECTION FAILED:", error);
    } else {
      console.log("✅ SUPABASE CONNECTION SUCCESSFUL:", data);
    }
  });