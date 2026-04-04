## Stage

`S4: Beta Hardening And Durable Release Memory`

## Status

Checkpointed on `codex/s4-final-rc-review` after the April 4, 2026 user-guided final RC review and multiple fresh immutable OTA proofs.

This branch is now the stable save point for the current release-candidate line, but it is not yet recorded as the final TestFlight candidate because one external release check still needs explicit confirmation:

- Supabase auth dashboard URL / OTP settings from [2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md)

Current branch state at this checkpoint:

- branch: `codex/s4-final-rc-review`
- baseline reviewed from: `0bea496` on `codex/s4-weekly-target-semantics-support`
- working tree before checkpoint: dirty with RC validation fixes, OTA UX polish, fresh release manifests, and one unapplied host-side migration for shorter OTA confirm windows

## Validation matrix

| Review block | Result | Notes |
| --- | --- | --- |
| 1. Auth and sign-in | Pass | User-guided iOS review in this validation cycle covered OTP request, OTP entry, success and failure copy, and session recovery after relaunch. No later fixes reopened this area. |
| 2. First-device onboarding | Pass at sanity level | The add-device entry, onboarding flow clarity, Wi-Fi setup path, and setup completion handoff were manually reviewed in the same RC cycle. No blocker remained, but `T-050` is still tracked separately as the coordinator-owned polish gate if more onboarding refinement is desired before submission. |
| 3. Home and core control | Pass | The Home board load, today-toggle feel, KPI consistency, and refresh or relaunch truth were reviewed alongside the accepted `T-048` work and the April 4 RC branch did not reopen a Home blocker. |
| 4. History and weekly target semantics | Pass for the required support-slice review | The manual `3 -> 1 -> 3` target-change review and older-history sanity checks were completed on the `0bea496` baseline, but `T-054` should still remain a separate coordinator acceptance decision because it widened into semantics and security work. |
| 5. Friends and account-adjacent surfaces | Pass at sanity level | Friends controls, share/connect paths, and adjacent navigation were manually sanity-checked in the same RC review cycle with no release blocker reopened. |
| 6. Device settings and lifecycle | Pass at sanity level | Board settings entry, recovery/remove/start-new-habit sanity, and temporary UI cleanup were exercised without a new blocker. |
| 7. Firmware update launch proof | Pass | Fresh immutable releases `fw-beta-20260404-04` through `fw-beta-20260404-08` were created and tested. Real app-triggered OTA installs completed on live boards, including simultaneous Gym/iPhone and Yoga/Android runs finishing successfully on `2.0.0-beta.11`. |
| 8. Final launch gate | Revise and retry | The app and firmware candidate is now stable enough to checkpoint and merge into the RC branch, but the release cannot be called the final TestFlight candidate until the external Supabase auth dashboard settings are explicitly re-confirmed. |

## Evidence

- App-side OTA/status-surface polish now checkpointed in the branch:
  - simplified firmware progress UI with one active stage label instead of stacked badges
  - clearer failure and retry copy
  - owner-facing `Retrying download` state when firmware reports an automatic retry
  - Android native tab bar forced dark to match the app shell
  - Android reload redbox mitigated by removing unused store rehydrate writes
- Firmware and OTA client hardening now checkpointed in the branch:
  - retryable OTA download attempts now surface attempt metadata through existing OTA event fields
  - OTA client/reporting changes preserve the reason for a retryable failure on the next `downloading` event
  - OTA safety contract and local firmware defaults now support shorter confirm windows, with a host migration prepared for later rollout
- Fresh immutable April 4 release evidence:
  - `fw-beta-20260404-04` -> `2.0.0-beta.7`
  - `fw-beta-20260404-05` -> `2.0.0-beta.8`
  - `fw-beta-20260404-06` -> `2.0.0-beta.9`
  - `fw-beta-20260404-07` -> `2.0.0-beta.10`
  - `fw-beta-20260404-08` -> `2.0.0-beta.11`
- Final simultaneous OTA proof on `fw-beta-20260404-08`:
  - `Gym`: `requested -> downloading -> downloaded -> verifying -> staged -> rebooting -> pending_confirm -> succeeded`
  - `Yoga`: `requested -> downloading -> downloaded -> verifying -> staged -> rebooting -> pending_confirm -> succeeded`
  - both boards finished on `2.0.0-beta.11`
- Validation commands completed during this checkpoint:
  - `npx tsc --noEmit`
  - `git diff --check`
  - `pio run -d firmware -c /tmp/addone-platformio-beta9.ini -e addone-esp32dev-beta-ota-proof`
  - `pio run -d firmware -c /tmp/addone-platformio-beta11.ini -e addone-esp32dev-beta-ota-proof`
  - multiple `curl` / rollout-operator checks against `get_device_firmware_update_summary`, `device_firmware_ota_events`, and `device_firmware_update_requests`

## Open risks / blockers

- External release check still open:
  - the Supabase auth dashboard URL / OTP configuration from March 27 must be explicitly re-confirmed before declaring the release-candidate branch ready for the final TestFlight build
- The new owner-facing `Retrying download` path is implemented but not yet hardware-proven because no April 4 OTA run actually hit an automatic retry after the new firmware was installed
- The host-side migration [20260404201000_allow_shorter_ota_confirm_window.sql](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/migrations/20260404201000_allow_shorter_ota_confirm_window.sql) exists locally but was not applied to the hosted beta database during this checkpoint, so live releases still used `confirm_window_seconds = 120`
- `T-054` should remain a separate coordinator acceptance decision even though its code is part of the current candidate branch

## Recommendation

Checkpoint and push `codex/s4-final-rc-review` as the stable April 4 RC validation branch.

Coordinator next steps:

1. Treat this branch as the saved release-candidate line instead of leaving the work only in a dirty tree.
2. Re-confirm the external Supabase auth dashboard settings from the March 27 report.
3. If that external check still matches expected production values, use `codex/s4-final-rc-review` as the branch to build the next iOS RC/TestFlight artifact from.
4. Keep `main` untouched until that final coordinator acceptance is explicit.
