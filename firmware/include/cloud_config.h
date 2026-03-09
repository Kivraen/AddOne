#pragma once

#if __has_include("cloud_config.local.h")
#include "cloud_config.local.h"
#else
namespace CloudConfig {

// Staging / production values should be provided locally before flashing real hardware.
// The firmware still compiles with these placeholders, but cloud RPC calls will be no-ops.
constexpr const char* kSupabaseAnonKey = "";
constexpr const char* kSupabaseProjectUrl = "";
constexpr const char* kMqttBrokerHost = "";
constexpr uint16_t kMqttBrokerPort = 8883;
constexpr const char* kMqttBrokerUsername = "";
constexpr const char* kMqttBrokerPassword = "";
constexpr const char* kMqttTopicPrefix = "addone";
constexpr bool kMqttUseTls = true;
constexpr bool kMqttAllowInsecureTls = false;
constexpr const char* kBootstrapWifiSsid = "";
constexpr const char* kBootstrapWifiPassword = "";

} // namespace CloudConfig
#endif
