---
id: T-030
title: UI skill-informed beta UI audit
stage_id: S3
stage_name: Beta UI Completion And Social Shape
subsystem: app
priority: medium
owner: Unassigned
depends_on:
  - T-001
  - T-027
owned_paths:
  - app
  - components
  - hooks
  - providers
  - Docs/AddOne_UI_Direction.md
source_docs:
  - Docs/AddOne_Main_Plan.md
  - Docs/project-memory.md
  - Docs/agent-coordination.md
  - Docs/ui-beta-issue-log.md
  - Docs/AddOne_UI_Direction.md
success_gate: Strict gate
report_path: Docs/agent-reports/2026-03-25-ui-skill-informed-beta-ui-audit.md
---

## Objective
Audit the current beta UI against the repo’s UI direction and the installed UI guidance sources, then produce a prioritized improvement list focused on real user-facing value rather than generic redesign ideas.

## Why Now
The core beta surface is now substantial enough that broad quality gaps are easier to see. Before starting another polish pass, we want one explicit audit that compares the current app against the strongest available UI guidance and identifies the highest-value fixes.

## In Scope
- Review the current app shell, pages, transitions, animations, navigation, spacing, hierarchy, and affordances.
- Compare the current UI against:
  - project-local `building-native-ui`
  - global `react-native-design`
  - installed `vercel-react-native-skills` reference
  - repo-specific `AddOne_UI_Direction`
- Identify concrete improvements with priority and rationale.
- Distinguish:
  - quick wins
  - medium refactors
  - later structural improvements

## Out Of Scope
- Implementing the fixes
- Redesigning the product direction
- Reopening accepted scope decisions for Friends, celebration playback, or lifecycle flow unless the audit finds a concrete contradiction
- Rewriting coordinator-owned docs directly

## Required Changes
- Produce a skill comparison focused on what each source is actually good for in this repo.
- Audit the current UI with code references, not only screenshots or opinions.
- Call out where the repo already follows the right guidance and where it does not.
- Prioritize improvements by user impact and implementation cost.

## Verification Required
- Confirm which UI-related skills are actually available in the current session versus only installed on disk.
- Read the current UI direction doc and use it as the product taste source of truth.
- Inspect the current app routes and main surfaced screens directly from code.

## Success Definition
- The team has one explicit, durable, prioritized audit of the current beta UI.
- The audit distinguishes real improvements from stylistic churn.
- The next polish pass can be scoped from this audit without re-litigating the entire UI direction.

## Open Risks
- Some installed guidance may conflict with repo-specific conventions; the audit should resolve those conflicts explicitly instead of listing both.
- A generic mobile design skill can suggest patterns that are correct in general but wrong for AddOne’s board-first product shape.
