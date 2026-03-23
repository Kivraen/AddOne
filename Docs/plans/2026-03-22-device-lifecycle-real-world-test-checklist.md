# Device Lifecycle Real-World Test Checklist

Date: March 22, 2026
Branch: `codex/s3-factory-reset-remove`
Backend: hosted beta Supabase `AddOne` (`sqhzaayqacmgxseiqihs`)
Expo dev server: `npx expo start --clear --port 8116 --host lan`

## Test Setup

- Use the app from this branch, connected to the hosted beta backend.
- Use one physical AddOne board that is already onboarded to the current account.
- Keep a second board available if you want to verify immediate replacement onboarding after removal.
- Keep the phone on the same LAN as the board for the online-reset path.
- For the offline/lost path, make the board unreachable before starting the removal flow.

## Expected Product Rules

- Brand-new beta hardware must already be factory preregistered in the backend before customer onboarding.
- First onboarding should save:
  - habit name: `Main habit`
  - daily minimum: `Do the smallest version that still counts.`
  - weekly target: `3`
- `Factory reset and remove` is one adaptive action:
  - online board: request remote reset, then remove after device confirmation or timeout
  - offline board: remove from account immediately, without claiming that the physical board was wiped

## Scenario 1: Fresh Add On Preregistered Hardware

1. Start a fresh onboarding session from the app.
2. Complete AP onboarding on a preregistered board.
3. Continue through the habit and board steps without changing any defaults.

Expected:

- onboarding completes without prereg-related backend errors
- saved habit metadata shows the default values above
- home subtitle uses the saved daily minimum

## Scenario 2: Online Factory Reset And Remove

1. Open the onboarded device settings.
2. Confirm the board is live.
3. Tap `Factory reset and remove`.
4. Confirm the destructive alert.

Expected:

- settings shows staged removal copy instead of immediate disappearance
- board remains in the account while removal is pending
- board disappears from the account after reset confirmation or timeout
- after removal, the old account is clear and can onboard another board immediately

## Scenario 3: Offline / Broken / Lost Remove

1. Make the board unreachable.
2. Open the same destructive action from settings.
3. Confirm the offline-specific alert.

Expected:

- app allows removal even while the board is offline
- warning copy says the physical board was not remotely wiped
- board disappears from the account immediately
- a replacement board can now be onboarded normally

## Scenario 4: Timeout Fallback On Online Remove

1. Start online `Factory reset and remove`.
2. Interrupt the board before it can complete the final reset-confirmation report.
3. Wait past the fallback window.

Expected:

- backend finalizes removal after about `30 seconds`
- board disappears from the account without requiring a successful final reset report
- removed board does not silently regain runtime auth by itself

## Scenario 5: Re-Add Old Hardware After Manual Reset

1. Take a board that was removed from the account.
2. Manually factory-reset it on-device.
3. Run the normal add flow again.

Expected:

- board behaves like first-time hardware
- no same-owner recovery path auto-restores the old board
- new claim path succeeds only after proper onboarding

## Scenario 6: Reject Unknown / Unregistered Hardware

1. Attempt onboarding with hardware that was not factory preregistered in the backend.

Expected:

- onboarding claim fails clearly
- backend does not silently create a new beta device row through customer claim

## Evidence To Capture

- screenshot of the online destructive alert
- screenshot of the offline destructive alert
- screenshot of staged removal state in settings or home
- confirmation that the device disappears from the account in both online and offline paths
- confirmation that replacement-board onboarding works after removal
- exact error text for unregistered hardware, if tested

## If A Test Fails

- record whether the failure happened in:
  - app UI
  - backend state transition
  - firmware reset behavior
  - onboarding claim / prereg path
- keep the failing hardware UID, approximate timestamp, and the visible app state together
- do not broaden the test session into ad hoc feature work; isolate the failure first
