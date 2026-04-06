# Closed-Testing Launch Prep Coordinator Plan

Date: April 5, 2026
Stage: `S4: Beta Hardening And Durable Release Memory`
Status: `planned`

## Summary

The launch-prep phase is now split into an ordered coordinator program instead of one mixed release-prep task. Closed testing remains the immediate target, but the work should be treated as public-grade launch preparation.

## Locked Decisions

- Distribution stage: `TestFlight + Play closed testing`
- iPad: out of scope
- No-device primary CTA: `Join waitlist`
- No-device secondary CTA: `Learn how it works`
- Launch web and legal surfaces: same repo
- Analytics stack: `PostHog + Sentry`
- Email scope: basic launch-ready email, not full lifecycle automation

## Ordered Task Sequence

1. `T-056` final baseline freeze and bug gate
2. `T-057` hardware-companion positioning and no-device UX
3. `T-058` public release identity and build configuration
4. `T-059` reviewer access and demo path
5. `T-060` legal, privacy, support, and account deletion
6. `T-061` launch web surfaces in the same repo
7. `T-062` analytics, crash reporting, feedback, and basic email
8. `T-063` store listing assets and metadata pack
9. `T-064` final closed-testing submission gate

## Parallelism Rules

- `T-056` must complete first.
- `T-060` and `T-061` can run in parallel after the baseline is stable.
- `T-062` and `T-063` can run in parallel after the legal and web shape is clear.
- `T-059` planning can overlap with `T-060`, but the implementation should wait until `T-058` locks the production identity.

## Coordinator Intent

- `T-055` remains the umbrella launch-prep gate.
- Future agents should work one scoped slice at a time.
- The repo should not return to broad mixed branches for launch work.
- The next immediate brief is `T-056`.
