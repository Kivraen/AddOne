#pragma once

namespace CloudConfig {
constexpr const char* kSupabaseAnonKey = "your-beta-supabase-anon-key";
constexpr const char* kSupabaseProjectUrl = "https://your-beta-project-id.supabase.co";
constexpr const char* kMqttBrokerHost = "your-beta-broker-hostname";
constexpr uint16_t kMqttBrokerPort = 8883;
constexpr const char* kMqttBrokerUsername = "device-fleet-beta";
constexpr const char* kMqttBrokerPassword = "replace-me";
constexpr const char* kMqttTopicPrefix = "addone";
constexpr bool kMqttUseTls = true;
constexpr bool kMqttAllowInsecureTls = true;
constexpr const char* kBootstrapWifiSsid = "";
constexpr const char* kBootstrapWifiPassword = "";
} // namespace CloudConfig
