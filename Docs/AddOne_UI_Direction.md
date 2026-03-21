# AddOne UI Direction

Last updated: March 21, 2026

This file is the AddOne-specific UI taste and decision guide.
Use it when making any visible app change.

Generic UI guidance still comes from `.agents/skills/building-native-ui/SKILL.md`.
This file answers the harder question: what good AddOne UI should feel like.

## Reference Surfaces

Use these current surfaces as the strongest visual anchors for AddOne:

- [components/app/home-screen.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/home-screen.tsx)
- [components/app/friends-tab-content.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/friends-tab-content.tsx)
- [components/settings/device-settings-scaffold.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/settings/device-settings-scaffold.tsx)
- [components/app/profile-tab-content.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/components/app/profile-tab-content.tsx)

These are not frozen pixel-perfect templates, but they are the best current examples of the visual language we want to preserve.

## Product UI Standard

AddOne should be:

- obvious before it is expressive
- simple before it is clever
- low-text before it is explanatory
- calm before it is busy
- precise before it is decorative

The practical bar is:

- a child should be able to understand the next action
- a non-native English speaker should still understand what to do
- the screen should make sense from hierarchy, position, icons, and interaction shape even before the user reads much text

## Core Principles

### 1. One obvious next action

Every screen should make the next move clear immediately.

Prefer:
- one primary action
- secondary actions clearly de-emphasized
- one step per page when the user is making a real decision

Avoid:
- multiple equal-weight buttons
- one page doing too many things at once
- mixed instruction + form + status + fallback all in the same visual block

### 2. Minimal text

Text is allowed when it is necessary, but it must earn its place.

Prefer:
- short titles
- short helper lines
- text only where the UI would otherwise be ambiguous

Avoid:
- explaining obvious controls
- repeating what the button already says
- long setup paragraphs
- stacking several helper paragraphs on the same step

### 3. Simple enough without reading English fluently

Use:
- clear icons
- strong spatial hierarchy
- predictable placement
- recognizable Apple-style interaction patterns

Do not depend on text alone to explain:
- what screen this is
- what the main action is
- what happens next

### 4. Board-first, not admin-first

The app should feel like it exists to support the board and the daily habit action.
Do not let setup, settings, or account screens feel more important than the core board experience.

### 5. Apple-native, not generic SaaS

The target feel is modern Apple-oriented product UI:

- clear hierarchy
- restrained motion
- strong spacing
- high legibility
- obvious affordances
- calm surfaces

Prefer the latest strong Expo / React Native native-feeling patterns when they improve the result.
Do not use outdated or generic web-style UI just because it is easy.

## Visual Language

### Surfaces

- Dark, restrained, and clean
- Strong contrast between actionable controls and the background
- Black-glass / dark-material direction is correct, but readability wins over effect
- Cards and controls should feel deliberate, not mushy or over-rounded

### Spacing

- Spacing must make hierarchy obvious
- Related things sit close together
- Unrelated things get room
- If a screen feels confusing, spacing is often part of the problem

Do not crowd:
- field label + field + helper text
- title + body + action
- lists with dividers

### Typography

- Use fewer text sizes with stronger hierarchy
- Headings should be short and readable
- Body copy should stay compact
- Helper copy should be visually quiet

### Icons and controls

- Icons should do real work, not decoration-only work
- Primary actions must be visible immediately
- If the background is dark, the action cannot visually disappear into it
- When an icon is the main action, it needs enough contrast, scale, and presence to read as the main thing on the screen

## Motion

Motion should help with:

- focus
- transition
- confirming state changes

Motion should not feel ornamental.

Good AddOne motion:

- subtle glow or breathing emphasis on a single important control
- soft fade/slide when content changes
- restrained feedback on press

Bad AddOne motion:

- constant busy animation
- large attention-seeking movement on every screen
- effects that make a calm screen feel noisy

## Copy Rules

Use copy to clarify only what the UI cannot already communicate.

Prefer:
- one-line titles
- one-line helper text
- direct language

Avoid:
- repeating instructions across title, helper, and button
- a paragraph where a title and button are enough
- “status chatter” that fills the screen without helping the user act

## Screen Design Rules

### Empty states

Empty states should be action-first.

Prefer:
- one centered primary action
- one short label or helper line

Avoid:
- welcome essays
- heavy explanation before the user has tried anything

### Onboarding

Onboarding should be split into clear single-purpose steps.

Prefer:
- one decision per step
- one action per step
- obvious forward motion

Avoid:
- one screen that asks the user to join Wi-Fi, choose Wi-Fi, enter credentials, and understand status all at once

### Settings

Settings should feel calm and compact.

Prefer:
- clear rows
- consistent spacing
- helper text only when necessary

Avoid:
- oversized CTA styling inside settings
- crowded cards
- duplicated status or success copy

### Friends and profile

These should feel understandable and human, but still restrained.

Prefer:
- board-first social surfaces
- compact identity
- clear actions

Avoid:
- social-product clutter
- over-explaining obvious actions

## Known Bad Direction

The current onboarding flow is the clearest negative example.

Why it is weak:

- too much text
- too many responsibilities per page
- too much explanation before action
- multiple concepts mixed into single screens

Specific anti-patterns to avoid:

- a “Begin setup” page that mostly explains the obvious instead of moving forward
- a Wi-Fi page that combines AP-join instructions, home-network selection, and credential entry without enough step separation
- screens that require reading several paragraphs to understand the next move

## Implementation Rules For UI Agents

When changing UI:

- start from the existing AddOne visual anchors, not generic defaults
- reduce text before adding more text
- prefer splitting steps over stacking more content into one screen
- make the primary action unmistakable
- verify spacing and coherence after the change, not only the main element itself
- if a control is hard to see, fix contrast, scale, hierarchy, or glow before adding more explanatory copy

If there are multiple valid options, choose the one that is:

1. easier to understand at a glance
2. more Apple-native in feel
3. less text-heavy
4. more coherent with the current home, friends, and settings surfaces

## Final Test

Before calling a UI slice good, ask:

- Can the user tell what to do in under two seconds?
- Is there one obvious primary action?
- Did we use text because we needed it, or because the layout was unclear?
- Does this feel like the same app as Home, Friends, and Settings?
- Would this still make sense to someone who barely reads the text?

If the answer is no, keep iterating.
