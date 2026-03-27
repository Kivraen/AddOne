# AddOne Firmware V2

This is the clean firmware v2 workspace for AddOne.

It exists so new product logic lands in a fresh codebase that matches the locked AddOne model:
- single button
- single habit
- setup/recovery
- tracking
- reward

Reference documents:
- [Canonical spec](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_V1_Canonical_Spec.md)
- [Firmware v2 architecture](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Firmware_V2_Architecture.md)
- [AP provisioning contract](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_AP_Provisioning_Contract.md)
- [Cloud contract](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
- [Realtime transport](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)

Current contents:
- minimal PlatformIO project
- device identity helper
- pending claim persistence plus a persisted `ready for tracking` marker
- top-level firmware state machine with `SetupRecovery`, `Tracking`, `Reward`, and `TimeInvalid`
- a background sync task that keeps button handling local-first
- AP provisioning HTTP server for the locked local onboarding contract
- cloud claim redemption, heartbeat, fallback command poll, and runtime snapshot upload plumbing
- single-button input, RTC/NTP-backed time service, 21-week habit tracker, and LED board renderer
- minimal device settings store with cloud-applied `sync_settings`
- ambient-light-driven brightness control with palette preset application
- optional reward engine with built-in `clock` and palette-based `paint` rendering
- realtime MQTT command client plus MQTT presence and runtime snapshot publish for low-latency online delivery, with fallback cloud polling still retained
- offline-first boot behavior for provisioned devices with valid RTC time
- capped background Wi-Fi reconnect without automatic AP takeover for ordinary offline boots
- `5 second` runtime long-hold to enter Wi-Fi recovery
- dedicated time-error rendering when RTC/system time is not trustworthy

Local flashing:
- tracked [cloud_config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.h) now supports explicit development and beta config profiles
- local development uses ignored `cloud_config.local.h`
- hosted beta uses ignored `cloud_config.beta.h`
- copy from:
  - [cloud_config.local.example.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.local.example.h)
  - [cloud_config.beta.example.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.beta.example.h)
- Supabase and broker CA PEMs now live in those environment-specific headers when secure HTTPS and `mqtts` are enabled
- the current hosted beta baseline should now use `mqtt-beta.addone.studio:8883`, while still pinning the current broker CA PEM in `cloud_config.beta.h`
- if the broker ever has to fall back to the raw IP again, `cloud_config.beta.h` must also define `ADDONE_MQTT_BROKER_TLS_SERVER_NAME` to a DNS SAN present on the broker certificate, because the ESP32 TLS verifier does not treat IP literals as sufficient hostname proof
- device MQTT usernames and passwords are now fetched per-device over authenticated HTTPS and persisted locally; they are no longer the normal shipped value in the beta header
- `cloud_config.local.h` is ignored from Git
- `cloud_config.beta.h` is ignored from Git

PlatformIO environments:
- `addone-esp32dev`: local development firmware profile
- `addone-esp32dev-beta`: hosted beta firmware profile

Not implemented yet:
- final DNS-backed CA-signed broker hostname cutover
- custom reward artwork sync
- full end-to-end validation on the real beta stack across router, reconnect, and recovery cases
