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
- receive device-originated MQTT acknowledgements or events later if needed

## Current Scope

Implemented:
- broker connection
- Supabase service-role connection
- realtime subscription to queued `device_commands`
- publish command payloads to per-device command topics
- startup replay of currently queued commands

Still using existing RPC path:
- `ack_device_command(...)`
- `record_day_state_from_device(...)`
- `device_heartbeat(...)`

That keeps the delivery upgrade small and safe.

## Environment

Copy `.env.example` to `.env` and provide:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MQTT_BROKER_URL`
- optional `MQTT_USERNAME`
- optional `MQTT_PASSWORD`
- optional `MQTT_TOPIC_PREFIX`
- optional `MQTT_QOS`

## Run

```bash
npm install
npm run start
```

## Notes

- Use TLS-enabled broker URLs in any real deployment.
- For production, prefer broker ACLs / per-device credentials over broad shared broker passwords.
- This service does not replace the cloud contract already in the repo; it accelerates it.
