# AddOne Realtime Gateway

This service bridges:
- Supabase `device_commands`
- the MQTT broker used for online device delivery

It is intentionally small:
- Supabase remains the system of record
- MQTT is the fast delivery lane for online devices
- offline recovery still uses the existing queued-command fallback

## Responsibilities

- watch queued commands in Supabase
- publish them to `addone/device/<hardware_uid>/command`
- receive device-originated MQTT acknowledgements, presence, day events, and runtime snapshots
- forward those MQTT messages back into the existing Supabase RPC surface

## Current Scope

Implemented:
- broker connection
- Supabase service-role connection
- realtime subscription to queued `device_commands`
- publish command payloads to per-device command topics
- startup replay of currently queued commands
- MQTT subscriptions for:
  - command acknowledgements
  - device presence
  - day-state events
  - runtime snapshots
- lightweight duplicate suppression for rapid command republishes
- health endpoint on `GET /health`

Still using existing Supabase RPC path for writes:
- `ack_device_command(...)`
- `record_day_state_from_device(...)`
- `device_heartbeat(...)`
- `upload_device_runtime_snapshot(...)`

That keeps the gateway small, stateless, and aligned with the existing cloud contract.

## Environment

Copy `.env.example` to `.env` and provide:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MQTT_BROKER_URL`
- optional `MQTT_USERNAME`
- optional `MQTT_PASSWORD`
- optional `MQTT_TOPIC_PREFIX`
- optional `MQTT_QOS`
- optional `COMMAND_QUEUE_POLL_INTERVAL_MS`

## Run

```bash
npm install
npm run start
```

### Local development

- copy `.env.development.example` to `.env`
- keep `MQTT_BROKER_URL=mqtt://127.0.0.1:1883`
- run against the local broker and the development Supabase project

### Hosted beta deployment

- copy `.env.beta.example` to your hosted service environment
- use a TLS-enabled managed broker hostname
- point `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` at the current hosted `AddOne` Supabase project for now
- deploy this folder as a small long-running Node service
- the simplest default is a small hosted service such as Railway or Render
- move to a distinct beta Supabase project later when account capacity allows

Docker image:

```bash
docker build -t addone-realtime-gateway .
docker run --env-file .env.beta -p 8787:8787 addone-realtime-gateway
```

## Notes

- Use TLS-enabled broker URLs in any real deployment.
- For production, prefer broker ACLs / per-device credentials over broad shared broker passwords.
- This service does not replace the cloud contract already in the repo; it accelerates it and forwards device-originated runtime messages back into that same contract.
- It keeps a lightweight queued-command polling fallback active even if the Supabase realtime websocket is degraded.
