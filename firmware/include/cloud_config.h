#pragma once

#if defined(ADDONE_CONFIG_PROFILE_BETA) && __has_include("cloud_config.beta.h")
#include "cloud_config.beta.h"
#elif __has_include("cloud_config.local.h")
#include "cloud_config.local.h"
#else
namespace CloudConfig {

// Development and beta values should be provided through ignored local headers before flashing real hardware.
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
