# External Designer Collaboration Plan

Date: April 5, 2026
Stage context: `S4: Beta Hardening And Durable Release Memory`
Status: `planned`

## Purpose

This document records the intended operating model for bringing an external designer into AddOne safely.

It exists so the repo does not treat “let the designer work on the UI” as a vague idea.
Instead, it defines:

- when the designer should start
- how the designer should access the repo
- how the designer’s AI agent should behave
- what the designer agent may and may not change
- what proof and documentation the designer must provide
- how this work fits into the existing coordinator and stage workflow

## Why This Needs Its Own Planning Checkpoint

AddOne is no longer in a loose exploration phase.
The repo is in launch-prep coordination under `S4`, and the current immediate gate is `T-056` baseline freeze.

That means external design contribution cannot be handled casually.
Without a locked collaboration model, the likely failure modes are:

- broad UI churn before the launch baseline is frozen
- direct pushes or unreviewed branch drift
- AI agents touching backend, release config, or coordinator-owned docs
- design work ignoring AddOne’s existing visual direction
- external contributors returning vague screenshots instead of mergeable, reviewable slices

This plan exists to prevent that.

## Locked Decisions

- Designer start timing: after `T-056` baseline freeze
- Default access model: public fork + PR
- Default work mode: UI-only code contribution
- Default app surface: local Expo run on macOS with iOS Simulator
- Default architecture: same repo, no separate front-end repo
- Default preview model: reuse and extend the existing demo/proof foundations
- Default AI packaging: one canonical designer-agent playbook plus thin tool adapters
- Default edit policy: strict UI-only by default
- Coordinator remains the only owner of:
  - stage state
  - project memory
  - active-work docs
  - acceptance decisions
  - durable stage/report updates

## High-Level Collaboration Model

### 1. Timing

The designer should not begin mergeable release work until `T-056` is accepted.

Before `T-056`, design exploration is allowed only as concept work in disposable branches or a fork.
It should not be treated as active launch-baseline work.

After `T-056`, the designer can contribute scoped UI slices against the active launch-prep line.

### 2. Repo and GitHub model

The safest initial contribution path is:

- the designer forks the public repo
- the designer creates one branch per scoped slice
- the designer opens one PR per slice
- the PR stays open through iteration
- accepted slices are squash-merged after review

Do not start with direct write access.
Do not allow direct pushes to `main`.

### 3. Collaboration loop

The intended loop is:

1. Coordinator defines a narrow designer brief.
2. Designer and designer-agent read the required docs.
3. Designer works only in the allowed scope.
4. Designer opens a PR with proof and exact touched files.
5. Coordinator reviews the PR against:
   - the brief
   - AddOne UI direction
   - current stage constraints
6. Accepted changes are merged.
7. Coordinator updates durable repo memory if the slice materially affects planning or accepted state.

## Architecture Decision

The designer should work in the real app repo, not in a duplicated UI repo.

The correct model is:

- same real Expo app
- safe preview/demo foundations
- deterministic preview routes or catalog states
- fixture-backed screen review
- no backend or hardware dependency for normal designer review

This is the same general direction already implied by the existing demo/proof seams in the app, especially for:

- demo runtime fallback
- mock device state
- onboarding demo behavior
- social profile demo behavior
- Friends proof states
- firmware proof states

The collaboration model should extend those foundations, not replace them with a separate app.

## Designer-Agent System

### Canonical instruction pack

The repo should eventually contain a dedicated contributor pack for the external designer and the designer’s AI agent.

Recommended canonical files:

- `Docs/contributors/designer-onboarding.md`
- `Docs/contributors/designer-agent-playbook.md`
- `Docs/contributors/designer-preview-guide.md`
- `Docs/contributors/designer-brief-template.md`

Recommended adapters:

- root `AGENTS.md`
- Cursor adapter under `.cursor/rules/`
- generic pasteable adapter snippet for Gemini/Google-style tools

Rule:
all tool adapters must stay thin and point back to the canonical `designer-agent-playbook.md`.

### Designer-agent mission

The designer agent is not a coordinator and not a general repo agent.

Its role is:

- improve scoped UI/UX slices
- preserve AddOne’s existing product direction
- avoid architecture drift
- provide exact proof and handoff notes
- stop and escalate when the task expands beyond UI scope

### Read-first materials for the designer agent

For every slice, the designer agent should read in this order:

1. the assigned designer brief
2. `Docs/AddOne_UI_Direction.md`
3. the active stage note
4. `Docs/agent-coordination.md`
5. `Docs/git-operations.md`
6. any route/component files explicitly named in the brief

### Allowed scope by default

Default allowed paths:

- `app/`
- `components/`
- `assets/`
- UI-facing copy/constants

### Forbidden scope by default

Default forbidden paths:

- `firmware/`
- `services/`
- `supabase/`
- `deploy/`
- release config
- coordinator-owned docs:
  - `Docs/project-memory.md`
  - `Docs/Active_Work.md`
  - `Docs/AddOne_Main_Plan.md`
  - `Docs/git-operations.md`
  - `Docs/stages/**`

Default-forbidden unless the brief explicitly allows them:

- `hooks/`
- `lib/`
- `providers/`

### Designer-agent hard rules

The designer agent must not:

- add dependencies without explicit approval in the brief
- redesign unrelated surfaces while touching one slice
- change auth/data/backend contracts
- change firmware or infra
- change the stage system or planning docs
- refactor broadly under the label of cleanup
- push directly to `main`
- widen into product strategy work mid-slice

The designer agent must escalate if:

- the requested change appears to require backend or hardware changes
- the change needs a forbidden path
- the scope crosses multiple route families unexpectedly
- the requested UX direction conflicts with `AddOne_UI_Direction.md`
- the requested change would alter release behavior instead of surface-level UX

## AddOne-Specific UI Guardrails

The designer and designer agent must preserve the current AddOne product and visual direction.

Non-negotiable product/UI principles:

- board-first, not admin-first
- calm, dark, restrained, native-feeling
- minimal text
- one obvious next action
- no generic SaaS redesign language
- no drift into “software-only habit app” positioning
- no conflicting messaging with the launch-prep direction

The most important existing UI source of truth remains:

- `Docs/AddOne_UI_Direction.md`

The designer should treat current launch-prep messaging work as already constrained by:

- `T-057` hardware-companion positioning and no-device UX
- `T-059` reviewer/demo path

## Preview and Review Surface Strategy

The designer should eventually work from a deterministic preview-safe app surface.

The intended preview model is:

- no live OTP dependency
- no physical hardware dependency
- no live writes for normal preview use
- explicit screen/state entry points
- fixture-backed review of important release surfaces

The preview surface should eventually expose:

- sign-in and auth-related surfaces
- no-device state
- onboarding and recovery states
- Home states
- Friends states
- Profile states
- settings states
- firmware proof states
- hard-to-reach modal and destructive-confirm states

Until that catalog is fully implemented, the collaboration plan should still assume that preview and proof routes are heading in that direction.

## GitHub and Review Guardrails

Before active designer PRs begin, the repo should gain these guardrails:

- protect `main`
- require PRs for merge to `main`
- require at least 1 approval
- disable force-push to protected branches
- enable delete branch on merge
- prefer squash merge for designer slices
- add a lightweight PR template for UI changes
- add `CODEOWNERS` coverage for UI paths
- add minimal CI for:
  - install
  - `npm run typecheck`
  - `npm run test:runtime`
  - `npm run test:friends-state`
  - `npm run test:friend-celebration-gateway`

## Required Designer Deliverables Per Slice

Every designer PR should include:

- goal of the slice
- exact screens/states changed
- exact files touched
- screenshots or simulator proof
- exact commands run
- known limitations
- open questions
- note of anything intentionally left unchanged

For user-facing iterative slices, the PR description should reflect the final state after iteration, not only the first pass.

## Recommended Execution Order

### Preparation work, before designer contribution starts

1. complete `T-056` baseline freeze
2. add the designer collaboration docs
3. add tool adapters
4. add PR template
5. add `CODEOWNERS`
6. add CI guardrails
7. normalize external setup expectations:
   - Node 22
   - stable run instructions
   - preview-safe commands
8. clean up stale contributor-facing docs where necessary

### First release-relevant designer slices after baseline freeze

1. `T-057` no-device / hardware-companion UX
2. `T-059` reviewer/demo path UX
3. later store-facing surface work tied to `T-063`

### Recommended first working loop

- first pass: audit every screen/state and return a prioritized changelist
- second pass onward: one narrow PR per route family or state cluster

## Success Criteria For This Planning Slice

- A fresh coordinator can explain exactly how an external designer should be onboarded.
- A fresh designer can understand exactly how they are expected to work.
- The designer agent’s scope and limits are explicit.
- The repo has a clear future home for the instruction pack and adapters.
- The collaboration model does not conflict with the current `S4` launch-prep stage.
- The plan prevents the most likely failure modes:
  - scope drift
  - branch risk
  - AI overreach
  - preview architecture duplication
  - unreviewable UI churn

## Explicit Defaults

- start mergeable designer work only after `T-056`
- use fork + PR
- use same repo
- keep strict UI-only defaults
- use one canonical designer-agent playbook plus thin adapters
- preserve coordinator ownership of stage memory and acceptance

## Coordinator Notes

- Recommended placement is `Docs/plans/2026-04-05-external-designer-collaboration-plan.md`.
- This should be treated like the existing planning checkpoints in `Docs/plans/`, not like an active worker brief.
- When the coordinator is ready to operationalize it, the most natural integration points are:
  - a future contributor/doc-scaffolding slice after `T-056`
  - `T-057` for no-device truth
  - `T-059` for reviewer/demo path
- If the coordinator wants, this planning doc can later be referenced from:
  - `Docs/project-memory.md`
  - `Docs/Active_Work.md`
  - a future task brief for the actual scaffolding work

## Assumptions

- You want a durable repo document, not an immediate implementation branch.
- The coordinator should decide when this becomes an active execution slice.
- The document should be shaped as a planning checkpoint, not as a report and not as a task brief.
