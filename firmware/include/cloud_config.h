#pragma once

namespace CloudConfig {

// Staging / production values should be provided locally before flashing real hardware.
// The firmware still compiles with these placeholders, but cloud RPC calls will be no-ops.
constexpr const char* kSupabaseAnonKey = "";
constexpr const char* kSupabaseProjectUrl = "";

} // namespace CloudConfig
