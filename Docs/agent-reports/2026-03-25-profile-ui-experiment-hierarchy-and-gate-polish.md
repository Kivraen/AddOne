Stage
S3: Beta UI Completion And Social Shape

Status
Implemented and accepted on `codex/s3-profile-ui-experiment`. The final accepted branch state includes the original `aefb2ce` experiment plus one small follow-up polish tweak to the Profile action row before coordinator acceptance.

Changes made
- Reworked Profile into the same page rhythm as Home and Friends: one page title, one identity card, one form card, one primary action row.
- Put social identity first: avatar, display name, username, and email.
- Simplified the `from=friends` path to one obvious CTA: `Save and open Friends`.
- Removed repeated helper and status copy and reduced the separate admin-style account treatment.
- Rebalanced the avatar-left and data-right row and moved `@` outside the username field for cleaner alignment.
- Matched Profile field surfaces more closely to the existing Settings treatment.
- Increased large rectangular CTA text across the same button family used in Profile, Friends, Home, setup, sign-in, and reset-history.
- Final follow-up polish before coordinator acceptance:
  - make `Save` disabled until there are real unsaved changes
  - style `Sign out` as a secondary destructive button inside the same action row

Commands run
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run typecheck`
- `xcrun simctl io booted screenshot /tmp/addone-profile-final-normal.png`
- `xcrun simctl openurl booted 'exp://192.168.10.167:8114/--/profile?from=friends&proofState=profile-gate'`
- `xcrun simctl io booted screenshot /tmp/addone-profile-final-gate.png`

Evidence
- `npm run typecheck` passed on the final accepted branch state.
- Normal profile proof screenshot: `/tmp/addone-profile-final-normal.png`
- `from=friends` gate proof screenshot: `/tmp/addone-profile-final-gate.png`
- The temporary local proof-route hook used for the gate screenshot was removed before the final branch state and is not present in the accepted code.

Open risks / blockers
- No blocking issues remain for this experiment slice.
- The CTA typography alignment change spans six screens, so this branch is slightly broader than a pure single-file Profile experiment.

Recommendation
Treat `T-033` as accepted on `codex/s3-profile-ui-experiment`. The next coordinator decision should be whether to keep and merge this experiment or discard it before choosing the next `S3` polish slice.
