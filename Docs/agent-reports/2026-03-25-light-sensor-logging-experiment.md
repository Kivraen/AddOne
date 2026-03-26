Stage
S2: Trusted Real-Device Validation

Status
Implemented on `codex/s2-light-sensor-logging` as a bounded instrumentation-only experiment.

What it does
- Logs ambient brightness behavior to on-device `LittleFS` as CSV.
- Persists the enabled flag in `Preferences`, so logging resumes after power cycles.
- Samples every `10s`.
- Rotates by local date into one file per day.
- Stops itself before exhausting flash space.

CSV format
Header:

```csv
timestamp_local,timestamp_epoch,uptime_ms,firmware_state,ambient_auto,manual_brightness_setting,raw_sensor,smoothed_sensor,normalized_sensor,target_brightness,actual_brightness
```

File location
- On-device `LittleFS`
- Daily file pattern:
  - `/ambient-brightness-YYYY-MM-DD.csv`
- If valid local time is not available yet:
  - `/ambient-brightness-no-time.csv`

Control path
- Current control path is serial JSON commands through the existing firmware QA command parser.
- Logging itself runs normally outside QA mode once enabled.
- Network control/export was intentionally not added in this slice.

Commands
Start logging:

```json
{"id":"light-log","cmd":"light_log_start","clear_existing":true}
```

Status:

```json
{"id":"light-log","cmd":"light_log_status"}
```

Stop logging:

```json
{"id":"light-log","cmd":"light_log_stop"}
```

Dump today's CSV:

```json
{"id":"light-log","cmd":"light_log_dump"}
```

Dump a specific day:

```json
{"id":"light-log","cmd":"light_log_dump","date":"2026-03-25"}
```

Clear all ambient log files:

```json
{"id":"light-log","cmd":"light_log_clear"}
```

Storage and performance notes
- Sample interval: `10,000ms`
- A 24-hour run produces `8,640` rows.
- Max per-day file size: `1MB`
- Free-space reserve: `128KB`
- On first use, if `LittleFS` is uninitialized or corrupted, the logger attempts a one-time format and then remounts.
- If the daily file reaches its cap, logging disables itself.
- If LittleFS free space falls below the reserve threshold, logging disables itself.
- The logger appends one line per sample; overhead is low and suitable for multi-hour or multi-day capture.

Power-cycle behavior
- The enabled flag is stored in `Preferences` namespace `diag` with key `ambLogEn`.
- If the device powers off and comes back, logging resumes automatically.
- Rows are only written once valid time is available again.
- `uptime_ms` resets after reboot, but wall-clock columns continue once time is valid.

Current logic observations
- The current auto-brightness path is continuous, not threshold-based.
- The likely suspects remain:
  - ADC calibration range
  - compressed brightness output range
  - physical sensor placement
- Smoothing is present, but it is not the strongest first suspect based on the current implementation.

Next step after data collection
- Export one or more CSVs after real room-to-room / day-night runs.
- Analyze:
  - how wide raw and normalized values actually move
  - whether the target brightness range is too narrow
  - whether the actual applied brightness is effectively flat in real use
