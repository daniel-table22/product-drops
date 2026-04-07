# Hotplate FigJam audit — deltas vs. help-center teardown

Source: FigJam board "Product-drops", section "Hotplate" (9 grouped screenshots of `portal.hotplate.com`).
Compared against: `docs/research/hotplate-teardown.md`.

This document only captures things that are **new, contradictory, or worth calling out** relative to the help-center research. Anything that just confirms the teardown is omitted.

---

## Global / navigation

The portal sidebar is split into two sections:

- **Top:** Drops, Orders, Prep, Inbox, Insights, Get help
- **Bottom:** Payout, Customers, Reviews, Items, Discounts, Locations
- **Footer:** workspace name (e.g. "Giulia Dalsimbianchi") with a small red notification dot on the Settings entry

Notes:
- **"Get help" is a first-class nav item**, not buried in a profile menu — implies an in-app help drawer / chat, not just an external help center.
- **"Locations" is a top-level nav item**, not a sub-page of Settings. The teardown described locations as a settings concept; in the live UI it's a peer of Items, Discounts, Customers, etc.
- **Inbox is a top-level nav item** alongside Orders/Prep — messaging is treated as core operational surface, not a settings sub-feature.
- The red dot on Settings strongly suggests an **onboarding/completeness badge** ("you still need to finish setup").

---

## 1. Drops home / storefront onboarding (node 11:541)

New things visible that the help center didn't explicitly call out:

- **Three-card onboarding checklist** at the top of the empty Drops dashboard:
  1. *Customize your storefront* — "Add your colors, logo, and bio"
  2. *Set up to get paid* — "Set up with Stripe, our payment processor, so you instantly get paid your earnings"
  3. *Schedule and share your first drop* — "Set up the first super-3-5-day-ahead-of-time drop so customers can sign up to get text alerts"
  Each card has a CTA button (Customize / Set up / Schedule).
- **Waitlist count surfaces inline on the Drops home**: "You have 1 people waiting for your next drop. Don't keep them waiting!" with a *Create drop* button. The teardown noted that subscribers exist but didn't show that the count is rendered as a nudge on the main dashboard.
- **Live / Draft sections** on the Drops home are explicitly counted (Live • 0, Draft • 3) and laid out as horizontally scrolling cards with cover image + name + scheduled date + location.

Storefront customizer (the right-hand screenshots in the same section):

- **Color customization is preset-driven** — there's a row of swatches (olive, mustard, green, pink/red, purple, red, etc.) plus what looks like a typography selector. Users aren't picking arbitrary hex values, they're picking from a curated palette. Worth noting for our own design system thinking.
- The storefront preview shows: hero image, brand name ("Giulia's Gelato"), an FAQ section, and a **"Make a reservation"** CTA. The teardown didn't surface a reservations concept — this could be a new feature, a third-party embed, or just a customizable button label. **Worth investigating.**
- Storefront settings include toggles (visible on the right-most screenshot) — likely visibility flags for sections like FAQ, reviews, etc.

---

## 2. Drops list + drop editor (node 11:500)

- The drops list confirms Live/Draft grouping. Three drafts shown (Untitled Drop, Spring Pistachio, Untitled Drop), each with cover image, scheduled date, and location.
- Drop editor is a **right-side panel/modal**, not a full page, with tabs: **Basic info / Menu / Summary** (and possibly a 4th tab cut off).
- Visible fields in Basic info:
  - Cover image
  - Drop name ("Spring Pistachio")
  - Description ("Organic. Organic.")
  - **Tags** — "Organic" is shown as a tag chip. **The help center never mentioned a drop-level tagging system.** This is new and worth calling out.
  - **When customers pickup**: explicit window (Sat Apr 11, 6:00pm – 8:00pm PDT) with location ("The home")
  - **When orders open and close**: separate open/close timestamps (Opens Wed Apr 30 6:00 PM, Closes Fri Apr 18 12:00 PM)
- The order open/close window and the pickup window are clearly **two independent ranges** in the UI, even though the teardown described them as related. The visible example actually has orders opening *after* pickup, which is almost certainly placeholder data — but it confirms the data model has two independent date ranges, not a derived window.

---

## 3. Item creation (node 11:521)

The "Create an item" modal:

- Image upload with **"Recommended size 750x750px"** hint
- Name, Description, Base price ($)
- **Option groups** as a sub-resource ("1 option group" link to drill in)
- **Per-item tax rate** field (showing 3.00%) — confirms the teardown's note that items can override location/global tax
- **Special instructions toggle** — "Allow customers to make free-form requests on this item" with a settings gear next to it (so it's configurable, not just on/off)

The "Create option group" modal (separate screenshot):

- **Setup / Preview tabs** — option groups have a built-in preview, suggesting they can get complex enough to need one
- Options as repeatable rows with name + price delta
- **Rules section** with three toggles:
  - Require at least one selection
  - Allow for multiple selections (with "Up to N selection" quantity limit)
  - **Enable inventory for this group** — *per-option-group inventory*. The teardown mentioned item-level and drop-level inventory; this is a third axis: **inventory caps on individual modifier options** (e.g., only 12 "rainbow sprinkles" available across all orders for this drop).

The per-option inventory and the multi-select quantity cap are both worth flagging — they're more granular than the help center implied.

---

## 4. Items list (node 11:522)

- Items page is a simple table: Item, Date created, Price
- Each row shows the item's option count and tax rate as inline badges ("Options" / "3.00%")
- A **bulk action bar pinned at the bottom** of the page (visible as a dark pill) — implies bulk operations on items (delete, duplicate, archive?). Help center didn't mention this.
- Toast notification "Success: Item created successfully" — confirms there's a toast/snackbar pattern for confirmations.

---

## 5. Orders (node 9:351)

- Orders page has top-level **Open / Done** tabs
- Toolbar buttons: Sort, Filter, **Tickets**
  - **"Tickets" is new** — the teardown described prep lists and pickup management but didn't surface a "tickets" concept. This could be a kitchen-ticket print view, an order-by-order printable, or a separate batched view. Worth investigating in the live product.
- The order list renders **multiple line items per order on the same card** (each order row expands to N sub-rows for its items), rather than one row per item. Useful UI pattern note.
- Status badges next to customer name use **single-letter color-coded codes** (P, M, etc.). Probably pickup status (Picked up / Missed / etc.) — not enumerated in the help docs.

---

## 6. Prep (node 9:405)

- Prep page has **four view modes** as tabs: **Overall / By week / By day / By time**
  - The teardown noted Prep + Pickup as separate reports in the new portal, but didn't enumerate these four lenses. "By time" in particular is interesting — it implies prep can be sliced by *time of day* across drops.
- Top of the page shows the active day ("Fri • Feb 27") with a **progress bar** ("98/458 items prepped") — gamified prep progress
- Each item row has an **inline editable counter** (`prepped / total`, e.g. `20 / 24`) with what looks like a circular progress ring next to it
- Filter button in the top-right — Prep is filterable (by item? by drop?)

The inline editable counters and the progress bar are both UX patterns we should consider — they make the prep screen feel like a live checklist instead of a report.

---

## 7. Inbox (node 9:388)

- **Inbox is a unified surface for both 1:1 messages and broadcast blasts** — top toolbar has both *Blast* and *Message* buttons. The teardown described SMS blasts and customer messaging as separate concepts; the UI merges them into one "Inbox" tab.
- Tabs: All / Unread / Archived
- Empty state copy: "Your inbox is clean, great job 🙌"

The "Send a text blast" modal (right screenshot):

- **Audience selector** — "All subscribers (1)" with a chevron, implying audience segmentation (probably by drop, by tag, by past purchase)
- **Include URL** as an explicit field (separate from the message body)
- **Character counter** showing **14/172** — note the limit is **172**, not 160. That's almost certainly because Hotplate prepends/appends required compliance text and reserves the rest for the user. The visible preview confirms this:
  - Sender name = the workspace owner's name ("Giulia Dalsimbianchi sent you a message")
  - Body = the user's content
  - Footer = "UNSUB GIULIA to unsubscribe. UNSUB ALL to stop all SMS. Pwd by Hotplate."
- The **two-tier unsubscribe keyword** (per-sender `UNSUB <NAME>` plus universal `UNSUB ALL`) is a real implementation detail worth copying for compliance.
- **Live preview** of the rendered SMS shown in the compose modal.

---

## 8. Insights (node 10:457)

- Tabs: **Overview / Drops / Subscribers**
- The teardown described reports for orders/prep/payouts but **didn't enumerate a subscribers analytics view**. Hotplate is treating subscriber growth as a first-class metric.
- Subhead: "Financial, panel level, and order insights"
- Cards on the Overview tab:
  - Revenue
  - Orders
  - Items sold
  - **Storefront visitors** — page-view analytics. Not in the teardown. Implies Hotplate tracks anonymous storefront traffic, not just authenticated subscribers.
  - Tips
  - Average order
- Date range selector ("Last 6 weeks") and granularity toggle ("By Day") in the top-right
- Empty cards say "No data" individually

---

## 9. Locations (node 10:466)

- Locations is a list page with a `+` button top-right
- Each location card has a **rendered map preview** (Google Maps / Mapbox tile) plus name + truncated address
- Toast: "Success: Location created successfully"
- Confirms locations are a top-level nav item (see the global section), not buried under Settings

---

## Summary — things to call out for the PRD

The help-center teardown is mostly accurate, but the FigJam screenshots reveal several things we should explicitly account for in our PRD:

1. **Drop tags** — drops can be tagged (e.g. "Organic"). Not in the help docs. Decide whether we want a tagging system on day one.
2. **Per-option-group inventory** — modifier options have their own inventory caps, on top of item-level and drop-level inventory. This is a *third* axis of stock control we hadn't accounted for.
3. **Option group preview tab** — option groups are complex enough to warrant a built-in preview. Sign that the rules engine (require N, allow up to N, with inventory) gets confusing fast.
4. **Inbox is unified** (1:1 + blast in one surface), not two separate features.
5. **SMS compliance footer is two-tier** — `UNSUB <NAME>` plus `UNSUB ALL`. The character budget visible in the UI (172) reflects what's left after compliance text is reserved.
6. **Subscriber analytics + storefront page-view analytics** are first-class — Hotplate measures top-of-funnel, not just orders.
7. **Prep has four view modes** (Overall / By week / By day / By time) and an inline-editable progress bar. Richer than the teardown's "prep report" framing.
8. **Orders page has a "Tickets" action** — separate from prep and from the order list itself. Unknown semantics. Worth reverse-engineering before we scope our own ticketing.
9. **Reservations CTA on the storefront** — "Make a reservation" button is visible on the example storefront. Either a new feature, a customizable button label, or an embed. Worth confirming because it materially changes the storefront's purpose.
10. **Onboarding is a 3-card checklist on the Drops home**, plus a red badge on Settings until completion. Good pattern to copy for our own first-run experience.
11. **Storefront customization is preset-driven** (curated color palette + typography), not free-form CSS/hex pickers. Constrains the design problem nicely.
12. **Drop editor has tabbed flow** (Basic info / Menu / Summary) and lives in a side panel, not a full-page form. Implies drops are quick to author.
13. **Locations are a top-level nav item**, not a settings sub-page. Suggests multi-location is more central to the model than a single-chef tool would imply.
14. **Bulk action bar on Items** — items support bulk operations. Not mentioned in help docs.
15. **"Get help" is in the primary nav** — there's an in-app help surface, not just an external help center.

Items 1, 2, 5, 6, 7, 8, 9, and 11 are the highest-leverage callouts — they either reveal capabilities we hadn't planned for or reveal product principles (curated customization, compliance two-tier, top-of-funnel analytics) that should shape our PRD before we start designing screens.
