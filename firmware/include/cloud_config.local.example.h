#pragma once

namespace CloudConfig {
constexpr const char* kSupabaseAnonKey = "your-development-supabase-anon-key";
constexpr const char* kSupabaseProjectUrl = "https://your-development-project-id.supabase.co";
constexpr const char* kMqttBrokerHost = "192.168.1.100";
constexpr uint16_t kMqttBrokerPort = 1883;
constexpr const char* kMqttBrokerUsername = "";
constexpr const char* kMqttBrokerPassword = "";
constexpr const char* kMqttTopicPrefix = "addone";
constexpr bool kMqttUseTls = false;
constexpr bool kMqttAllowInsecureTls = true;
constexpr const char* kBootstrapWifiSsid = "";
constexpr const char* kBootstrapWifiPassword = "";
} // namespace CloudConfig
