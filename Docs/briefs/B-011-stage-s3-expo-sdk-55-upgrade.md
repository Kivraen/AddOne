# B-011 Stage S3 Expo SDK 55 Upgrade

You are working in:
`/Users/viktor/Desktop/DevProjects/Codex/AddOne`

Required skill:
- `.agents/skills/building-native-ui/SKILL.md`

Read first:
- `Docs/AddOne_Main_Plan.md`
- `Docs/project-memory.md`
- `Docs/git-operations.md`
- `Docs/agent-coordination.md`
- `Docs/stages/stage-register.md`
- `Docs/stages/stage-03-trusted-beta-surface-alignment.md`
- `Docs/tasks/T-016-expo-sdk-55-upgrade-and-validation.md`
- `package.json`
- `eas.json`
- `app.config.js`

Stage:
`S3: Beta UI Completion And Social Shape`

Goal:
Upgrade AddOne from Expo SDK 54 to SDK 55 without mixing in unrelated product work, and prove that the real beta install path still works.

Success metrics:
- Expo SDK 55 and required package versions are aligned
- `expo-doctor` and `typecheck` pass
- iOS `beta` internal build succeeds from the upgraded commit
- core beta flows smoke-test cleanly enough to keep `S3` moving

Required proof:
- exact package and config changes
- `npx expo-doctor`
- `npm run typecheck`
- EAS iOS beta build URL from the upgraded commit
- manual smoke notes for auth shell, onboarding entry, home, settings, recovery, and profile/Friends gate

Non-negotiables:
- do not mix in Friends implementation, profile redesign, or timezone redesign
- keep the task focused on migration and regression handling
- if SDK 55 introduces a large blocker, document it explicitly instead of half-migrating
