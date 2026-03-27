Stage
S4: Beta Hardening And Durable Release Memory

Status
Planning pass complete. The current repo has a real app distribution path and a real factory firmware release path, but it does not have field firmware OTA yet. The recommended launch path is to keep app updates store-managed, build firmware OTA on top of the transport-trust and device-identity foundation, and keep the first customer-launch model simple: automatic discovery plus staged eligibility, user-triggered install by default, operator-controlled rollout and rollback. [Docs/briefs/B-031-stage-s4-firmware-ota-architecture-and-rollout-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/briefs/B-031-stage-s4-firmware-ota-architecture-and-rollout-plan.md) [Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md)

Current update posture
- App updates today are build and store based. `beta` is EAS internal distribution, `testflight` is store distribution, and the checked-in app version is `0.2.0`. There is no `expo-updates` dependency in the app manifest and no update configuration in `app.config.js`, so app JS OTA is not currently wired. [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json#L14) [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json#L22) [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js#L9) [package.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/package.json#L18)
- Firmware updates today are manual and factory-based. The beta firmware profile is `addone-esp32dev-beta`, hosted beta relies on ignored `cloud_config.beta.h`, and the only release artifact flow in repo is the factory manifest loaded by the factory station over USB. [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md#L37) [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md#L52) [firmware/platformio.ini](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/platformio.ini#L34) [tools/factory-station/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/tools/factory-station/README.md#L6)
- The current factory release manifest already carries release IDs, version metadata, and artifact hashes, but it still points at a branch-based QA candidate rather than a promoted OTA-ready release system. [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L3) [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L8) [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L13)
- The app already carries device-side state that OTA can build on: `lastSeenAt`, `lastSyncAt`, `recoveryState`, `syncState`, and `firmwareVersion` are already mapped into device state. That means minimum update UI is a focused product slice, not a brand-new data-model invention. [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts#L322) [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts#L328) [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts#L332) [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts#L347)
- OTA should not depend on MQTT for correctness. The current realtime contract already treats MQTT as the fast path and HTTP polling as the fallback recovery path when devices are offline or realtime is unavailable. [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md#L62) [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md#L159)

Target app update model
- Launch default: keep app updates on the App Store and Play Store path. That matches the repo’s current EAS/TestFlight setup and keeps the launch update model easy to operate. [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json#L14) [eas.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/eas.json#L22)
- Minimum launch behavior: the app shows its current version, can learn whether a newer store version exists, and links the user to update. App update availability should be surfaced, but app OTA should not be a launch dependency.
- App JS OTA: do not make Expo JS OTA part of the first customer-launch plan. It is not wired now, it adds another release surface, and it does not solve the more important firmware-update problem. Only consider it later if the store path proves too slow for JS-only fixes. [package.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/package.json#L18) [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js#L4)
- Relationship to firmware: app releases and firmware releases should be independent by default, but the firmware release registry should support optional compatibility fields such as `min_app_version` when a new firmware flow requires a newer app UI. Do not bind normal firmware releases to mandatory app releases unless the feature actually needs it.

Target firmware OTA model
- Primary recommendation: use a Supabase-backed release registry plus immutable HTTPS firmware artifacts. This is the smallest launch-grade model that fits the current repo because AddOne already centers release state in Supabase, already records `firmware_release_id` and `firmware_version` in factory runs, and already expects device cloud authority to live there. [supabase/migrations/20260323111500_add_factory_device_runs_and_identity_prereg.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260323111500_add_factory_device_runs_and_identity_prereg.sql#L11) [supabase/migrations/20260323111500_add_factory_device_runs_and_identity_prereg.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260323111500_add_factory_device_runs_and_identity_prereg.sql#L12) [Docs/AddOne_Backend_Model.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Backend_Model.md#L18)
- Artifact scope: keep factory flashing and OTA separate. Factory flashing can continue to own `bootloader`, `partitions`, `boot_app0`, and initial `firmware.bin`, but the launch OTA path should update only the application firmware image in the field. That keeps OTA smaller, safer, and easier to roll back than rewriting the full flash layout on customer devices. [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L13) [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L31)
- Release registry shape: each firmware release should have `release_id`, `firmware_version`, `hardware_profile`, `channel`, `status`, `artifact_url`, `sha256`, `size_bytes`, `rollout_mode`, `rollout_value`, `min_app_version` optional, `previous_stable_release_id`, and operator notes. `status` should minimally support `draft`, `active`, `paused`, `rolled_back`, and `archived`.
- Integrity and authenticity: for launch, the minimum safe model is operator-only release publication, CA-validated HTTPS to both the release registry and artifact host, immutable artifact URLs, and on-device SHA-256 verification before apply. That reuses the repo’s current hash-based release discipline without forcing a more complex signature pipeline into the first launch slice. Optional later hardening: detached release signatures. [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L16) [Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md)
- Device update-check flow: the device should check for an eligible firmware release over authenticated HTTPS on boot and on a periodic cadence, with the backend deciding eligibility from channel plus rollout policy. The app can request an immediate check, and MQTT can be used as a best-effort nudge for online devices, but HTTPS polling must remain the correctness path. That matches the current repo’s “MQTT fast path, HTTP fallback” model. [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md#L62) [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md#L159)
- Who controls what:
  - Operator-controlled: publish draft release, activate rollout, pause rollout, abort bad rollout, mark stable, and assign rollback target.
  - System-controlled: determine which devices are eligible based on channel and staged rollout rules.
  - User-controlled by default: start the device install from the app when an eligible update is available.
  - Optional later improvement: allow operator-forced auto-install for critical releases, but do not make that the launch default.
- Staged rollout model: do not “upload once and push to everyone.” Releases should first target an internal allowlist, then a small percentage or cohort, then the broader production channel. A release marked `paused` must stop becoming available to new devices immediately. A release marked `rolled_back` must point future checks to the previous stable release.
- Device apply flow:
  1. Device learns that a target release is available from the authenticated update-check response.
  2. User taps `Update device` in the app, or an internal cohort device is set to auto-apply for validation.
  3. Device downloads the firmware artifact over CA-validated HTTPS.
  4. Device verifies `hardware_profile`, expected version, size, and SHA-256.
  5. Device writes the new firmware to the inactive OTA slot, reboots, and confirms the boot only after basic post-boot health passes.
  6. Device reports success and the new `firmware_version`, or reports failure and returns to the prior confirmed firmware.
- Rollback model:
  - Mandatory device rollback: if the new firmware fails verification, fails to boot, or fails post-boot confirmation, the device must fall back to the prior confirmed firmware automatically.
  - Mandatory operator rollback: the release system must let operators pause the bad release and re-target devices to the previous stable release.
  - Recommended launch behavior: support controlled downgrade to the previous stable release for affected devices, not just “stop future installs.” Otherwise one bad but bootable release can remain stuck in the field.
- Prerequisite dependency: none of this should ship until the transport-trust plan is done. OTA over the current `setInsecure()` posture would be unsafe by construction. [Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md) [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md#L77)

Minimum launch UI and status surfaces
- App settings or about surface:
  - current app version
  - app update available state
  - `Update app` link to the store when a newer app build exists
- Device settings or device status surface:
  - current firmware version
  - available firmware version when eligible
  - current device update status
  - `Update device` action when the device is online and eligible
  - last update result if the previous attempt failed or rolled back
- Minimum user-facing firmware states:
  - `Up to date`
  - `Update available`
  - `Downloading update`
  - `Installing update`
  - `Update failed`
  - `Rolled back`
  - `Recovery needed`
  - `Device offline`
- Minimum backend-tracked OTA states should be richer than the user UI. At minimum: `available`, `requested`, `downloading`, `verifying`, `applying`, `succeeded`, `failed_download`, `failed_verify`, `failed_boot`, `rolled_back`, and `recovery_needed`. The app can compress these into simpler user-facing labels.
- Existing repo fit: the app already has `firmwareVersion`, `lastSeenAt`, `lastSyncAt`, `syncState`, and `recoveryState`, so the launch UI should extend those surfaces rather than invent a separate update-status model. [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts#L322) [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts#L328) [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts#L347)

Required release and rollback tooling
- Release publication:
  - build the launch OTA artifact
  - compute and store SHA-256
  - upload the immutable artifact to the chosen HTTPS host
  - create a `draft` release record in Supabase with rollout metadata
- Rollout controls:
  - activate internal-only rollout
  - promote to staged cohorts
  - pause immediately
  - resume
  - mark bad release
  - assign previous stable release as rollback target
- Device and release observability:
  - per-release counts by state
  - per-device current firmware version
  - per-device target release
  - last OTA attempt time
  - last OTA error code or reason
  - whether the device is stuck in `recovery_needed`
- Operator workflow:
  1. Publish release as `draft`.
  2. Validate on internal devices.
  3. Activate for a small cohort.
  4. Observe failures and success rates.
  5. Pause or roll back if error rates spike.
  6. Promote to broader rollout only after the small cohort stabilizes.
- Tooling form factor: a simple protected internal admin page or narrow CLI against Supabase is sufficient for launch. A sophisticated release-control product is not required if the team can safely perform the workflow above.

Implementation order
1. Finish the transport-trust and device-identity foundation first: validated HTTPS, validated MQTT, scoped broker credentials, ACLs, and a clean device identity lifecycle. OTA must not start on top of the current insecure transport posture. [Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-transport-trust-and-device-identity-plan.md)
2. Lock the device-side OTA safety model: confirm an OTA-capable partition and boot-confirmation strategy, define when a new boot is considered healthy, and define exactly how the device returns to the prior confirmed firmware.
3. Create the release registry and artifact flow in Supabase: release records, rollout states, artifact metadata, operator-only publication, previous-stable linkage, and per-device OTA status records. Reuse the current release-ID and hash conventions from the factory flow where practical. [firmware/releases/factory-stable.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/factory-stable.json#L3) [supabase/migrations/20260323111500_add_factory_device_runs_and_identity_prereg.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260323111500_add_factory_device_runs_and_identity_prereg.sql#L11)
4. Implement the firmware OTA client on device: authenticated update check, download, verify, apply, boot confirm, rollback, and status reporting. Keep MQTT optional for nudges only.
5. Add the minimum app surfaces and controls: current app version, current firmware version, available firmware version, update status, offline messaging, and the `Update device` action.
6. Build the operator tooling and observability: publish draft, staged rollout, pause, rollback target assignment, and per-device failure inspection.
7. Run launch validation in order: internal devices first, then a small real-user cohort, then broader rollout. Prove pause, bad-release halt, automatic boot rollback, and explicit rollback to a prior stable release before customer launch.

Open risks / assumptions
- The current repo does not yet show a field OTA implementation or an explicit OTA partition strategy. Assumption: launch-grade firmware OTA will require a device-side partition and boot-confirmation design that may force a firmware storage-layout change before implementation starts.
- This plan assumes firmware OTA artifact delivery can use CA-validated HTTPS from a trusted host. If the chosen storage or CDN path cannot provide that cleanly, the artifact-host decision becomes a launch blocker.
- This plan assumes app store updates are acceptable as the first app-update policy. If the team later decides that store latency is unacceptable, Expo JS OTA becomes a separate release-safety program and should not be folded into the first firmware OTA implementation by accident.
- This plan assumes the release registry lives in Supabase because that is the smallest system the current repo can operate safely. If operational scale or audit needs later outgrow that, the release-control plane can move, but that is not a launch prerequisite.
- This plan treats user-triggered install as the default launch behavior. A future automatic-install policy may be appropriate for critical fixes, but making auto-install the first customer-launch default would raise support and recovery complexity without solving the repo’s current primary gap.
