# AddOne Device AP Provisioning Contract

Last locked: March 8, 2026

This document defines the local first-boot / recovery contract between:
- the AddOne mobile app while connected to the temporary device AP
- the device firmware HTTP server running on that AP

This document covers only the local AP handoff. For cloud claim and steady-state sync, see [AddOne_Device_Cloud_Contract.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/AddOne_Device_Cloud_Contract.md).

## Scope
- v1 provisioning transport is `temporary AP mode`, not LAN discovery.
- Wi-Fi is required for first-user v1 setup.
- The printed customer QR stays generic and points to `addone.studio/start`.
- The app creates a cloud onboarding session first, then hands local Wi-Fi credentials and the one-time claim token to the device over AP.
- The AP handoff should collect only what is needed to get the device online.
- Recovery reuses the same AP/session contract. For an already-owned device, reclaiming through the same owner is idempotent and acts as Wi-Fi reprovisioning, not ownership transfer.
- First-user v1 stores one active Wi-Fi profile only. Recovery overwrites the previous credentials instead of keeping multiple saved networks.
- Recovery AP can be entered:
  - by app command while the device is still online
  - or by holding the main button while reconnecting power

## Local Network Assumptions
- Device AP SSID pattern: `AddOne-XXXX`
- Default device AP base URL: `http://192.168.4.1`
- Local API namespace: `/api/v1/provisioning`
- Local API is reachable only while the phone is directly connected to the device AP.

Notes:
- The device AP should not expose this provisioning API on the customer LAN.
- Transport security details for the AP itself remain a firmware/manufacturing decision.
- Wi-Fi credentials stay local to the phone and the device. They are not stored in Supabase.

## Endpoint: `GET /api/v1/provisioning/info`

Purpose:
- confirm the phone is talking to an AddOne AP
- expose enough metadata for the app to render a trustworthy setup state

Example response:

```json
{
  "schema_version": 1,
  "device_ap_ssid": "AddOne-7F2A",
  "hardware_profile": "addone-v1",
  "firmware_version": "0.9.0-dev",
  "provisioning_state": "ready"
}
```

Rules:
- `provisioning_state` values are `ready | busy | provisioned`.
- `hardware_profile` and `firmware_version` are optional but strongly preferred.

## Endpoint: `GET /api/v1/provisioning/networks`

Purpose:
- scan nearby Wi-Fi networks from the device itself
- let the app present a pick-list instead of forcing manual SSID entry every time

Example response:

```json
{
  "schema_version": 1,
  "networks": [
    {
      "ssid": "Home WiFi",
      "rssi": -54,
      "secure": true
    },
    {
      "ssid": "Guest",
      "rssi": -71,
      "secure": false
    }
  ]
}
```

Rules:
- response includes only visible SSIDs
- duplicate SSIDs should be collapsed
- `rssi` may be `null` if the device cannot provide it
- `secure` indicates whether a password is required
- the app must still offer a hidden/manual SSID fallback

## Endpoint: `POST /api/v1/provisioning/session`

Purpose:
- persist Wi-Fi credentials locally
- persist the one-time cloud claim context
- transition the device out of AP mode and toward cloud claim redemption

Request payload:

```json
{
  "schema_version": 1,
  "claim_token": "opaque-one-time-token",
  "onboarding_session_id": "uuid",
  "wifi_ssid": "Home WiFi",
  "wifi_password": "secret",
  "hardware_profile_hint": "addone-v1"
}
```

Rules:
- `schema_version` is required and must be `1`.
- `claim_token` is required and one-time.
- `onboarding_session_id` is required for logging, support, and correlation.
- `wifi_ssid` is required.
- `wifi_password` may be empty for open networks.
- `hardware_profile_hint` is optional and is only a hint for logging/debugging.
- The device should save Wi-Fi and claim context atomically before leaving AP mode.

Success response:

```json
{
  "schema_version": 1,
  "accepted": true,
  "next_step": "connect_to_cloud",
  "reboot_required": true,
  "message": "Provisioning accepted."
}
```

Failure response:

```json
{
  "schema_version": 1,
  "accepted": false,
  "next_step": "retry",
  "reboot_required": false,
  "message": "Provisioning payload was invalid."
}
```

Suggested failure categories:
- malformed payload
- unsupported schema version
- busy / already provisioning
- storage write failure
- Wi-Fi credentials missing

## App Responsibilities
1. User signs in first.
2. App creates a cloud onboarding session and gets the raw `claim_token`.
3. User joins the AddOne AP.
4. App verifies `GET /info`.
5. App requests `GET /networks` and shows the SSID list with manual hidden-network fallback.
6. App sends `POST /session`.
7. Only after the local AP request is accepted should the app mark the cloud onboarding session as `awaiting_cloud`.
8. App then waits for the device to redeem the claim in cloud.

## Firmware Responsibilities
1. Start AP automatically on first boot with no saved Wi-Fi.
2. Start AP on power-up hold / Wi-Fi reset recovery.
3. Serve the local provisioning endpoints only while AP mode is active.
4. Validate and persist the AP payload.
5. Exit AP mode and connect to the configured Wi-Fi.
6. Redeem the claim in cloud using `redeem_device_onboarding_claim(...)`.
7. Start normal `heartbeat + command pull + day-event push` behavior after claim.

## Current Implementation Status
- The app now builds and validates the exact `POST /session` payload locally.
- The app now attempts the real `GET /info` and `POST /session` calls against the configured AddOne AP base URL.
- The app now requests a real device-side Wi-Fi scan list from `GET /api/v1/provisioning/networks`.
- The app stores Wi-Fi details only in local UI state during staging.
- The app UI now reflects the real AP handoff flow.
- Firmware v2 now includes the real AP endpoint layer for:
  - `GET /api/v1/provisioning/info`
  - `GET /api/v1/provisioning/networks`
  - `POST /api/v1/provisioning/session`
- Firmware v2 now persists pending claim context locally and starts STA connection from the submitted Wi-Fi payload.
- Firmware v2 now hands off from AP provisioning into cloud claim redemption and first heartbeat plumbing.
- Device command sync and day-event sync are the next firmware steps after this.
