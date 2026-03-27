# Firmware Rollout Operator

Minimal beta-only operator CLI for AddOne firmware release activation, device targeting, rollback, and rollout inspection.

## Required Environment

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

You can either export those variables in your shell first or pass an env file with `--env-file`.

## Commands

Run from the repo root:

```bash
node services/firmware-rollout-operator/index.mjs activate --release <release_id> --env-file .codex-tmp/realtime-gateway.env
node services/firmware-rollout-operator/index.mjs target --release <release_id> --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env
node services/firmware-rollout-operator/index.mjs request --release <release_id> --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env
node services/firmware-rollout-operator/index.mjs rollback --release <release_id> --hardware-uids AO_B0CBD8CFABB0 --env-file .codex-tmp/realtime-gateway.env
node services/firmware-rollout-operator/index.mjs inspect --release <release_id> --env-file .codex-tmp/realtime-gateway.env --json
```

## Scope Boundary

- This tool manages rollout state for already-published immutable firmware releases.
- It does not upload firmware artifacts.
- It does not create draft release rows from manifests yet.
- It keeps release-state transitions in database RPCs so operators do not hand-edit `firmware_releases` or rollout allowlists.
