const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const deviceApBaseUrl = process.env.EXPO_PUBLIC_DEVICE_AP_BASE_URL?.trim() ?? "http://192.168.4.1";
const deviceApTimeoutMs = Number.parseInt(process.env.EXPO_PUBLIC_DEVICE_AP_TIMEOUT_MS?.trim() ?? "8000", 10);

function isValidUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export const runtimeConfig = {
  deviceApBaseUrl: isValidUrl(deviceApBaseUrl) ? deviceApBaseUrl.replace(/\/+$/, "") : "http://192.168.4.1",
  deviceApTimeoutMs: Number.isFinite(deviceApTimeoutMs) && deviceApTimeoutMs > 0 ? deviceApTimeoutMs : 8000,
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: isValidUrl(supabaseUrl) && supabaseAnonKey.length > 0,
} as const;

export type AppRuntimeMode = "cloud" | "demo";

export const appRuntimeMode: AppRuntimeMode = runtimeConfig.isSupabaseConfigured ? "cloud" : "demo";
