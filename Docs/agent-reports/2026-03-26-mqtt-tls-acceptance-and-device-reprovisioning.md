---
task_id: T-037
title: MQTT TLS acceptance and device reprovisioning
date: 2026-03-26
agent: Codex
result_state: Implemented
verification_state: Verified
changed_paths:
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/agent-reports/2026-03-26-mqtt-tls-acceptance-and-device-reprovisioning.md
  - deploy/beta-vps/.env.bootstrap.example
  - deploy/beta-vps/README.md
  - deploy/beta-vps/sync-passwords.sh
  - firmware/README.md
  - firmware/include/cloud_config.beta.example.h
  - firmware/include/cloud_config.h
  - firmware/src/realtime_client.cpp
  - firmware/src/realtime_client.h
---

Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented and live-verified on `codex/s4-release-operations-baseline`. The hosted MQTT TLS acceptance failure is resolved for both current beta boards: `AO_B0CBD8CFABB0` and `AO_A4F00F767008` now reconnect to `mqtt-beta.addone.studio:8883` over TLS, subscribe successfully on their issued per-device MQTT usernames, and the broker no longer logs `ssl/tls alert bad certificate` for either board. The second board required one additional hosted follow-up: `sync-passwords.sh` needed to force-recreate Mosquitto after regenerating `passwords.txt`, otherwise newly issued device credentials were not loaded into the running broker. After DNS was added, the hosted MQTT path was also cut over from the raw IP bootstrap target to the `mqtt-beta.addone.studio` hostname.

Changes made
- Repo files changed:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
  - [deploy/beta-vps/.env.bootstrap.example](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/.env.bootstrap.example)
  - [deploy/beta-vps/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/README.md)
  - [deploy/beta-vps/sync-passwords.sh](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/sync-passwords.sh)
  - [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
  - [firmware/include/cloud_config.beta.example.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.beta.example.h)
  - [firmware/include/cloud_config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.h)
  - [firmware/src/realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp)
  - [firmware/src/realtime_client.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.h)
- Firmware MQTT TLS now supports a separate verification name for bootstrap deployments that still dial a raw broker IP. When `kMqttBrokerHost` parses as an IP address, the realtime client pre-connects `WiFiClientSecure` with `ADDONE_MQTT_BROKER_TLS_SERVER_NAME` as the TLS hostname, then lets `PubSubClient` reuse that authenticated socket.
- The shared firmware config now exposes `CloudConfig::kMqttBrokerTlsServerName` through the optional `ADDONE_MQTT_BROKER_TLS_SERVER_NAME` macro without breaking existing ignored local headers that do not define it yet.
- Scoped docs now explain the actual hosted split after DNS creation: MQTT should prefer `mqtt-beta.addone.studio`, while gateway checks should remain on-host until `https://gateway-beta.addone.studio/health` is healthy.
- The broker password sync helper now forces a Mosquitto recreate after rewriting `passwords.txt`, which makes newly issued per-device credentials live without requiring a separate manual restart command.
- Local ignored beta config changed for live validation:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.beta.h`
  - added `#define ADDONE_MQTT_BROKER_TLS_SERVER_NAME "mqtt-beta.addone.studio"`
  - switched `kMqttBrokerHost` from `72.62.200.12` to `mqtt-beta.addone.studio`
- Operator-applied hosted file changed for parity with the repo fix:
  - `/opt/addone-beta-src/deploy/beta-vps/sync-passwords.sh`

Commands run
- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `git branch --show-current`
- `git status --short`
- `sed -n '1,260p' Docs/tasks/T-037-mqtt-tls-acceptance-and-device-reprovisioning.md`
- `sed -n '1,260p' Docs/agent-reports/2026-03-26-release-operations-cleanup-and-launch-baseline.md`
- `sed -n '1,280p' Docs/AddOne_Beta_Environment.md`
- `sed -n '1,280p' Docs/AddOne_Device_Realtime_Transport.md`
- `sed -n '1,260p' firmware/README.md`
- `openssl s_client -connect 72.62.200.12:8883 -servername 72.62.200.12 -showcerts </dev/null`
- `host mqtt-beta.addone.studio`
- `host gateway-beta.addone.studio`
- `curl -I --max-time 10 http://gateway-beta.addone.studio/health`
- `curl -I --max-time 10 https://gateway-beta.addone.studio/health`
- `openssl s_client -connect mqtt-beta.addone.studio:8883 -servername mqtt-beta.addone.studio </dev/null`
- `pio pkg list`
- `sed -n '220,320p' ~/.platformio/packages/framework-arduinoespressif32/libraries/WiFiClientSecure/src/ssl_client.cpp`
- `sed -n '580,620p' ~/.platformio/packages/framework-arduinoespressif32/tools/sdk/esp32/include/mbedtls/mbedtls/include/mbedtls/x509_crt.h`
- `ls /dev/cu.usbserial*`
- `pio device list`
- `pio run -e addone-esp32dev-beta`
- `pio run -e addone-esp32dev-beta -t nobuild -t upload --upload-port /dev/cu.usbserial-10`
- `pio run -e addone-esp32dev-beta -t nobuild -t upload --upload-port /dev/cu.usbserial-210`
- `pio device monitor -p /dev/cu.usbserial-10 -b 115200`
- `pio device monitor -p /dev/cu.usbserial-210 -b 115200`
- `ssh root@72.62.200.12 "docker logs --since 5m addone-beta-mosquitto-1 2>&1 | tail -n 200"`
- `ssh root@72.62.200.12 "cd /opt/addone-beta-src/deploy/beta-vps && ./sync-passwords.sh --compose-file ./docker-compose.bootstrap.yml"`
- `ssh root@72.62.200.12 "cd /opt/addone-beta-src/deploy/beta-vps && docker compose -f ./docker-compose.bootstrap.yml up -d --force-recreate --no-deps mosquitto"`
- `ssh root@72.62.200.12 "grep -n 'AO_A4F00F767008\\|device-fleet-beta' /opt/addone-beta-src/deploy/beta-vps/mosquitto/passwords.txt || true"`

Evidence
- Root cause proof:
  - `openssl s_client -connect 72.62.200.12:8883 -servername 72.62.200.12 -showcerts` showed the broker cert chain with a self-signed root `CN=AddOne Beta MQTT Root` and a leaf whose SAN includes both `72.62.200.12` and `mqtt-beta.addone.studio`.
  - the bundled ESP32 TLS stack source at `ssl_client.cpp` calls `mbedtls_ssl_set_hostname(...)`, and the bundled `mbedtls/x509_crt.h` explicitly states that peer-CN verification currently supports DNS names, which explains the device-side `bad certificate` alert when the firmware verifies against a raw IP literal.
- DNS cutover proof:
  - `host mqtt-beta.addone.studio` now returns `72.62.200.12`
  - `host gateway-beta.addone.studio` now returns `72.62.200.12`
  - `openssl s_client -connect mqtt-beta.addone.studio:8883 -servername mqtt-beta.addone.studio` completes against the same broker and certificate chain, proving the hostname route is usable for MQTT immediately
- Successful hardened-device reconnect proof:
  - serial from `/dev/cu.usbserial-10` after flashing showed:
    - after the first TLS-fix flash: `MQTT TLS socket ready via 72.62.200.12 with verification name mqtt-beta.addone.studio`
    - after the DNS-host flash, the board resumed normal runtime publication and the broker accepted it again as `AO_B0CBD8CFABB0`
  - serial from `/dev/cu.usbserial-210` after flashing showed:
    - `Cloud RPC issue_device_mqtt_credentials -> HTTP 200`
    - response payload with `mqtt_username":"AO_A4F00F767008"`
    - `Provisioned device MQTT credentials for AO_A4F00F767008`
    - initial `MQTT connect failed, state=5` until the broker password file was regenerated and Mosquitto was recreated
    - after the recreate: `MQTT connected, subscribed to addone/device/AO_A4F00F767008/command`
  - broker logs from `addone-beta-mosquitto-1` then showed both boards accepted cleanly with no `bad certificate` entries after the recreate:
    - `1774588015: New client connected from 107.131.130.90:58989 as addone-AO_A4F00F767008 (p4, c1, k15, u'AO_A4F00F767008').`
    - `1774588015: Client addone-AO_A4F00F767008 negotiated TLSv1.2 cipher ECDHE-RSA-AES256-GCM-SHA384`
    - `1774588016: New client connected from 107.131.130.90:55725 as addone-AO_B0CBD8CFABB0 (p4, c1, k15, u'AO_B0CBD8CFABB0').`
    - `1774588016: Client addone-AO_B0CBD8CFABB0 negotiated TLSv1.2 cipher ECDHE-RSA-AES256-GCM-SHA384`
  - after the DNS-host firmware update, broker logs again showed both boards reconnecting cleanly:
    - `1774588782: New client connected from 107.131.130.90:61566 as addone-AO_B0CBD8CFABB0 (p4, c1, k15, u'AO_B0CBD8CFABB0').`
    - `1774588783: New client connected from 107.131.130.90:56084 as addone-AO_A4F00F767008 (p4, c1, k15, u'AO_A4F00F767008').`
- proof that both boards are off the legacy fleet path:
  - `/dev/cu.usbserial-210` upload identified MAC `a4:f0:0f:76:70:08`, confirming the second attached board was `AO_A4F00F767008`
  - the live broker password file now contains hashed entries for both `AO_A4F00F767008` and `AO_B0CBD8CFABB0`
  - `grep -n 'AO_A4F00F767008\\|AO_B0CBD8CFABB0\\|device-fleet-beta' .../passwords.txt` returns both device rows and no `device-fleet-beta` match
  - the reprovisioning helper bug proof:
    - before the helper fix, `AO_A4F00F767008` obtained its issued credential but still failed MQTT auth with `state=5`
    - the original live VPS helper still contained `docker compose -f "$COMPOSE_FILE" up -d mosquitto`
    - after forcing `docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-deps mosquitto`, the same board connected immediately on its issued username

Open risks / blockers
- The broker certificate still carries `CN=72.62.200.12` with SAN coverage for `mqtt-beta.addone.studio`. That is sufficient for the current pinned-CA MQTT path, but if the cert is rotated again it must continue to include the DNS hostname the firmware uses.
- `gateway-beta.addone.studio` now resolves, but `https://gateway-beta.addone.studio/health` still fails with a TLS internal error, so the public gateway hostname should not be treated as healthy yet.
- Mosquitto still logs permission warnings for `passwords.txt` and `acl.txt` ownership and mode on container start. Those warnings do not block the current reconnect proof, but the host files should be `chown`ed to `mosquitto` and tightened to `0700` before broader rollout.

Recommendation
Treat `T-037` as implementation-complete on this branch. The hosted MQTT TLS blocker is fixed, both current beta boards are now on per-device MQTT credentials, the broker helper is updated so future credential issuance reloads Mosquitto instead of leaving new rows inactive, and the hosted MQTT path now prefers `mqtt-beta.addone.studio` instead of the raw IP bootstrap target. The remaining operator prerequisites are narrower and non-blocking for `T-036` acceptance: keep the broker cert SAN aligned with the MQTT hostname, repair the public gateway HTTPS path before using `gateway-beta.addone.studio` as a health target, and tighten the on-host Mosquitto file ownership and mode warnings before broader rollout.
