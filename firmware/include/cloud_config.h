#pragma once

#if __has_include("cloud_config.local.h")
#include "cloud_config.local.h"
#else
namespace CloudConfig {

// Staging / production values should be provided locally before flashing real hardware.
// The firmware still compiles with these placeholders, but cloud RPC calls will be no-ops.
constexpr const char* kSupabaseAnonKey = "";
constexpr const char* kSupabaseProjectUrl = "";

} // namespace CloudConfig
#endif
