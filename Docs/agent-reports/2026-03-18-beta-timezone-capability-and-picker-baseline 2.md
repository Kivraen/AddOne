---
task_id: T-011
title: Beta timezone capability and picker baseline
date: 2026-03-18
agent: Ptolemy
result_state: Partial
verification_state: Partially Verified
changed_paths:
  - app/(app)/onboarding/
  - app/(app)/devices/
  - components/settings/
  - lib/
  - firmware/src/
---

# Summary

The timezone picker direction is implemented around a correct regional-vs-fixed-offset model, and DST is correctly treated as part of the timezone definition instead of a separate toggle.

# Source docs used

- timezone audit
- canonical spec
- UI issue log

# Files changed

- timezone picker and related wiring across app and firmware

# Verification

- `npm run typecheck` and runtime checks were reported, but the manual proof pass was incomplete

# Decisions / assumptions

- regional timezone is the default path
- fixed UTC offset is an advanced no-DST mode

# Open questions or blockers

- reset-time editing still needed restoration or explicit relocation
- manual proof across onboarding, settings, recovery, and fixed offsets was not yet complete

# Recommended next handoff

- run the `B-006` revision pass before accepting `T-011`
