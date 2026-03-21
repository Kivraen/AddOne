Stage
S3: Beta UI Completion And Social Shape

Status
Implemented. The no-owned-device Home state now reads as the start of the add-device flow with a centered primary control that matches the main Home button's dark shell and icon language, plus a restrained amber glow behind it. Manual simulator proof is captured. `npm run typecheck` is still blocked locally by the known duplicate `react 2` / `@types/react 2` install artifact.

Changes made
- Replaced the weak empty-state button in `components/app/home-screen.tsx` with a dedicated `EmptyHomePrimaryAction` that mirrors the main Home control's shell and dark-core/light-outline icon treatment, using a rounded-square form and a restrained breathing amber glow behind the action.
- Kept the supporting copy to the single required line: `Connect your AddOne`.
- Preserved the existing onboarding entry path by keeping the empty-state control wired to `router.push("/onboarding")`.
- Added a scoped durable note in `Docs/ui-beta-issue-log.md` locking the no-owned-device Home state as the onboarding entry surface for this beta pass.
- Exact files changed in this pass:
  - `components/app/home-screen.tsx`
  - `Docs/ui-beta-issue-log.md`
  - `Docs/agent-reports/2026-03-21-s3-add-device-entry-flow-first-screen.md`
  - `Docs/agent-reports/assets/2026-03-21-s3-add-device-entry-home-empty-state.png`
  - `Docs/agent-reports/assets/2026-03-21-s3-add-device-entry-onboarding-route-check.png`

Commands run
```text
git status --short --branch
sed -n '1,220p' .agents/skills/building-native-ui/SKILL.md
sed -n '1,220p' Docs/AddOne_Main_Plan.md
sed -n '1,220p' Docs/project-memory.md
sed -n '1,220p' Docs/git-operations.md
sed -n '1,220p' Docs/agent-coordination.md
sed -n '1,220p' Docs/stages/stage-register.md
sed -n '1,260p' Docs/stages/stage-03-trusted-beta-surface-alignment.md
sed -n '1,220p' Docs/tasks/T-008-onboarding-and-wifi-recovery-polish.md
sed -n '1,220p' Docs/tasks/T-017-add-device-entry-flow-first-screen.md
sed -n '1,260p' Docs/agent-reports/2026-03-19-s3-onboarding-and-wifi-recovery-polish.md
sed -n '1,220p' Docs/ui-beta-issue-log.md
sed -n '1,260p' Docs/AddOne_V1_Canonical_Spec.md
sed -n '1,260p' components/app/home-screen.tsx
sed -n '1,260p' components/ui/primary-action-button.tsx
sed -n '1,260p' constants/theme.ts
sed -n '1,260p' hooks/use-devices.ts
sed -n '1,260p' providers/auth-provider.tsx
sed -n '1,220p' app/sign-in.tsx
sed -n '1,200p' app/\(app\)/_layout.tsx
npm run typecheck
ls -1 node_modules | rg '^react 2$|^@types$'
ls -1 node_modules/@types | rg '^react$|^react 2$'
ls -ld node_modules/'react 2' node_modules/@types/'react 2'
npx expo start --clear --port 8116 --host lan
xcrun simctl terminate booted host.exp.Exponent
xcrun simctl launch booted host.exp.Exponent
xcrun simctl openurl booted 'exp://192.168.1.183:8116'
xcrun simctl io booted screenshot /tmp/addone-home-empty-state-check-6.png
xcrun simctl openurl booted 'exp://192.168.1.183:8116/--/onboarding'
xcrun simctl io booted screenshot /tmp/addone-onboarding-route-check.png
npm run typecheck
```

Evidence
- Manual simulator proof of the updated Home empty state is captured below.

![Home empty state proof](assets/2026-03-21-s3-add-device-entry-home-empty-state.png)

- Existing onboarding route proof is captured below. This route is still the empty-state action target in `components/app/home-screen.tsx`.

![Onboarding route proof](assets/2026-03-21-s3-add-device-entry-onboarding-route-check.png)

- `npm run typecheck` failed before checking this screen because the local install still contains duplicate type/package folders:
  - `node_modules/react 2`
  - `node_modules/@types/react 2`
- The exact typecheck error was:

```text
error TS2688: Cannot find type definition file for 'react 2'.
  The file is in the program because:
    Entry point for implicit type library 'react 2'
```

Open risks / blockers
- `npm run typecheck` remains blocked by the local duplicate install artifact above, so this pass does not yet have clean typecheck proof.
- I did not remove unrelated pre-existing `* 2` repo noise outside this scoped Home/onboarding entry pass.
- The onboarding-route evidence is a direct route check in the simulator. I did not automate a physical tap event inside the simulator tooling, but the Home control remains directly wired to `router.push("/onboarding")`.

Recommendation
Treat this as the narrow `T-017` implementation checkpoint. The empty Home state now looks like a deliberate start to add-device onboarding and is visually coherent with the main Home control. Before using typecheck as an acceptance gate for this branch, clear the local duplicate `react 2` / `@types/react 2` install artifact and rerun `npm run typecheck`.
