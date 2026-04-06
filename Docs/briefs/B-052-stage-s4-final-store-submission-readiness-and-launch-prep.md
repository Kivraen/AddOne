Required skill:
- `stage-coordinator` in `/Users/viktor/.codex/skills/stage-coordinator/SKILL.md`

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Implementation branch:
Continue on:
`codex/s4-post-stable-followups`

Stable baseline:
- `main` = `5abc1e3`
- `codex/s4-post-stable-followups` = `5abc1e3`
- tag = `s4-stable-main-20260405-simulator-recovery`

Mode:
This is a release-prep coordinator task, not a broad implementation task.
Guide the user through the final cross-platform test run and convert that run into actual App Store and Google Play submission readiness.

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/agent-coordination.md`
- `Docs/git-operations.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-04-beta-hardening-and-durable-release-memory.md`
- `Docs/tasks/T-049-final-ios-release-candidate-polish-and-baseline-lock.md`
- `Docs/tasks/T-050-first-device-onboarding-and-setup-polish.md`
- `Docs/tasks/T-054-forward-only-weekly-target-semantics-and-security-hardening.md`
- `Docs/tasks/T-055-final-store-submission-readiness-and-launch-prep.md`
- `Docs/agent-reports/2026-04-04-final-rc-review-and-ota-stability-checkpoint.md`
- `Docs/agent-reports/2026-04-05-history-truth-review-followups-and-recovery-checkpoint.md`
- `Docs/agent-reports/2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md`

Stage:
`S4: Beta Hardening And Durable Release Memory`

Goal:
Turn the current stable AddOne baseline into a real public-release candidate for both iOS and Android by guiding the final test run, closing store-facing blockers, and producing the exact artifacts and answers needed for submission.

Hard product decisions already made:
- iPad is out of scope for this launch
- do not prepare iPad screenshots
- if iOS tablet support is still implicitly enabled, treat explicit tablet-disable work as a legitimate launch fix rather than ignoring the requirement

Known release-prep risks to verify immediately:
1. Public release identity may still be unresolved.
- `app.config.js` currently supports `development` and `beta`
- `eas.json` currently has no Android store profile and the store iOS profile still points at `APP_VARIANT=beta`
- do not let the public app ship under the wrong identifiers

2. Account deletion may still be missing.
- sign-out exists
- an in-app account deletion flow is not yet obvious
- treat this as a likely real blocker unless proven otherwise

3. Privacy-policy, support, and account-deletion URLs may still be missing.
- do not assume store metadata can be filled later without confirming what actually exists

4. OTP-only auth may block reviewer access.
- Apple and Google review need workable access
- Google review access must not rely on expiring OTP steps

5. The March 27 Supabase auth dashboard URL, redirect, and OTP settings still need explicit confirmation.

How to operate:
- Guide the user through one release-prep block at a time.
- Do not dump the whole plan at once unless asked.
- For each block:
  1. state exactly what must be verified or produced
  2. state the expected result
  3. wait for the user’s result
  4. record pass / fail / blocked
  5. decide the next block
- Use current official Apple and Google source material for store requirements instead of relying on stale memory.
- If the user reports a real app issue during the final run, inspect only the relevant code path and make the smallest safe fix.
- Do not work on `main` directly.

Final outputs required:
- final pass/fail matrix for iPhone and Android
- final screenshot plan and screenshot capture list
- final metadata pack requirements list
- exact remaining launch blockers, if any
- exact next steps to submit:
  - iOS
  - Android

Non-negotiables:
- do not assume store readiness from “the app works”
- treat missing production identifiers, missing account deletion, missing privacy policy, or unworkable reviewer login as real blockers
- keep iPad out of scope for this launch
- do not silently widen back into unrelated polish work

Required report format:
1. `Stage`
2. `Status`
3. `Validation matrix`
4. `Evidence`
5. `Open risks / blockers`
6. `Recommendation`
