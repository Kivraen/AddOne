import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

import { runtimeConfig } from "@/lib/env";
import { Database } from "@/lib/supabase/database.types";
import { supabaseStorage } from "@/lib/supabase-storage";

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!runtimeConfig.isSupabaseConfigured) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "implicit",
        persistSession: true,
        storage: supabaseStorage,
      },
      global: {
        headers: {
          "X-Client-Info": "addone-mobile",
        },
      },
    });
  }

  return supabaseClient;
}
