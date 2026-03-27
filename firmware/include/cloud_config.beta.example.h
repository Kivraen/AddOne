#pragma once

#define ADDONE_MQTT_BROKER_TLS_SERVER_NAME "mqtt-beta.addone.studio"

namespace CloudConfig {
constexpr const char* kSupabaseAnonKey = "your-beta-supabase-anon-key";
constexpr const char* kSupabaseProjectUrl = "https://your-beta-project-id.supabase.co";
constexpr const char* kSupabaseRootCaPem = R"PEM()PEM";
constexpr const char* kMqttBrokerHost = "your-beta-broker-hostname";
constexpr uint16_t kMqttBrokerPort = 8883;
constexpr const char* kMqttBrokerUsername = "";
constexpr const char* kMqttBrokerPassword = "";
constexpr const char* kMqttBrokerCaPem = R"PEM()PEM";
constexpr const char* kMqttTopicPrefix = "addone";
constexpr bool kMqttUseTls = true;
constexpr bool kMqttAllowInsecureTls = false;
constexpr const char* kBootstrapWifiSsid = "";
constexpr const char* kBootstrapWifiPassword = "";
} // namespace CloudConfig
