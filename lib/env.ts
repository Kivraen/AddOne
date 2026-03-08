const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

function isValidUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export const runtimeConfig = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: isValidUrl(supabaseUrl) && supabaseAnonKey.length > 0,
} as const;

export type AppRuntimeMode = "cloud" | "demo";

export const appRuntimeMode: AppRuntimeMode = runtimeConfig.isSupabaseConfigured ? "cloud" : "demo";
