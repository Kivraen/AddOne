Stage
S4: Beta Hardening And Durable Release Memory

Status
Revised and narrowed on `codex/s4-rc-easy-ui-cleanup`. The branch now matches the intended `T-046` easy UI cleanup scope.

Changes made
- Removed the temporary celebration-preview controls from the active device settings overview in:
  - `app/(app)/devices/[deviceId]/settings/index.tsx`
- Removed the route-level celebration preview state, action wiring, and temporary explanatory copy from the `Tools` section.
- Kept the settings surface otherwise intact:
  - `Firmware`, `Configuration`, `Recovery`, `History`, and `Danger zone` remain as they were.
- Parked unrelated work off this branch during the retry:
  - Friends controls changes
  - home metrics changes
  - firmware card redesign
  - `@expo/ui` native-menu experiment
- Exact files changed in the final branch state:
  - `app/(app)/devices/[deviceId]/settings/index.tsx`
  - `Docs/agent-reports/2026-03-27-release-candidate-easy-ui-cleanup.md`

Commands run
- `sed -n '1,220p' .agents/skills/building-native-ui/SKILL.md`
- `sed -n '1,220p' /Users/viktor/.codex/skills/react-native-design/SKILL.md`
- `git status --short`
- `git diff -- app/'(app)'/devices/'[deviceId]'/settings/index.tsx`
- `sed -n '1,260p' app/'(app)'/devices/'[deviceId]'/settings/index.tsx`
- `sed -n '1,220p' app/'(app)'/settings.tsx`
- `sed -n '1,220p' lib/device-routes.ts`
- `sed -n '1,240p' components/devices/device-route-context.tsx`
- `sed -n '1,260p' store/addone-store.ts`
- `sed -n '1,260p' lib/mock-data.ts`
- `rg -n "devices/.*/settings|settings/index|router\\.push\\(.+settings|href:.*settings|href=.*settings" app components lib`
- `npm run typecheck`
- `lsof -nP -iTCP:8081`
- `ifconfig en0`
- `xcrun simctl list devices | rg "Booted"`
- `xcrun simctl launch booted host.exp.Exponent`
- `xcrun simctl openurl booted 'exp://192.168.1.53:8081/--/devices/studio-01/settings'`
- `xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/devices/studio-01/settings'`
- `xcrun simctl io booted screenshot /tmp/addone-settings-proof.png`
- `git restore components/app/friends-arrange-screen.tsx components/app/friends-tab-content.tsx components/app/home-screen.tsx components/settings/device-firmware-update-card.tsx lib/board.ts package.json package-lock.json`
- `rm -rf .npm-cache`
- `rm components/app/friends-controls-menu-button.tsx components/app/friends-controls-menu-button.ios.tsx`

Evidence
- `npm run typecheck` passed after the branch was narrowed back to the intended cleanup slice.
- Metro was confirmed running for the app on port `8081`.
- LAN IP on the current network was confirmed as `192.168.1.53`.
- Manual native proof exists for the affected settings surface in the iOS Simulator:
  - screenshot path: `/tmp/addone-settings-proof.png`
- The proof screenshot shows:
  - the `Gymium` device settings overview
  - no temporary celebration preview list in `Tools`
  - `Tools` containing only `Recovery` and `History`

Open risks / blockers
- Weekly minimum-goal and history semantics remain deferred because they are behavior changes, not cheap UI cleanup.
- Offline-sync, reconnect reliability, and broader device-resilience issues remain deferred because they are not part of `T-046`.
- Broader Friends controls redesign and the `@expo/ui` native-menu experiment were removed from this branch and should be reconsidered only in a separate scoped task.
- During the retry, Expo Go accepted the project session in Simulator, but the direct LAN settings deep link stalled on Expo Go's loading screen. Existing Simulator proof for the same cleaned-up settings surface was retained instead of widening this task into Expo linking/tooling work.

Recommendation
Accept this branch as the narrow `T-046` cleanup retry. The known temporary settings leftover is removed, the final diff is back to the intended local surface, and deeper UI or behavior work should be planned on separate follow-up branches.
