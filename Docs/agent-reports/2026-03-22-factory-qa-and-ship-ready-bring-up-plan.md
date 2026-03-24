---
task_id: T-021
title: Factory QA and ship-ready bring-up plan
date: 2026-03-24
agent: Codex
result_state: Implemented
verification_state: Live-validated
changed_paths:
  - Docs/agent-reports/2026-03-22-factory-qa-and-ship-ready-bring-up-plan.md
  - firmware/include/config.h
  - firmware/releases/factory-qa-candidate-20260323/boot_app0.bin
  - firmware/releases/factory-qa-candidate-20260323/bootloader.bin
  - firmware/releases/factory-qa-candidate-20260323/firmware.bin
  - firmware/releases/factory-qa-candidate-20260323/partitions.bin
  - firmware/releases/factory-stable.json
  - firmware/src/board_renderer.cpp
  - firmware/src/board_renderer.h
  - firmware/src/firmware_app.cpp
  - firmware/src/firmware_app.h
  - firmware/src/time_service.cpp
  - firmware/src/time_service.h
  - lib/supabase/database.types.ts
  - run-factory-station.sh
  - supabase/migrations/20260323111500_add_factory_device_runs_and_identity_prereg.sql
  - tools/factory-station/.env.example
  - tools/factory-station/.gitignore
  - tools/factory-station/README.md
  - tools/factory-station/package-lock.json
  - tools/factory-station/package.json
  - tools/factory-station/public/app.js
  - tools/factory-station/public/index.html
  - tools/factory-station/public/styles.css
  - tools/factory-station/run.sh
  - tools/factory-station/src/flash-runner.mjs
  - tools/factory-station/src/server.mjs
---

Stage
S2: Trusted Real-Device Validation

Status
Implemented, iterated, and live-validated on a newly built board. This branch no longer only contains a plan: it now contains a working beta factory station, firmware manufacturing-test support, backend factory-record support, release-manifest support, and launcher tooling. A new board was flashed from the approved manifest, hardware checks were run, the device was preregistered, the final factory reset returned the board to fresh customer setup, and the backend run was confirmed as ship-ready.

Changes made
- Added a repo-tracked firmware release manifest and candidate artifact bundle so the station flashes one approved build instead of whatever happens to be in the workspace:
  - `firmware/releases/factory-stable.json`
  - `firmware/releases/factory-qa-candidate-20260323/*`
- Added backend factory data support:
  - `factory_device_runs`
  - `preregister_factory_device_identity(...)`
  - generated TypeScript updates in `lib/supabase/database.types.ts`
- Added firmware manufacturing QA support over newline-delimited USB JSON:
  - device info and QA status
  - button-event capture
  - LED test patterns and mapping sweep
  - ambient sensor reads
  - RTC status, set, read, and factory reset helpers
- Added renderer and time-service support for factory QA patterns and RTC write/read access.
- Built a local Mac factory station under `tools/factory-station`:
  - local Node backend
  - browser UI
  - manifest loading and checksum validation
  - USB port discovery
  - flash runner
  - serial boot capture
  - guided QA workflow
  - backend preregistration
  - final reset verification
- Added launcher scripts for easier operator use:
  - `tools/factory-station/run.sh`
  - `run-factory-station.sh`
- Hardened the local station enough for beta bench use:
  - binds to `127.0.0.1`
  - requires a session token for browser-to-local-backend calls
  - filters the port list down to the real USB serial target
- Iterated the operator UI heavily during the live bench run:
  - sticky top log console
  - compact four-step flow
  - single flash/start entry point
  - automatic reconnect before RTC readback
  - progress summary that keeps passed checks visible
  - aligned top cards
  - icon-led section headers
- Fixed multiple real-run issues discovered only during physical board validation:
  - boot checks were incorrectly marked failed before boot data existed
  - flash path had `tty`/`cu` handling bugs on macOS
  - sandboxed server could not own the USB port for flashing
  - RTC retention tolerance was too strict for real operator timing
  - final ship-ready verification could miss a valid reset because the reboot banner was not always captured

Commands run
- `git status --short --branch`
- `git diff --name-only`
- `git diff --stat`
- multiple `rg`, `sed`, `find`, `lsof`, and serial-port inspection commands during planning, debugging, and validation
- `npm install` in `tools/factory-station`
- `node --check tools/factory-station/src/server.mjs`
- `node --check tools/factory-station/public/app.js`
- `pio run -e addone-esp32dev-beta`
- `npx supabase db push --linked`
- browser smoke checks against the live station with Playwright
- repeated real-board flash and QA runs through the factory station on `/dev/cu.usbserial-210`

Evidence
- The station now performs the full operator flow from one local tool:
  - flash approved firmware
  - reconnect and confirm boot state
  - run button / LED / ambient / RTC checks
  - preregister hardware
  - run final ship-ready reset
- Live device output showed the expected fresh-board identity and state after flash:
  - hardware UID `AO_A4F00F767008`
  - firmware `2.0.0-beta.1`
  - AP SSID `AddOne-7008`
  - state `SetupRecovery`
  - `Pending claim present: no`
  - `Ready for tracking: no`
- The successful board completed hardware QA after one RTC-module swap, proving the station can identify both a failing RTC module and a passing replacement unit.
- Backend inspection after the successful run showed:
  - final `factory_device_runs` row `c3c0f56c-165d-4f22-b836-6d47111baae6`
  - `status = ship_ready`
  - `ready_to_ship = true`
  - preregistered device row `e7e61f8b-f2a6-4fa9-a736-04d4e995c1bb`
- Backend inspection also confirmed the shipped board was still customer-clean:
  - no owner membership
  - no share codes
  - preregistered only
- Final reset verification on the successful board confirmed the intended ship state:
  - device returned to `SetupRecovery`
  - pending claim cleared
  - ready-for-tracking cleared
  - reset epoch advanced
- The user validated the operator flow directly on a new board and confirmed the overall result should be treated as a success.

Open risks / blockers
- Security hardening is not complete and was intentionally deferred while getting the QA workflow working:
  - onboarding still uses an open AP/local HTTP flow
  - cloud RPC transport still needs full TLS hardening
  - physical USB access should still be treated as trusted admin access
- The factory release manifest currently points to a candidate artifact built from `codex/s2-factory-qa-plan`, not a promoted `main` release. Coordinator should require a release-promotion follow-up before wider operator use.
- Only one full successful board run has been validated end to end so far. The station still needs more real-board proof on:
  - repeated known-good boards
  - intentional failure paths
  - retry/rework handling
- Retry attempts on the same hardware create multiple `factory_device_runs` rows. This is acceptable for now, but the operator flow should eventually make retries and canonical final runs clearer.
- The scope exceeded the original planning-only task. Coordinator should review this as an implemented first slice plus follow-up debt, not as a pure planning document.

Recommendation
Accept this branch as a successful beta-scope factory-station checkpoint and close the “what should the workflow be?” question for this repo. Treat the implemented station, backend support, and firmware QA protocol as the new baseline for factory bring-up.

Coordinator next step:
1. review this report as the refreshed final state for `T-021`
2. checkpoint the branch in git as the durable beta factory-station baseline
3. spin follow-up tasks for:
   - security hardening
   - release promotion from branch candidate to `main` stable artifact
   - multi-board validation and retry/rework UX cleanup

## Summary

This slice started as planning work and ended as a functioning beta factory station after repeated user-driven iteration on real hardware. The repo now has a concrete operator tool and a verified board path from first flash to ship-ready state. The major remaining gaps are not “how do we do factory QA?” anymore; they are release discipline, security hardening, and broader validation across more physical boards.

## Verification

Verified:
- firmware build passed
- local station server syntax checks passed
- live browser station loaded and responded
- linked Supabase migration was pushed
- one newly built board was flashed through the station
- live button, LED, ambient, RTC, preregistration, and ship-ready reset flow passed
- backend records were checked after the run and matched the expected ship-ready state

Not verified in this slice:
- broader security hardening changes
- promoted `main` release artifact flow
- multiple repeated known-good boards
- intentional failure/rework flow on all hardware dimensions

## Decisions / assumptions

- The first useful beta factory tool should be `browser UI + local Node backend`, not a browser-only tool and not a full desktop app.
- The backend is the source of truth for factory notes, QA results, preregistration, and ship-ready signoff.
- Fresh boards should expose factory QA automatically after flash so operators do not need an extra boot gesture during the standard workflow.
- Final shipment state is still fresh customer setup; factory uses that state first for QA, then resets the board back into that same customer-first-boot state.
- The current release manifest is acceptable as a beta candidate checkpoint but should not be treated as the long-term stable-release process.

## Open questions or blockers

- Should the next slice require a real failure-injection matrix on at least one intentionally bad board for every major hardware check?
- Should the station collapse retries for one hardware UID into one canonical run view, or should the backend continue to preserve every partial attempt as separate history?
- When the release process is promoted to `main`, who owns cutting and verifying the approved firmware artifact bundle before operators start using the station routinely?
