# AddOne — Project Reference

*Last updated: March 6, 2026. This supersedes all previous versions.*

---

## 1. Project Summary
- **Product:** Physical habit tracking device. Sits on your desk. One button. One light per day.
- **Name:** AddOne
- **Domain:** addone.studio
- **Founder:** Viktor — self-taught electronics tinkerer, AI-enabled builder, self-improvement enthusiast. Based in Los Angeles.
- **Collaborator:** Andrii Krupenko — photographer/designer, close friend. Building the webpage. Full visual discretion.
- **Stage:** Pre-launch, March 2026. Batch 1 (~50 units, made to order).
- **Goal:** Get units into ~50 hands, validate price, build email list for future Kickstarter.
- **Launch timeline:** Pre-launch page live ASAP → Holiday season 2026 as first real launch → Kickstarter after Batch 1 validated.

---

## 2. The Product (Batch 1 — Current Spec)

| Spec | Detail |
|------|--------|
| Enclosure | 3D printed, assembled by hand (NOT Jesmonite — that was an earlier idea) |
| Display | 8×21 LED matrix (21 columns = 21 weeks of history) |
| Input | Single mechanical button. Viktor tested 1,000+ buttons to find the right click feel. |
| Controller | ESP32 (same chip as Sonoff smart home devices) |
| Power | USB-C |
| Personalization | Name + unit number laser engraved on back |
| QR code | Back of unit → addone.studio/start |
| Build location | Los Angeles, CA. Made to order by Viktor. |

**How it works:**
- One button press per day = one lit dot on the grid
- 8th row = weekly success/fail for each week column
- User sets their own minimum (e.g., "15 minutes at the gym = success")
- No app required for daily use; the app handles setup, settings, history correction, and sharing
- Weekly consistency tracked, not daily perfection

**The 21-Week Milestone:**
When the full grid fills = 21 weeks (~5 months) of showing up. The habit is likely automatic by then. Choose to continue or start something new. This endpoint is unique — most trackers are infinite.

---

## 3. Strategy: The "Artisan Drop"

**The pitch:** "I couldn't find a habit tracker that felt like it belonged on a nice desk, so I built one."

**Model:**
- Produce: 10–50 units by hand (Viktor is the factory)
- Sell: Direct via addone.studio (email-first reservation, payment after confirmation)
- Price: $149
- Vibe: Handmade, honest, personal — not a startup product

**The delivery experience (Viktor's vision):**
- When unit is printing → send buyer a video
- During assembly → send a photo
- Packaging shows their name engraved
- Feels personal — made by Viktor, for them specifically

---

## 4. Personalization — Core Feature

Each unit has the buyer's name + unit number laser-engraved on the back. Viktor ordered a laser engraver specifically for this.

This started with the original 10 Christmas gifts — each one had the friend's name on it. When friends later bought units for other friends, they specifically wanted that person's name on it. **The personalization is what made it a gift, not a gadget.**

**Order flow:** During reservation, buyers enter:
- Name to be engraved
- Whether it's a gift (and whose name + optional message)

**Device back layout:** 250×100mm horizontal
ADD ONE (small, top left) | Name (center, prominent) | #001 (amber, below name) | QR code (right side) | addone.studio/start (below QR)

---

## 5. Business Model

- **Price:** $149 (locked)
- **Parts cost:** ~$40–50
- **Model:** Made to order, no inventory
- **Payment:** Email reservation → Viktor confirms → payment collected
- **No subscription, no refills, no app required for daily use**
- Batch 1 includes the AddOne companion app for setup, settings, history correction, and sharing

---

## 6. The Page (9 Sections — All Locked)

| Section | Job |
|---------|-----|
| 01 Hero | Create curiosity. Stop the scroll. |
| 02 Problem | Make someone feel seen. "That's me." |
| 03 Story | Emotional engine. This is why people buy. |
| 04 The Device | What is this thing. Trust through specificity. |
| 05 Why It Works | Intellectual permission to believe. |
| 06 Real Results | Credibility without polish. |
| 07 Community Vision | This is bigger than one person. |
| 08 Get One / Join List | Convert. Two paths. |
| 09 Footer | Close with identity. |

Full copy for all sections: see `AddOne_Full_Session_Knowledge.md` and `AddOne_Page_Architecture_v3.md`

---

## 7. Materials Still Needed (from Viktor)

- Viktor's grid photo (9 weeks, all green) — for Section 06
- Photo of friend's hand-drawn paper grid — for Section 06
- One direct quote from a friend (with permission) — for Section 06
- Process/workspace photos for Andrii
- Blurred Telegram group screenshot (can be "(translated from Ukrainian)") — for Section 03

---

## 8. Open Questions

1. Display spec — 8×21 confirmed? Need final answer before specs go live on page.
2. Shipping timeline — "made to order, ships in X weeks" — what's the honest window?
3. Packaging — is there a box? What does it look like?
4. USB-C cable included?
5. Open source firmware — mention on page or not? Deferred.
6. Email platform for newsletter?
7. Payment platform — Stripe? Gumroad? Direct email?

---

## 9. Tim Ferriss / Learning-by-Doing Philosophy

Viktor articulated this as his reason for doing this project:

> "Tim Ferriss spent $100,000 on actually doing stuff and learning rather than going to university. Even if you lose all the money, you guarantee to learn and meet people and have the experience."

Applied to AddOne: Viktor might lose money on this batch. But the learning — engineering, manufacturing, selling, social media — is the point. "Worst case scenario I will learn a lot." This explains why imperfection is intentional, not a failure.

---

## 10. Community Vision (Future — Don't Promise Yet)

The Telegram group Viktor created for the original 10 friends became an organic accountability community. Friends shared grid screenshots, cheered each other on, asked "did you do it today?"

Viktor's future vision: an app where friends can see each other's grids, run shared challenges, support each other. This was already happening without any technology — the community emerged because the *idea* was shared.

On the page: tell the Telegram story as something real that happened. Don't promise the app. Frame it as "this is where it's going."
