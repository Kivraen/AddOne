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
- cloud claim redemption and first heartbeat plumbing

Not implemented yet:
- real cloud credentials/config for flashed hardware
- command pull / ack
- day-event sync
- button handling
- board rendering
- reward rendering
