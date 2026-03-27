Stage
S4: Beta Hardening And Durable Release Memory

Status
Blocked on `codex/s4-firmware-ota-validation` after publishing one real immutable OTA artifact and running the first real hardware validation loop. The branch now has a concrete beta.2 OTA artifact and release envelope for `AO_B0CBD8CFABB0`, but the hosted beta backend does not actually expose the accepted `T-039` OTA schema: `devices.firmware_channel`, `firmware_releases`, and `check_device_firmware_release(...)` are all missing from the live REST schema, so no real release row could be created and the device cannot enter the accepted OTA control plane.

Changes made
- Bumped the firmware OTA candidate version:
  - [firmware/include/config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h)
- Added the concrete release envelope for the hosted beta.2 artifact:
  - [firmware/releases/fw-beta-20260326-02.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260326-02.json)
- Updated the beta runbook to record the real artifact host and the hosted OTA-schema blocker:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
- Added this worker report:
  - [Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md)

Commands run
- `git switch -c codex/s4-firmware-ota-validation`
- `pio device list`
- `pio run -e addone-esp32dev-beta -t upload --upload-port /dev/cu.usbserial-10`
- `pio device monitor -p /dev/cu.usbserial-10 -b 115200`
- `pio run -e addone-esp32dev-beta`
- `shasum -a 256 .pio/build/addone-esp32dev-beta/firmware.bin`
- `stat -f '%z bytes' .pio/build/addone-esp32dev-beta/firmware.bin`
- `curl -s "$SUPABASE_URL/rest/v1/devices?...hardware_uid=eq.AO_B0CBD8CFABB0"...`
- `curl -s "$SUPABASE_URL/rest/v1/device_runtime_snapshots?select=device_id,generated_at,revision&order=generated_at.desc&limit=5"...`
- `curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/check_device_firmware_release"...`
- `curl -s "$SUPABASE_URL/rest/v1/firmware_releases?select=release_id&limit=1"...`
- `curl -s -X POST "$SUPABASE_URL/storage/v1/bucket"...`
- `curl -s -X POST "$SUPABASE_URL/storage/v1/object/firmware-artifacts/ota/fw-beta-20260326-02/firmware-42e687ee3dae9497.bin"...`
- `curl -I "https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-02/firmware-42e687ee3dae9497.bin"`
- `curl -s "https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-02/firmware-42e687ee3dae9497.bin" -o /tmp/fw-beta-20260326-02.bin && shasum -a 256 /tmp/fw-beta-20260326-02.bin && stat -f '%z bytes' /tmp/fw-beta-20260326-02.bin`

Evidence
- Exact files changed on this branch:
  - [firmware/include/config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h)
  - [firmware/releases/fw-beta-20260326-02.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260326-02.json)
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-26-firmware-ota-artifact-hosting-and-hardware-validation.md)
- Firmware build proof for the released artifact:
  - `pio run -e addone-esp32dev-beta` succeeded after bumping [config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/config.h) to `2.0.0-beta.2`
  - built artifact path: `.pio/build/addone-esp32dev-beta/firmware.bin`
  - SHA-256: `42e687ee3dae9497bf12a69410fa8432ce7a2b2a387a668205fb5a9038c9387b`
  - size: `1,134,144` bytes
- Exact hosted artifact reference:
  - public HTTPS URL: `https://sqhzaayqacmgxseiqihs.supabase.co/storage/v1/object/public/firmware-artifacts/ota/fw-beta-20260326-02/firmware-42e687ee3dae9497.bin`
  - `curl -I` returned `HTTP/2 200`
  - downloading that URL back to `/tmp/fw-beta-20260326-02.bin` reproduced the same SHA-256 and size as the local build
- Exact intended release reference captured in-repo:
  - [firmware/releases/fw-beta-20260326-02.json](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/releases/fw-beta-20260326-02.json)
  - target release id: `fw-beta-20260326-02`
  - target device allowlist: `AO_B0CBD8CFABB0`
  - intended previous stable release id: `fw-beta-20260326-01`
- Real hardware proof gathered on the bench device:
  - `/dev/cu.usbserial-10` reflashed successfully on the current beta.1 baseline and reported MAC `b0:cb:d8:cf:ab:b0`, matching hardware UID `AO_B0CBD8CFABB0`
  - serial output after reset showed:
    - `MQTT connected, subscribed to addone/device/AO_B0CBD8CFABB0/command`
    - `Uploaded runtime snapshot revision 101`
    - `Cloud RPC check_device_firmware_release -> HTTP 404`
  - hosted beta still sees the device live:
    - `devices.id = 21a6fae3-a304-45c0-bbbd-e6886a290012`
    - `firmware_version = 2.0.0-beta.1`
    - `last_seen_at = 2026-03-27T06:47:43.402131+00:00`
    - latest runtime snapshot revision observed through REST: `101` at `2026-03-27T06:46:51+00:00`
- Real backend blocker proof:
  - `POST /rest/v1/rpc/check_device_firmware_release` returned `404` with `PGRST202`
  - `GET /rest/v1/firmware_releases?select=release_id&limit=1` returned `PGRST205` because `public.firmware_releases` is absent from the hosted schema cache
  - `GET /rest/v1/devices?...select=firmware_channel...` returned `42703` because `devices.firmware_channel` does not exist remotely
- What remains before app update surfaces or operator tooling:
  - the hosted beta project must actually receive [supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260326153000_add_firmware_ota_control_plane.sql)
  - once that migration is live, one real `firmware_releases` row plus allowlist entry must be inserted for `fw-beta-20260326-02`
  - only after the hosted schema is real can the bench device complete staged download, provisional boot, local confirmation, and backend-visible `succeeded`

Open risks / blockers
- The accepted `T-039` backend baseline is not actually present on the hosted beta project, so `T-041` cannot reach a real release row or a backend-visible OTA success state from this branch alone.
- The branch now has a real artifact but no corresponding hosted `firmware_releases` row, because the remote table and RPCs do not yet exist on the beta backend.
- The bench device proved transport and runtime sync are still healthy, but the OTA path stops at the first control-plane call, before download, inactive-slot write, provisional boot, or local confirmation.
- Because the active OTA schema is missing remotely, this slice should not open app update UI or operator rollout controls yet; those surfaces would point at a nonexistent hosted control plane.

Recommendation
Treat `codex/s4-firmware-ota-validation` as a blocked but useful checkpoint, not an accepted `T-041` completion. Keep the published artifact and release envelope from this branch. Next, apply the accepted OTA control-plane migration to the hosted beta backend, confirm `devices.firmware_channel`, `firmware_releases`, and `check_device_firmware_release(...)` resolve through REST, then rerun this same bench loop on `AO_B0CBD8CFABB0` to create the real release row and capture the missing download, provisional boot, confirmation, and backend-visible success evidence.
