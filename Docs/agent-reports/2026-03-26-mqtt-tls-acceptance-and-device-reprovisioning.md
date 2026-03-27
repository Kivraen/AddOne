---
task_id: T-037
title: MQTT TLS acceptance and device reprovisioning
date: 2026-03-26
agent: Codex
result_state: Blocked
verification_state: Partially Verified
changed_paths:
  - Docs/AddOne_Beta_Environment.md
  - Docs/AddOne_Device_Realtime_Transport.md
  - Docs/agent-reports/2026-03-26-mqtt-tls-acceptance-and-device-reprovisioning.md
  - deploy/beta-vps/README.md
  - firmware/README.md
  - firmware/include/cloud_config.beta.example.h
  - firmware/include/cloud_config.h
  - firmware/src/realtime_client.cpp
  - firmware/src/realtime_client.h
---

Stage
S4: Beta Hardening And Durable Release Memory

Status
Blocked after a live fix on `codex/s4-release-operations-baseline`. The hosted MQTT TLS acceptance failure is resolved for the connected hardened board `AO_B0CBD8CFABB0`: it now reconnects to `72.62.200.12:8883` over TLS, subscribes successfully on its issued per-device MQTT username, and the broker no longer logs `ssl/tls alert bad certificate` for that board. `AO_A4F00F767008` is still on older fleet-credential firmware in the field and was not physically attached in this workspace, so the second-device reprovisioning requirement could not be completed here.

Changes made
- Repo files changed:
  - [Docs/AddOne_Beta_Environment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Beta_Environment.md)
  - [Docs/AddOne_Device_Realtime_Transport.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Realtime_Transport.md)
  - [deploy/beta-vps/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/deploy/beta-vps/README.md)
  - [firmware/README.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/README.md)
  - [firmware/include/cloud_config.beta.example.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.beta.example.h)
  - [firmware/include/cloud_config.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.h)
  - [firmware/src/realtime_client.cpp](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.cpp)
  - [firmware/src/realtime_client.h](/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/src/realtime_client.h)
- Firmware MQTT TLS now supports a separate verification name for bootstrap deployments that still dial a raw broker IP. When `kMqttBrokerHost` parses as an IP address, the realtime client pre-connects `WiFiClientSecure` with `ADDONE_MQTT_BROKER_TLS_SERVER_NAME` as the TLS hostname, then lets `PubSubClient` reuse that authenticated socket.
- The shared firmware config now exposes `CloudConfig::kMqttBrokerTlsServerName` through the optional `ADDONE_MQTT_BROKER_TLS_SERVER_NAME` macro without breaking existing ignored local headers that do not define it yet.
- Scoped docs now explain the actual hosted bootstrap requirement: keep the transport target on `72.62.200.12:8883`, pin the broker CA PEM, and set `ADDONE_MQTT_BROKER_TLS_SERVER_NAME` to `mqtt-beta.addone.studio` until public broker DNS is live.
- Local ignored beta config changed for live validation:
  - `/Users/viktor/Desktop/DevProjects/Codex/AddOne/firmware/include/cloud_config.beta.h`
  - added `#define ADDONE_MQTT_BROKER_TLS_SERVER_NAME "mqtt-beta.addone.studio"`

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
- `pio pkg list`
- `sed -n '220,320p' ~/.platformio/packages/framework-arduinoespressif32/libraries/WiFiClientSecure/src/ssl_client.cpp`
- `sed -n '580,620p' ~/.platformio/packages/framework-arduinoespressif32/tools/sdk/esp32/include/mbedtls/mbedtls/include/mbedtls/x509_crt.h`
- `ls /dev/cu.usbserial*`
- `pio device list`
- `pio run -e addone-esp32dev-beta`
- `pio run -e addone-esp32dev-beta -t nobuild -t upload --upload-port /dev/cu.usbserial-10`
- `pio device monitor -p /dev/cu.usbserial-10 -b 115200`
- `ssh root@72.62.200.12 "docker logs --since 5m addone-beta-mosquitto-1 2>&1 | tail -n 200"`
- `ssh root@72.62.200.12 "grep -n 'AO_A4F00F767008\\|device-fleet-beta' /opt/addone-beta-src/deploy/beta-vps/mosquitto/passwords.txt || true"`

Evidence
- Root cause proof:
  - `openssl s_client -connect 72.62.200.12:8883 -servername 72.62.200.12 -showcerts` showed the broker cert chain with a self-signed root `CN=AddOne Beta MQTT Root` and a leaf whose SAN includes both `72.62.200.12` and `mqtt-beta.addone.studio`.
  - the bundled ESP32 TLS stack source at `ssl_client.cpp` calls `mbedtls_ssl_set_hostname(...)`, and the bundled `mbedtls/x509_crt.h` explicitly states that peer-CN verification currently supports DNS names, which explains the device-side `bad certificate` alert when the firmware verifies against a raw IP literal.
- Successful hardened-device reconnect proof:
  - serial from `/dev/cu.usbserial-10` after flashing showed:
    - `Wi-Fi connected.`
    - `MQTT TLS socket ready via 72.62.200.12 with verification name mqtt-beta.addone.studio`
    - `MQTT connected, subscribed to addone/device/AO_B0CBD8CFABB0/command`
    - `Uploaded runtime snapshot revision 92`
  - broker logs from `addone-beta-mosquitto-1` then showed the same device accepted cleanly:
    - `1774586325: New connection from 107.131.130.90:55724 on port 8883.`
    - `1774586326: New client connected from 107.131.130.90:55724 as addone-AO_B0CBD8CFABB0 (p4, c1, k15, u'AO_B0CBD8CFABB0').`
    - `1774586326: Client addone-AO_B0CBD8CFABB0 negotiated TLSv1.2 cipher ECDHE-RSA-AES256-GCM-SHA384`
  - the prior `ssl/tls alert bad certificate` pattern is still present in the same log window for another client from the same public IP, but it stops for `AO_B0CBD8CFABB0` once the verification-name fix is flashed and the accepted broker line appears.
- Second-device blocker proof:
  - only one USB beta board was physically attached in this workspace: `/dev/cu.usbserial-10`, which enumerates as the already-known `AO_B0CBD8CFABB0` board.
  - the live broker password file on the VPS still contains neither `device-fleet-beta` nor `AO_A4F00F767008`, so the broker is no longer accepting the legacy fleet credential but also does not yet have an issued per-device password row for `AO_A4F00F767008`.
  - the broker log continues to show the field device attempting the old path and being denied:
    - `Client addone-AO_A4F00F767008 ... disconnected: not authorised.`
  - because `AO_A4F00F767008` was not physically connected and no remote credential-clear or OTA path exists yet, I could not reflash or reprovision it onto the per-device model from this workspace.

Open risks / blockers
- `AO_A4F00F767008` still needs operator access for a real reprovision step. With the current codebase, that means physical reflashing or a manual reset/re-onboard flow on the actual board; there is no shipped remote-only path to rotate old MQTT transport credentials into the new per-device model.
- Until broker DNS is actually live, the hosted beta firmware must keep the raw IP transport target and the `ADDONE_MQTT_BROKER_TLS_SERVER_NAME` override aligned with a DNS SAN carried by the broker certificate. Removing that SAN from the cert before DNS cutover would reintroduce TLS handshake failure on ESP32.
- `mqtt-beta.addone.studio` and `gateway-beta.addone.studio` still return `NXDOMAIN`, so the current fix depends on the IP-bootstrap deployment shape remaining intact.

Recommendation
Keep this branch as the real `T-037` candidate baseline for the TLS fix. The hardened-device MQTT TLS blocker on `AO_B0CBD8CFABB0` is resolved and should unblock the transport half of `T-036` acceptance. Do one focused operator follow-up before calling `T-037` complete: physically attach or otherwise locally service `AO_A4F00F767008`, flash or reprovision it onto the same beta profile, confirm it provisions a unique MQTT credential row, rerun `deploy/beta-vps/sync-passwords.sh` if a new row is issued, and capture the matching accepted broker log line for `u'AO_A4F00F767008'`.
