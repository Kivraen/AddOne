---
task_id: T-006
title: Timezone model and universal flow audit
date: 2026-03-18
agent: Hubble
result_state: Implemented
verification_state: Verified
changed_paths:
  - Docs/ui-beta-issue-log.md
---

# Summary

The audit concluded that AddOne already treats timezone as a single device scheduling setting across onboarding, recovery, settings, runtime projection, and backend sync, but firmware currently honors only a narrow set of zones and otherwise falls back to Los Angeles rules.

# Source docs used

- `Docs/AddOne_V1_Canonical_Spec.md`
- firmware timezone code

# Files changed

- timezone audit report
- UI issue log

# Verification

- core claim was verified in code during coordinator review

# Decisions / assumptions

- device timezone remains canonical
- future viewer/display timezone must remain separate
- raw free-text timezone entry should not be the main beta path

# Open questions or blockers

- universal timezone support is still firmware-blocked

# Recommended next handoff

- implement a beta timezone picker baseline with honest capability limits
