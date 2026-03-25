Stage
S3: Beta UI Completion And Social Shape

Status
Audit complete. This was a read-only planning pass. No implementation changes were made.

What works
- The underlying profile model is already the right beta model: first name, last name, `@username`, optional photo, and private email as auth-only context.
- The Friends gate belongs at the Friends entry point, not in onboarding.
- The current technical shell is workable; the main issue is hierarchy and density, not missing architecture.

What is off
- The first-glance hierarchy is backward. The required identity-completion action is visually diluted by banners, preview treatment, account context, and repeated helper copy.
- The Friends gate is clean in the Friends tab, then noisy once it lands in Profile.
- Account details and social identity are logically distinct but visually mixed together, so the screen reads administrative instead of human and action-first.
- The current Profile surface is denser than the rest of the app and does not match the "one obvious next step" rule in the AddOne UI direction.

Recommended redesign direction
- Polish Profile before the Friends UI experiment.
- Keep the scope narrow:
  - make `from=friends` mode one obvious completion path
  - put social identity first
  - demote account and sign-out
  - remove repeated helper and status copy
  - keep the current data model and auth model intact
- Later, if needed, split the gate-completion surface from the steady-state profile-management surface. That is not required for the first experiment.

Decision
Profile should be cleaned up before the Friends UI experiment. The next implementation slice should be a narrow Profile hierarchy and gate-polish pass, not a broad account redesign.
