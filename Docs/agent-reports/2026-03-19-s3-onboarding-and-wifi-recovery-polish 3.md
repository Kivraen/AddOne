Stage
S3: Beta UI Completion And Social Shape

Status
Implemented. The onboarding and Wi-Fi recovery surfaces are calmer and clearer now, with tighter step framing, clearer primary actions, and less raw status/error text. Manual proof is partial: the touched onboarding and recovery entry states are verified in the simulator, but the full hardware-backed onboarding progression still needs a live AP walkthrough before this should be auto-accepted as fully verified.

Changes made
Added calmer guidance blocks and clearer step subtitles to onboarding in app/(app)/onboarding/index.tsx.
Changed onboarding step 1 so it previews the full setup path instead of dropping straight into dense state copy.
Changed onboarding step 2 so the AP confirmation and Wi-Fi handoff read as one guided sequence with a clearer primary action.
Changed onboarding step 3 so the waiting state explains what the user should expect and when to refresh.
Changed onboarding step 4 so the final setup choices feel optional and bounded rather than like another dense configuration screen.
Replaced raw onboarding status/error text with clearer status and trouble panels.
Applied the same calm-step rule to recovery in app/(app)/devices/[deviceId]/recovery.tsx: clearer immediate action, clearer expectation, and clearer fallback language when reconnect takes time.
Made recovery labels more explicit, including the reconnect action and AddOne Wi-Fi confirmation copy.
Updated Docs/ui-beta-issue-log.md with the durable rule that onboarding and recovery should keep one obvious next action per step with helper copy explaining what happens next.

Commands run
sed -n '1,260p' Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md
sed -n '1,260p' Docs/briefs/B-013-stage-s3-onboarding-and-recovery-polish.md
sed -n '1,620p' app/(app)/onboarding/index.tsx
sed -n '1,980p' app/(app)/devices/[deviceId]/recovery.tsx
sed -n '1,260p' hooks/use-onboarding.ts
sed -n '44,72p' Docs/ui-beta-issue-log.md
git diff -- 'app/(app)/onboarding/index.tsx' 'app/(app)/devices/[deviceId]/recovery.tsx' 'Docs/ui-beta-issue-log.md'
npm run typecheck
npx expo start --clear --port 8116 --host lan
xcrun simctl openurl booted 'exp://127.0.0.1:8116/--/onboarding'
xcrun simctl io booted screenshot /tmp/addone-onboarding-proof.png
xcrun simctl openurl booted 'exp://127.0.0.1:8116/--/recovery'
xcrun simctl io booted screenshot /tmp/addone-recovery-proof.png

Evidence
npm run typecheck passed.
Simulator onboarding proof captured at /tmp/addone-onboarding-proof.png showing the calmer step-1 framing, setup preview, and single primary action.
Simulator recovery proof captured at /tmp/addone-recovery-proof.png showing the calmer recovery entry state and clearer recovery explanation.
The onboarding step hierarchy, guidance blocks, button labels, and status/error panels now live in app/(app)/onboarding/index.tsx.
The recovery step subtitles, guidance blocks, explicit reconnect labels, and clearer reconnect/error messaging now live in app/(app)/devices/[deviceId]/recovery.tsx.
The durable UX rule for both flows was updated in Docs/ui-beta-issue-log.md.

Open risks / blockers
Full manual onboarding verification is still partial. I verified the touched onboarding route and the touched recovery route in the simulator, but I did not complete a full live AP-backed setup walkthrough from step 1 through claimed device state in this pass.
The recovery route proof is for the touched recovery states and copy hierarchy, not a full physical reconnect proof with a board moving back onto Wi-Fi.
If coordinator acceptance requires stricter proof, the right next move is a narrow live walkthrough pass rather than more implementation churn.

Recommendation
Send this to the coordinator as the T-008 implementation report. The UI/copy/hierarchy polish is in place and typecheck is clean. Accept the implementation direction, but require one final live onboarding-and-recovery walkthrough before marking T-008 fully verified.
