Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented on `codex/s4-app-update-status-surfaces`.

The minimum owner-facing firmware surface is in place and typechecks. Real-device progression on Meditation is blocked by that board's current base firmware: it rejects `begin_firmware_update` with `Unsupported command kind.`, so this board cannot complete an app-triggered OTA from its present image.

Changes made
- Added the narrow OTA status/update card to device settings, backed by a new owner-safe firmware summary RPC and one user-triggered install action.

Exact files changed:
- [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- [Docs/AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md)
- [app/(app)/devices/[deviceId]/settings/index.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/(app)/devices/[deviceId]/settings/index.tsx)
- [components/settings/device-firmware-update-card.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/settings/device-firmware-update-card.tsx)
- [hooks/use-device-firmware-update.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-device-firmware-update.ts)
- [lib/addone-query-keys.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/addone-query-keys.ts)
- [lib/supabase/addone-repository.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/supabase/addone-repository.ts)
- [types/addone.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/types/addone.ts)
- [20260327104500_add_owner_firmware_update_summary.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260327104500_add_owner_firmware_update_summary.sql)
- [20260327111000_fix_owner_firmware_update_summary_flags.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260327111000_fix_owner_firmware_update_summary_flags.sql)
- [20260327112000_fix_owner_firmware_update_summary_null_ota_state.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260327112000_fix_owner_firmware_update_summary_null_ota_state.sql)

Notable final polish:
- `not_in_rollout` no longer shows `Up to date`; it shows `No update yet`.
- Immediate command rejection is now treated as a failed request instead of showing a false success alert.
- The failure copy now explains the OTA-capable baseline requirement for this exact rejection.

Backend assumption the UI now depends on:
- The app depends on `get_device_firmware_update_summary(device_id, app_version)` and `begin_firmware_update(device_id, release_id)` being present in beta.
- The summary currently assumes owner-visible beta devices on the shipped OTA path use `addone-dual-ota-v1`, because partition layout is not exposed in owner-readable device metadata.

Commands run
- `npx supabase db push --linked`
- `npm run typecheck`
- `git diff --check`
- `git diff --name-only`
- `git ls-files --others --exclude-standard`
- targeted `rg` and `sed` inspections across app, backend, and firmware sources

Evidence
- No-update state:
  - screenshot showed `2.0.0-beta.1`, `No update ready`, and `Latest eligible target: 2.0.0-beta.3` before allowlisting.
- Update-available state:
  - after allowlisting, the `Install update` action was active on the same screen.
- In-progress state:
  - not reached on the real Meditation board, because the board rejected the OTA command immediately.
  - the UI proof state exists at `/devices/studio-01/settings?proofState=in-progress`.
- Failed state:
  - after the app fix, the device showed:
    - `This board rejected the OTA request. It needs a newer OTA-capable base firmware before app-triggered updates will work here.`
- Backend match for that failed state:
  - command row `failed`
  - update request row `cancelled`
  - OTA status moved to `blocked`
  - rejection detail was `Unsupported command kind.`
- `npm run typecheck` passed.
- `git diff --check` passed.

Open risks / blockers
- Meditation is not on an OTA-capable base image even though it reports `2.0.0-beta.1`; the live board rejects `begin_firmware_update`, while the accepted OTA-capable firmware in the repo does handle it.
- Because of that hardware baseline mismatch, this branch could not produce real-device `in-progress` or `succeeded` OTA proof on Meditation.
- The feature is intentionally narrow and does not include rollout-console, release-management, or firmware-side remediation.

Recommendation
Accept this as the minimum app/status surface implementation, with the blocker recorded against the device baseline rather than the UI slice.

For full live OTA proof through the app surface, use a board already on the accepted OTA-capable baseline or reflash Meditation to that baseline, then rerun the flow to capture real `in-progress` and `succeeded` states.
