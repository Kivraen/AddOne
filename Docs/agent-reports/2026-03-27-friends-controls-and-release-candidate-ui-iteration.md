Stage
S4: Beta Hardening And Durable Release Memory

Status
Implemented on `codex/s4-friends-controls-ui-iteration`, based on `codex/s4-rc-easy-ui-cleanup`.

The user-guided UI iteration is complete and ready for coordinator review. The final branch state is primarily UI work, with one small confirmation-path stabilization in [hooks/use-devices.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-devices.ts) that landed on the same branch because it directly supports the surfaced Home interaction.

Changes made
- Reworked the Friends top-right controls into a custom AddOne-style Actions popover with clearer grouping, cleaner hierarchy, and stronger pending-requests signaling in [friends-tab-content.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/friends-tab-content.tsx).
- Removed the old share/connect modal handoff glitch. `Share your code` and `Connect by code` now stay in one stable sheet flow, with better dismissal behavior and less transient error noise across [friends-tab-content.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/friends-tab-content.tsx) and [use-friends.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-friends.ts).
- Improved code-entry UX: join and share codes now auto-format with separators so the user does not need to type them manually, and the separator appears as soon as a group boundary is reached in [friends-tab-content.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/friends-tab-content.tsx).
- Updated Friends action visuals: removed the old ellipsis-dot trigger so it is text-only `Actions`, and changed `Connect by code` to a connection-oriented icon in [friends-tab-content.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/friends-tab-content.tsx).
- Limited `Manage boards` settings navigation to the gear icon only; tapping the full row no longer opens settings in [friends-arrange-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/friends-arrange-screen.tsx).
- Adjusted Home KPIs and header copy: `Weeks` now shows successful weeks out of total habit weeks, and the minimum-goal line now shows only user-entered text with no extra hardcoded wording across [home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx) and [habit-details.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/habit-details.ts).
- Made the firmware card collapsed by default so board settings show only the compact summary until expanded in [device-firmware-update-card.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/settings/device-firmware-update-card.tsx).
- Reworked the Home primary action button so it stays fixed above the bottom tabs instead of moving with pull-to-refresh, and reserved layout space for that overlay in [home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx) and [screen-frame.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/layout/screen-frame.tsx).
- Replaced the native Home `RefreshControl` with a board-local refresh treatment so pull-to-refresh no longer drops the whole page from the top edge; refresh feedback now appears over the board itself in [home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx).
- Fixed the Friends proof-state reload glitch so Expo reload does not reopen the proof menu or leave the tab black unless proof mode is explicitly requested in [friends-tab-content.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/friends-tab-content.tsx).
- Added one small runtime confirmation-path stabilization in [hooks/use-devices.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-devices.ts) so pending today-state UI recovers more cleanly when a command is already applied but the snapshot catches up slightly later.

Exact files changed:
- [components/app/friends-arrange-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/friends-arrange-screen.tsx)
- [components/app/friends-tab-content.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/friends-tab-content.tsx)
- [components/app/home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx)
- [components/layout/screen-frame.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/layout/screen-frame.tsx)
- [components/settings/device-firmware-update-card.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/settings/device-firmware-update-card.tsx)
- [hooks/use-friends.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-friends.ts)
- [hooks/use-devices.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-devices.ts)
- [lib/habit-details.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/lib/habit-details.ts)

Commands run
- `git branch --show-current`
- `git diff --name-only`
- `git status --short`
- `npm run typecheck`
- `xcrun simctl openurl booted 'exp://127.0.0.1:8081'`
- `xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/friends?proofState=pending&proofSheet=controls'`
- `xcrun simctl io booted screenshot /private/tmp/addone-final-home-ui.png`
- `xcrun simctl io booted screenshot /private/tmp/addone-final-friends-controls-ui.png`

Evidence
- `npm run typecheck` passes on the final branch state.
- Final Home UI proof: ![Final Home UI](/private/tmp/addone-final-home-ui.png)
- Final Friends controls proof: ![Final Friends Controls UI](/private/tmp/addone-final-friends-controls-ui.png)
- The final branch state uses a custom Friends actions popover instead of the prior action-sheet path and keeps the flow inside the app visual system.
- The surfaced runtime follow-up is limited to [hooks/use-devices.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-devices.ts) and is directly tied to keeping command-confirmation UI state consistent when the cloud snapshot arrives after an already-applied command.

Open risks / blockers
- The slice is mostly UI-focused, but the final branch state also includes the follow-up confirmation-path stabilization in [hooks/use-devices.ts](/Users/viktor/Desktop/DevProjects/Codex/AddOne/hooks/use-devices.ts). If strict UI-only separation is ever required later, that file is the only candidate to peel off.
- Home overlay placement and the custom pull-refresh treatment were validated in the active iOS Simulator flow, not across a wider device matrix.
- Weekly minimum-goal history semantics remain deferred because they are behavior work, not UI cleanup.
- Offline-sync and reconnect reliability remain deferred because they are release-reliability work, not UI cleanup.

Recommendation
Accept this as the release-candidate UI iteration slice on `codex/s4-friends-controls-ui-iteration`. The user-guided Friends controls redesign and adjacent UI cleanup are complete enough to keep, and the one small `hooks/use-devices.ts` stabilization is narrow enough to carry with the slice rather than forcing a mechanical split.
