# Claude Code Prompt — AddOne Content Page

## Your task

Build a single HTML page that presents all the copy and content from the attached file `AddOne_Page_Architecture_v3.md`.

This is NOT a final product. It is a clean, readable content reference page — for the designer (Andrii) to review all copy, structure, and section notes before building the real website.

The goal is simple: make everything easy to read, easy to navigate, and pleasant to look at. Nothing more.

---

## What to build

A single `index.html` file. No frameworks. No dependencies. Vanilla HTML and CSS only.

The page should present all nine sections of the AddOne homepage in scroll order, exactly as laid out in the architecture document:

1. Hero
2. The Problem
3. The Story
4. The Device
5. Why It Works (including 5b — Too Small To Fail)
6. Real Results
7. Community Vision
8. Get One / Join the List
9. Footer

---

## Content rules

- Use ALL locked copy exactly as written. Do not paraphrase, summarize, or rewrite anything marked ✅ LOCKED.
- For sections that have notes but no locked copy yet (Device, Why It Works, Too Small To Fail), present the section notes cleanly — clearly marked as "Notes / Direction" so Andrii knows this is guidance, not final copy.
- For sections with multiple options (headlines, button text, supporting lines), present all options clearly labeled — e.g. "Option A / Option B / Option C" — so Andrii can choose.
- Photo and material placeholders should appear as clearly labeled grey boxes — e.g. "[Photo: Viktor's grid — 9 weeks]" — so Andrii knows exactly what goes there.
- The quote library, principles, and studies/facts from Section 05 should all be included, clearly organized.
- Include the Guiding Principles section at the top — Andrii needs to understand the philosophy before reading the copy.

---

## Design rules

**Palette:**
- Background: #0F0F0F (near black)
- Text: #E0E0E0 (off white)
- Accent: #FF9F1C (amber — the LED color)
- Section dividers: subtle, not heavy
- Muted text for notes/labels: #666666

**Typography:**
- Import from Google Fonts: Space Grotesk (body + headings), Cormorant Garamond italic (pull quotes and locked copy), JetBrains Mono (labels, section numbers, metadata)
- Body text: Space Grotesk, 17px, line-height 1.7
- Locked copy / quotes: Cormorant Garamond italic, slightly larger
- Section labels: JetBrains Mono, small, uppercase, amber color

**Layout:**
- Single column, centered, max-width 720px
- Generous vertical spacing between sections (at least 80px)
- Each section clearly separated
- Section numbers visible (01, 02, 03...) in JetBrains Mono, small, amber
- Locked sections marked with a subtle ✅ indicator
- Notes/direction sections marked differently from locked copy — maybe a left border in amber, slightly muted background

**Tone:**
- Minimal. No decorations, no gradients, no shadows.
- The content should breathe. Lots of whitespace.
- This is a document, not a website. Make it feel like a beautiful document.

**Navigation:**
- A simple fixed left sidebar or top nav with section numbers/names so Andrii can jump between sections quickly.
- On mobile, collapse to a top nav.

---

## What NOT to do

- Do not invent any copy, headlines, or content not in the architecture document
- Do not add decorative elements, icons, animations, or illustrations
- Do not try to make this look like a finished product or landing page
- Do not add placeholder images from the internet — grey boxes with labels only
- Do not simplify or omit any content — everything in the architecture document should appear somewhere on the page
- Do not add any CTAs, buttons, or interactive elements beyond basic navigation

---

## Deliverable

One file: `index.html`
Self-contained. All CSS inline in a `<style>` tag. No external files except Google Fonts.

The page should open in any browser and be immediately readable without any setup.
