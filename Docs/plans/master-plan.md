# AddOne Master Plan

Last locked: March 19, 2026

## Summary

AddOne is in `post-architecture, pre-beta validation`.
The app, backend, realtime gateway, and firmware foundations exist.
The current work is about locking the visible beta surface, validating real behavior, and preserving durable release memory.

## Stage Map

- `S0: Coordination Bootstrap` — `accepted`
- `S1: Validation Baseline Ready` — `pending`
- `S2: Trusted Real-Device Validation` — `pending`
- `S3: Beta UI Completion And Social Shape` — `active`
- `S4: Beta Hardening And Durable Release Memory` — `pending`

## Active Focus

`S3` is active.
The next concrete dependency is `T-009 Profile identity model and account surface`, which unlocks the first-beta Friends implementation.

## Cross-Stage Rules

- Keep one active stage at a time unless the user explicitly opens a parallel track.
- Use repo docs plus git history as durable memory.
- Commit and push accepted state when a remote exists.
- Keep onboarding and Wi-Fi recovery as the final visible UI polish slice for `S3`.
- Do not broaden first-beta Friends into a full social platform.
