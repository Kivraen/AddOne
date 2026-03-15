# AddOne Beta Environment

Last locked: March 14, 2026

This document defines the first always-on hosted environment for AddOne.

Goal:
- remove laptop dependency from normal device/app testing
- keep development and beta separated
- preserve the current device-authoritative runtime model

## Environment Split

### Development
Use development for day-to-day building and hardware debugging.

Components:
- local Expo dev server
- local MQTT broker
- local realtime gateway
- development Supabase project
- development firmware config

### Beta
Use beta for pre-launch validation on real phones and real hardware without the laptop in the loop.

Components:
- hosted beta Supabase project
- hosted MQTT broker
- hosted realtime gateway
- installable beta app build
- beta firmware config

Current decision:
- until a separate beta project exists, the existing hosted Supabase project `AddOne` (`sqhzaayqacmgxseiqihs`) is the beta backend
- the separate beta Supabase split is deferred because the current Supabase account hit the free-project limit
- local development should still prefer local app/gateway/broker, but the hosted AddOne Supabase project is now the beta source of truth

## Hosted Beta Shape

Recommended beta shape:
- managed MQTT broker
- one small hosted gateway service
- dedicated beta Supabase project
- EAS internal distribution app build

Recommended hostname targets:
- MQTT: provider hostname by default, custom domain optional later
- Gateway: `gateway-beta.addone.studio` if we want a branded endpoint
- App environment: dedicated beta Supabase URL and anon key

## Repo Configuration

### App
- use `.env.development.example` for local development values
- use `.env.beta.example` as the beta template
- local beta preview can use ignored `.env.beta`
- `APP_VARIANT=development` keeps the normal dev app identity
- `APP_VARIANT=beta` builds `AddOne Beta`
- `eas.json` owns the `development` and `beta` build profiles

### Gateway
- use `services/realtime-gateway/.env.development.example` for local runs
- use `services/realtime-gateway/.env.beta.example` for hosted beta
- deploy `services/realtime-gateway` as a long-running Node service
- the included Dockerfile is the default portable deployment shape
- the simplest default is a small hosted service such as Railway or Render
- the VPS single-host deployment in [deploy/beta-vps](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps) is the fallback path if we later want to self-host more of the stack

### Firmware
- local development profile:
  - PlatformIO env: `addone-esp32dev`
  - ignored config header: `firmware/include/cloud_config.local.h`
- beta profile:
  - PlatformIO env: `addone-esp32dev-beta`
  - ignored config header: `firmware/include/cloud_config.beta.h`
  - current practical beta TLS mode: encrypted MQTT with `kMqttAllowInsecureTls = true`
  - broker hostname can be the managed provider hostname; custom MQTT domain is optional for beta

## Required Beta Secrets / Values

### Beta app
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Current beta backend values live locally in:
- ignored `/.env.beta`

### Beta gateway
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MQTT_BROKER_URL`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `MQTT_TOPIC_PREFIX`

### Beta firmware
- Supabase project URL
- Supabase anon/publishable key
- MQTT broker host
- MQTT broker port
- MQTT credentials
- TLS settings for the hosted broker

## Beta Bring-Up Sequence
1. Treat the current hosted Supabase project `AddOne` as beta.
2. Ensure `device_runtime_snapshots` is added to `supabase_realtime`.
3. Provision the beta MQTT broker.
4. Deploy the realtime gateway with beta env vars.
5. Point `gateway-beta.addone.studio` to the hosted gateway if we want a branded endpoint.
6. Leave the broker on its managed hostname unless we explicitly want to add custom-domain complexity.
7. Create a beta app build with EAS internal distribution.
8. Flash the beta firmware profile to the device.
9. Validate onboarding, today toggle, edit/save, settings, and Wi-Fi recovery without the laptop.

## Beta Validation Checklist
- app installs without Expo Go
- sign-in works against beta
- device connects to hosted broker
- gateway mirrors runtime snapshots into beta Supabase
- app receives live snapshot updates
- device and app recover cleanly after Wi-Fi loss/rejoin
- no normal device control path depends on the laptop being powered on
