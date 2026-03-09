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

Current contents:
- minimal PlatformIO project
- device identity helper
- pending claim persistence
- top-level firmware state machine skeleton
- AP provisioning HTTP server for the locked local onboarding contract
- cloud claim redemption, heartbeat, command sync, and device day-event sync plumbing
- single-button input, RTC/NTP-backed time service, 21-week habit tracker, and LED board renderer
- minimal device settings store with cloud-applied `sync_settings`
- ambient-light-driven brightness control with palette preset application
- optional reward engine with built-in `clock` and palette-based `paint` rendering

Not implemented yet:
- real cloud credentials/config for flashed hardware
- custom reward artwork sync
- end-to-end hardware validation on a real device
