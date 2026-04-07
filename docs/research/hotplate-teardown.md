# Hotplate Teardown — Help Center Analysis

**Source:** https://help.hotplate.com/en/
**Compiled:** 2026-04-06
**Method:** Read every article in the Hotplate help center (53 articles, 9 categories) via Claude in Chrome.
**Purpose:** Inform the PRD for our own product drop app.

---

## Executive summary

Hotplate is a pre-order, drop-based commerce platform for food businesses (bakers, chefs, pop-ups). The core product thesis is that scheduled, time-bounded "drops" — where a limited supply becomes available all at once — drive better repeat purchase, customer anticipation, and operational predictability than an always-on storefront. The platform handles storefronts, drop scheduling, menus, inventory, checkout, customer texting, prep lists, payouts via Stripe, and reporting.

Key product pillars (will be filled in once all articles are read):

1. **Drops** — scheduled, time-bounded sales events with open/close times, inventory, pickup/delivery windows.
2. **Storefront** — branded customer-facing site where drops appear.
3. **Menus & inventory** — products, options, bundles, gift cards, order limits.
4. **Customer comms** — automated text reminders, customer messaging, text blasts, reviews.
5. **Orders & prep** — order management, edits, refunds, prep lists, ticket printing.
6. **Payouts** — Stripe-based payouts.
7. **Settings** — storefront customization, team members, tax, loyalty points.
8. **Reports** — item-level sales, fee reports, 1099-K.

---

## 1. Getting Started

### How Hotplate works
- Hotplate is pre-order based: customers can only order during a drop.
- A "drop" = a limited supply of product available for purchase all at once.
- Positioned as the most profitable and operationally sustainable way to run a food business.
- Rationale for drops over always-on: consistent cadence (weekly / bi-weekly) + limited ordering window drives anticipation, urgency, repeat sales, and new customers. Always-on is harder to plan production for and lacks moments to draw customers back.
- Subscribers get a text every time orders open. The chef controls open/close times, inventory, and pickup windows in advance.
- "Duplicate +1 week" feature: most chefs duplicate a drop to tee up the next week in a few clicks rather than rebuilding the menu.

### How to sell out your first drop
- **Ordering window:** schedule open 3–5 days after publish to give time to gather subscribers. Common pattern: open beginning/middle of week for end-of-week / weekend pickup.
- **Menu:** start with 1–5 items, minimal modifications. Variety causes decision fatigue and abandoned carts.
- **Inventory:** start small to drive scarcity/urgency. Waitlists exist — if a customer joins one and inventory is added later, they're auto-notified.
- **Drop text:** customized in the Publish tab; goes out via SMS to all subscribers.
- **Marketing the sell-out:** announcing "sold out" is itself a marketing moment.

### Switching to Hotplate from another system
Five-step migration playbook:
1. **Migrate customer list** — chef sends a CSV (phones required, emails optional) to support@hotplate.com; Hotplate imports and subscribes them to SMS.
2. **Notify customers** — first via current system, then a custom text blast through Hotplate. Templates provided.
3. **Customize storefront** — logos, cover photos, theme colors.
4. **Update social channels** — explain why subscribers should join SMS; add storefront URL to bios.
5. **Migrate menu items** — recreate items in the Hotplate portal; support team will help if you send your existing menu link.
- Each storefront has a unique **SMS sign-up link**, available at the top of the Settings page.

### How to get subscribers
- The **biggest predictor of success** is subscriber count. Zero subscribers = no one hears about the drop.
- First 3 steps: link storefront in social bios; pin a "How to Order" post; text the SMS sign-up link to 1:1 contacts.
- Reference site `learn.hotplate.com` is the dedicated marketing playbook.

### Why should I use Hotplate
- **One-line pitch:** automates website, customer comms, inventory, payments, order tickets, prep list, and insights — chef focuses on food.
- **Customer types:** popups, micro-bakers, home cooks, CFOs/MEHKOs, commissary kitchens, brick-and-mortars with a fan base.
- **Featureset summary** (chef-facing list):
  - Storefront
  - Inventory management (prevents oversell)
  - Automated, printable prep list and order tickets
  - Automated SMS notifications
  - Engagement tools: loyalty points, reviews, discounts, gift cards, sold-out waitlists
  - Payment processing via Stripe (PCI Level 1)
  - Insights / analytics
  - Human support team
- **Pricing model** (critical for our PRD):
  - **No subscription / monthly fee** for the chef.
  - Chef pays only Stripe processing: **2.9% + $0.30** per transaction.
  - Hotplate's own fee is charged **to the customer**: **5% of subtotal + $0.55**, never on tip or tax. ~$1.80 on a $25 order.
  - Chef can customize the split (take more, or pass more to customer); 80% leave the default.

### Your first 4 steps on Hotplate
The onboarding checklist that appears post-signup:
1. **Customize storefront** — URL is `hotplate.com/{business-name}`. Best practices: clear transparent-background logo top-left, high-quality banner photo, short "About Me" with drop schedule.
2. **Get set up for payouts** — via Stripe; collects tax info, EIN/personal details, bank link.
3. **Set up first drop** — set open/close times, pickup time/location, menu items. Recommend opening 3–5 days out.
4. **Share storefront** — get subscribers before the drop goes live.

## 2. FAQs

### What kinds of businesses?
Open to all sellers regardless of size — from sale #1 to #10,000+. All food categories: baked goods, ice cream, pizza, BBQ, etc. Operator must comply with state/local food regulations.

### International support
**US-only** today. Interested international users emailed to a waitlist via support@hotplate.com.

### Subscriptions
No native subscription product yet, but a **documented workaround**:
- Create one drop at the start of the month covering N future weeks.
- Create separate menu items per subscription length ("4-week sub" vs "2-week sub").
- Inventory is set per number of subscriptions, not individual units (10 of "4-week sub" = 40 loaves).
- Customer picks only the **first** pickup window at checkout; subsequent week pickups must match.
- Reminder workarounds: chef edits each order to advance the pickup week (re-triggers automated reminders) **or** sends a manual text blast to the filtered customer list.
- This is a **clear product gap** Hotplate acknowledges they want to fill — relevant to PRD.

### Mobile app
**No native app.** Web only on portal.hotplate.com. Workaround: iPhone "Add to Home Screen" PWA-ish shortcut. (Another PRD-relevant gap.)

### Pricing — full detail
- No monthly fee.
- Chef pays Stripe processing only: **2.9% + $0.30**.
- Hotplate fee charged to customer at checkout: **5% subtotal + $0.55** (~$1.55 on $20 order). Never on tip or tax.
- Fee shows on the customer checkout as "Fees" or "Taxes and Fees".
- Fee split is configurable in **Settings > Checkout**: chef can absorb part or all of the Hotplate fee, and/or pass the payment-processing fee onto the customer.
- For off-platform payments (cash/Venmo/Zelle), the Hotplate fee is deducted from the chef's payout balance and the customer is told to pay the chef the fee with the same method.

## 3. Drops

### Drop creation flow (high-level)
A **Drop** is the central unit of work. Tabs in the drop creator (inferred from articles): **Basic Info**, **Menu**, **Summary** (with Additional options & Publish), and Publish.

### Gift cards
Two flavors:
1. **Storefront gift cards** (toggle in Settings → Storefront → Misc.). Buyer flow: click 'Gift Card' top-right of storefront → choose amount → enter recipient contact → pay. Recipient gets text + email with code; redeems via "discount code or gift card" field at checkout. Chef gets a text notification per purchase. Balance auto-tracked; remaining balance texted to recipient after partial use.
2. **In-drop gift cards** (toggled per drop in Summary → Additional options → Add Gift Card to Menu). Listed at bottom of menu; preset amounts or custom. Caveats: no chef notification; treated like an order so customer gets pickup reminders even if gift card is the only thing they bought. Hotplate openly notes they want to converge these two flows.

### Menu items
Item creation: photo, name, description, base price.
- Item lives in a global **Items** tab (reusable across drops) and can also be created inline from a drop's Menu tab.
- **Option groups** let an item have variations:
  - **Variation** (most common): flavors/sizes/quantities. Counted on prep list.
  - **Modifier** (rare): per-ticket customizations like "extra toasted". **Not** counted on prep list.
- Per-option price adjustments allowed (negative values supported, e.g., $-1 "bring your own bottle").
- Rules: require at least N selections, allow multiple selections, allow multiple of same option, enable per-option inventory.
- Optional per-item settings: **custom tax rate**, **special instructions** field (e.g., personalization notes).
- Strong UX bias toward **fewer choices**: Hotplate repeatedly tells chefs that more options reduce checkout conversion.

### Assorted boxes / bundles
- Currently a manual workaround. Without help, prep list shows each unique combination as its own line.
- "**Items within Items**" is a backend-configured feature support sets up on request — converts a bundle so prep aggregates per component. Manual config; chefs must email support a few days ahead of the drop.
- Hotplate explicitly says they're working on a self-serve, more flexible bundle feature.
- Component-level inventory auto-deduction across bundle and standalone is **not** self-serve yet.

### Inventory & order limits (rich model)
Multiple layered limits — system always enforces the **strictest**:
- **Item inventory** — max units sellable for the item in this drop. Default 10.
- **Max per order** — caps qty per cart for this item.
- **Max per pickup time/day** — caps item qty per pickup window/day. Useful for capacity constraints (e.g., freezer holds 100 pints/day).
- **Section restrictions** — group items into a menu section that share one inventory pool (e.g., 100 dough balls across 5 pizza flavors). Configured in Menu tab → Add section → enable Section Inventory.
- **Max orders per pickup time** — caps number of orders (not items) per slot. For controlling foot traffic.
When a limit is hit, item shows as **sold out** to customers.

### Drop "Additional options" (Summary tab)
- **Drop visibility:** Public (shows on storefront, sends drop SMS) vs Private (link-only, no SMS).
- **Checkout time limit:** 3/5/10/20/30/60 min. Default 5. Cart expiry releases inventory back to pool. Floating timer visible to customer. **Cannot be unlimited** — by design, drives urgency and prevents abandoned-cart inventory hoarding.
- **Orders open time visibility:** show or hide the exact open time to customers.
- **Menu visibility:** show or hide the menu before orders open.
- **Inventory on storefront:** show or hide remaining inventory counts to customers.
- **Add gift card to menu:** as above.

### Delivery (assisted)
- Not self-serve. Chef requests setup via a form, attaches an XLSX of zip codes + flat fee per zip.
- Hotplate team configures within ~1–2 business days; emails chef when ready.
- Setup is **per-drop**, not global — to preserve delivery, chef must **duplicate** the configured drop rather than create new ones.
- No third-party courier integration — chef does the actual delivery.
- No radius/map zones; ZIP-based only. Delivery-only mode supported (no pickup) on request.
- Customer enters address at checkout when delivery is enabled; address shows on order ticket.

## 4. Orders and Prep

### Orders tab anatomy
- Two top-level sub-tabs: **Open** and **Done**.
- Default view: future-fulfillment orders.
- Sort + Filter in top right.
- Three view modes (desktop): **Ticket** (swipeable), **List** (spreadsheet-like with column picker), **Grid**.
- Each ticket shows: customer name, order #, pickup day/time, items, **new vs returning** badge, and order streak counters.
- Quick actions on each ticket: **Message**, **Modify**, **Refund**, **Cancel**.
- Per-item **packed checkbox** on each ticket.
- **Mark done** button at bottom moves ticket Open → Done (and triggers an "order completed" SMS to customer if that reminder is enabled).
- "Mark all done" via List view's bulk select.
- **Print orders** option supports 8.5×11" paper and label/thermal printer sizes (4×6, 4×5, 3×5, 3×4, 3×2).

### Editing orders
- Three edit modes:
  - **Add a note** — internal only, prints/exports with the ticket.
  - **Modify items** — add/remove items; **payment delta is NOT auto-charged** — chef settles outside Hotplate.
  - **Edit details** — fulfillment type, location, date, time.
- Inventory updates automatically when items are added/removed; warns if added item is sold out or new pickup time is full.

### Refund / cancel
- **Simple refund**: flat $ — "Full", "Full minus fees", or custom amount. Optional Cancel + Restock.
- **Itemized refund**: pick items; optional restock.
- **Cancel**: hides order, stops pickup reminders. Optional refund + message.
- Help center includes example **cancellation policies** (flexible/strict/all-sales-final) and recommends publishing them in storefront FAQs and the checkout acknowledgement.

### Discount codes
Three discount **scopes**:
- **General** — any customer, any drop.
- **Customer** — locked to a specific customer.
- **Drop** — only valid on a specific drop.
Type: **Percentage** or **Flat $**.
Restrictions:
- Max discount value (cap on percentage discounts).
- Minimum subtotal.
- Date range.
- Maximum total redemptions.
- Customer restrictions: first-time customers only, max redemptions per customer.
Active vs Inactive tab segments. Codes have usage history.
**Fee nuance:** Hotplate fee is calculated on pre-discount subtotal. If chef passes fee to customer, the customer pays a fee based on the discounted subtotal — and the chef silently absorbs the gap.

### Prep list
- Auto-aggregates items across all orders in real time.
- Updates when orders come in (separate from packed/done status — old version updated only on packed; new version is real-time).
- Default group by **fulfillment date**. Toggles: Overall / By week / By day / By time.
- Filters: fulfillment date, drop, location, item.
- Inline progress: enter prepped quantity per item or "Mark all prepped"; green progress bar.
- **Print or Export** with option to "mark exported items as prepped".
- Differs from **Pickup report** (covered later in New Portal FAQs).

### Manually creating orders
- "+ Create" in top right of Orders tab.
- Two modes:
  - **Quick create** — not associated with any drop.
  - **Attach to a drop** — reserves inventory + pickup slot in that drop.
- Manual orders **do not trigger SMS reminders** to customers and require off-platform payment collection.
- Filter by `Order source = Manual` to find them.

## 5. Customer Communication

### Inbox + 1:1 messaging
- **Inbox** tab is the messaging hub.
- Compose from Inbox, from an order ticket, or from a customer profile.
- Customers can reply to chef messages and can also initiate from the order confirmation page (linked in pickup reminders).
- Chef can disable inbound chat in Settings → Chat.
- Unread state shown by red dot on Inbox; if chef isn't active in portal, they get a text alert.
- Customers receive both **text and email** when chef messages them.

### Text blasts
- Sent from Inbox → **Blast**.
- **Audience presets**: All subscribers, New customers, Inactive customers, Loyal customers, Never ordered.
- Compose with a Hotplate URL (only Hotplate URLs allowed for security).
- Order-scoped blast: Orders tab → 3 dots → Text Blast (sends to filtered orders, e.g., to notify pickup time changes).
- Preview shown before send.

### SMS troubleshooting (signals)
- Customers unsubscribe by replying `UNSUB [storefront name]`.
- Customers blocked from a number recover by texting `START` to **+18338474370** (Hotplate's shortcode/long-code).
- Drop text fires **once per drop**; re-opening a drop does not re-send.

### Automated text reminders (full lifecycle)
**To customers:**
- ⏰ **Drop text** — right before orders open. To: all subscribers.
- ⏳ **Orders close reminder** (optional) — to subscribers who haven't ordered yet.
- ✅ **Order confirmation** — immediately after checkout (also email).
- 📦 **Pickup reminders**: customers may receive 2 of 3 — **24h**, **2h**, **15min** before pickup.
- ⭐ **Review request** (optional) — 24h after pickup.

**To chef:**
- 30 min before drop goes live.
- "You just got an order!" on each new order.
- "You have N unread messages" when chef is away.

**Customization**: defaults set in Settings → Reminders. Per-drop drop text override on the drop's Summary tab. Drop text duplicates with the drop.

### Customer list
- Customers tab; anyone who's ever ordered + anyone subscribed to SMS.
- Subscribed customers have a green checkmark.
- SMS-only subscribers (no order yet) only show phone number.
- Chef cannot directly add subscribers — they share the SMS sign-up link or customers click "Never miss a drop" on storefront.
- Customer import via emailing CSV to support.
- Manual unsubscribe: Customers tab → 3 dots → Manage subscriptions → Unsubscribe.
- Customers cannot be **fully deleted** — only unsubscribed.

### Reviews
- Always tied to a real order; one per order.
- Customer provides 1–5 star rating (required), optional comment, photo, and per-item thumbs up/down (likes/dislikes private to chef).
- Chef approves/hides each review; can **feature up to 3** at the top of storefront.
- Reviews appear below current drops on storefront.
- Settings → Reviews: Enable, Automatically approve, Send review request text 24h after pickup, optionally only to customers who haven't reviewed before.

## 6. New Portal FAQs (UI redesign launched 3/9/26)

Hotplate redesigned their portal in March 2026; these articles document the navigation changes. Useful as a real-world example of a portal information architecture.

### Top-level nav (inferred from articles)
**Drops, Items, Orders, Prep, Inbox, Customers, Discounts, Reviews, Insights, Payout (`/transactions`), Settings.**

### Payouts (new portal)
- Located at `portal.hotplate.com/transactions`. Also accessible from Settings.
- Top of Payout tab → **Manage** opens grouped controls:
  - **Balance**: Manual payout, Instant payout (fee-based, if bank supports), Set up automated payouts (daily/weekly/monthly).
  - **Accounts**: Manage bank accounts, set default.
  - **History**: Export transactions, Export payouts.
- Visibility gated on completed Stripe setup + admin role.

### Links (new portal)
Three link types:
- **Storefront link** (`hotplate.com/{username}`) — for bios, evergreen.
- **SMS sign-up link** — for posters/business cards/inviting subscribers.
- **Drop-specific link** — Share button on individual drop, for launch posts.
- Both general links available in Settings → link button → copy or QR download.

### Duplicating drops (new portal)
- Now via **Create a drop** in top right of Drops page (used to be 3-dot menu).
- Choose source drop → **Duplicate as is** or **Duplicate +1 week**.
- Completed drops can also be duplicated from inside the drop.
- Always edit drop title + drop text before re-publishing.

### Prep tab vs Pickup report (significant model split)
The most consequential UX change in the new portal:
- **Old portal Prep** combined planning totals + fulfillment progress in one screen — Hotplate found this confusing.
- **New portal Prep** = pure planning totals: how many of each item to make. Does NOT update as orders are marked packed/done.
- **New portal Pickup report** = fulfillment tracker: opened from Orders → graph button. Tracks packed/done/pending status per order/item.
- Recommended workflow: use Prep before production; use Pickup report during fulfillment; filter before printing.

### Editing orders (new portal)
- Same flow (Edit button → notes/items/fulfillment).
- Critical: chef **cannot change customer name/email/phone** — customer must update at next checkout, or chef emails support.

### Reports (new portal navigation)
- Transaction history: Payout tab or Settings → History → Export.
- Order export: Orders → filter → Export via 3 dots.
- Item-level: **Insights** has charts; **Prep list** has a flat list; **Orders export** has sales data.

### "Where did things move" (mini map)
- Customize storefront → **Settings → Storefront**.
- Send a text blast → **Inbox → Blast**.
- Item packed/done report → **Orders → graph button → Pickup report**.

## 7. Reports

### Item-level sales
Two paths:
- **Insights tab → Items Sold chart** with Overview/Drop toggle and date-range picker.
- **Orders tab → Filter → Export orders CSV** with "Export items as columns" toggle. Customer aggregates via SUM in their spreadsheet of choice.

### Fee report (transaction history)
- Payout tab → Filter date range → Download CSV.
- Spreadsheet has 4 fee columns broken out (Customer Payment Processing, Chef Payment Processing, Customer Hotplate Fee, Chef Hotplate Fee). Defaults leave two of them at $0.

### 1099-K
- Hotplate issues a Form **1099-K** via Track1099 when chef processes ≥$20K AND ≥200 transactions (federal) — or meets a state-specific lower threshold (MD/MA/VT/VA $600; IL $1,000+4 txns).
- Sent by Jan 31; tax info collected via Stripe (EIN or personal).
- 1099-K reflects **dollars processed** (incl. tip, tax, fees) — not chef payout. External (cash/Venmo/Zelle) payments are excluded.

## 8. Settings

### Storefront URL / username
- URL is `hotplate.com/{username}`. Editable in Settings → Account → Update storefront URL.
- Username rules: ≥3 chars, lowercase letters/numbers/`_`/`.`. Availability check.
- After change: 30-day forwarding from old username; QR codes pointing at old URL break after 30 days.
- Username changes capped at **once per 7 days**.
- Hotplate warns about SEO impact.

### Storefront customization
- Settings → Storefront, with tabs: **Colors / Logos & bio / FAQs & links / Misc**.
- Live preview pane (desktop + mobile toggles).
- **Theme presets** + custom hex colors, gradient picker, and a "extract palette from logo" suggestion (chef uses external tool).
- Bio sits below banner image.
- FAQs section: Hotplate strongly recommends publishing refund/cancellation policy here.
- High-conversion checklist: brand-aligned colors, transparent-bg horizontal logo PNG, high-quality banner, short bio, social links.

### Team members
- Settings → Account → Team → +Invite member.
- Invitee gets login by **phone number** (not email).
- **Granular permissions** (per-tab): Customers, Drops, Inbox, Insights, Order exporting, Orders, Reviews, Transactions, Settings.
- Admin = phone that first created account (only support can change).
- Limitations: chef can't grant "new order" SMS to teammates self-serve; **Inbox notifications are admin-only**.

### Off-platform payments (cash / Venmo / Zelle)
- Settings → Checkout → External payments → Update.
- Per-method on/off with required **Payment Instructions** field (e.g., Venmo handle).
- Customer flow: pick external payment at checkout; instructions appear on order confirmation; chef must hit **Confirm Payment** later (irreversible).
- Fees: no Stripe processing fee. Hotplate fee still deducted from chef payout balance, customer pays the chef their portion via the same channel.
- Cannot refund external orders inside Hotplate — chef handles outside.
- Cannot enable for specific drops only — storefront-wide setting.
- Gift cards **cannot** be bought with cash/Venmo/Zelle (anti-fraud).
- Loyalty points only awarded after chef confirms payment.

### Sales tax (3-tier model)
Three rate scopes resolved in priority order: **Item > Location > Global**.
- **Global tax rate** — Settings → Tax → Default → Update.
- **Location tax rate** — set on a pickup location.
- **Menu item tax rate** — including a "Tax Exempt" option.
- Hotplate **collects** but does not file/remit tax for the chef.
- Worked example in the article shows the resolution logic clearly (sandwiches exempt, drinks fall to location, t-shirts override with item-level rate).

### Loyalty points
- Settings → Loyalty → Enable.
- Accrual rate: 3–10 points per $1 spent (configurable). Built-in preview tool.
- Minimum balance to redeem (gates redemption to encourage repeat).
- **Bonus types**:
  - **Repeat order bonus** — N points every Mth order.
  - **New subscriber bonus** — one-time credit on signup.
  - **Referral bonus** — points when a referred friend completes an order.
  - **Manual adjustments** — chef adds/deducts from a customer profile.
- Customers see balance + redemption option at checkout, and progress to next bonus on order confirmation.
- Redeeming partial points still earns points on remaining purchase.
- Points stack with discounts and gift cards.
- Points are **storefront-specific** (do not transfer across Hotplate sellers).
- Points **never expire**, remain redeemable even if loyalty is turned off.
- For external payments, points awarded only after chef confirms payment.

## 9. Payouts

### Stripe onboarding
- Hotplate uses **Stripe Connect** for payments + payouts.
- Onboarding from Payout tab or Settings → "Get started with Stripe".
- EIN (company) or no-EIN (individual) branch; collects business or personal details and may request document upload for verification.
- Bank account linked via Stripe's UI (search bank or manual routing/account number entry).

### Payout types
- **Standard payout** — manual click; transfers funds that have already settled. Funds typically arrive same business day.
- **Instant payout** — if bank supports it; ~30 minutes any time including weekends/holidays. **Stripe fee: 1.5% capped at $50, minimum $1.**
- **Automated payouts** — Daily / Weekly / Monthly cadence; Stripe pushes whatever is available.

### Balance breakdown
- **Total** = Processing + Ready to withdraw.
- **Processing** = funds still settling on customer cards.
- **Ready to withdraw** = available now via standard payout.
- Cutoff for processing = **midnight UTC** (full per-timezone table in the help articles).
- Orders before midnight UTC → available that day; after → next day (next business day for weekends/holidays).

### Negative balance
- Triggered by refunds exceeding balance, or off-platform orders where Hotplate fees are deducted from payout.
- Stripe may **debit the chef's bank account** 1–7 days later to settle the negative; can cause overdrafts if account is empty.

### Troubleshooting
- Settings → Payout → gear → Balance shows the breakdown.
- History shows pending/processing status messages.
- Common causes: in-flight processing, recent refunds, external orders.

---

## Synthesis: what Hotplate's product model tells us

### Core architectural concepts (the "domain model")

Reading across all 53 articles, the data model looks roughly like:

- **Storefront** (1 per chef account): username, branding, FAQs, social links, settings (chat, reviews, loyalty, tax, checkout/fee split, external payments, reminders, gift card toggle).
- **Drop** (many per storefront): basic info (open/close times, pickup windows, drop text), menu, options (visibility, checkout time, menu visibility, inventory visibility, gift card toggle), publish state (Public/Private).
- **Pickup Location** (reusable): linked to drops; can override tax rate.
- **Item** (global, reusable across drops): photo, name, description, base price, optional tax rate, optional special instructions field, option groups.
- **Option Group** (per item): Variation vs Modifier, rules (required, multiple selection, multi-of-same), per-option price delta, optional per-option inventory.
- **Drop Menu Item** = an Item placed in a drop with: drop-specific inventory, max per order, max per pickup time/day, section assignment.
- **Section** (per drop menu): can carry shared inventory across items.
- **Order**: customer, items + options, fulfillment type (pickup/delivery), location, time slot, payment type (card/external), packed flags per item, done state, notes, source (web/manual), discount applied, loyalty points used/earned.
- **Cart** (transient): TTL based on drop's checkout time setting; releases inventory on expiry.
- **Customer**: phone (primary key, can't change), name, email, subscription status, loyalty points balance, order history, new vs returning flag, order streak.
- **Discount Code**: scope (general / customer / drop), type (% / $), restrictions (max value, min subtotal, dates, max redemptions, customer rules).
- **Gift Card**: storefront-level or in-drop, balance-tracked, redeemed via discount code field at checkout.
- **Reminders/Automation**: SMS templates (drop text, order confirmation, pickup -24h/-2h/-15m, review request, etc.) with default/per-drop overrides.
- **Reviews**: tied 1:1 to an order; rating, comment, photo, per-item thumbs.
- **Loyalty**: earn rate, min redemption, repeat/subscriber/referral bonuses, manual adjustments.
- **Team Member**: phone-based login, granular tab permissions.
- **Payout**: Stripe Connect account, balance (processing + ready), standard/instant/auto schedule, transaction history, fee report, 1099-K.
- **Insights**: items sold chart, sales data over time.
- **Inbox**: 1:1 messages, text blasts (general or order-scoped) with audience presets.

### Operating principles Hotplate clearly believes

1. **Constrained windows beat always-on commerce** — drops with open/close times drive better repeat behavior and let kitchens plan production.
2. **Subscriber count is the #1 leading indicator** of success.
3. **Simplicity converts** — fewer menu items, fewer options, shorter bios, fewer fee-split tweaks.
4. **Urgency is engineered** — checkout timer, scarcity-by-default, sold-out as a marketing moment, no unlimited carts.
5. **SMS, not email, is the primary customer channel** — every workflow assumes texting.
6. **Hotplate eats the platform fee (kind of)** — chefs only pay processing; the customer covers the platform fee, by default.
7. **Manual on-demand setup is acceptable when self-serve is hard** (delivery, bundles) — they do it via support and ship a feature later.
8. **The chef should never do manual aggregation** — prep list, item totals, sales reports all auto-aggregate.
9. **Inventory is a multi-layered constraint problem** — multiple limit types, "strictest wins" rule.
10. **Mark "done" is a fulfillment milestone, not just a checkbox** — it triggers customer comms (order completed text).

### Notable product gaps Hotplate openly acknowledges

These are opportunities for our product to differentiate:

1. **No native subscriptions** — only documented workarounds.
2. **No native mobile app** — only PWA-ish.
3. **Self-serve delivery** is missing (manual config; per-drop, not global; no map zones, no courier integration).
4. **Bundles / "items within items"** — manual backend config; auto-component-deduction not self-serve.
5. **In-drop gift cards** behave inconsistently with storefront gift cards (no notifications, force pickup reminders).
6. **Customer profile edits** — chef can't update customer name/email/phone.
7. **Customer deletion** — not allowed; only unsubscribe.
8. **Inbox notifications are admin-only** — team members can't get alerts.
9. **External payments** are storefront-wide only, can't be drop-specific.
10. **Username changes break QR codes after 30 days** — minor but real.
11. **International support** — US-only.
12. **Old portal Prep was confusing** — they split into Prep + Pickup report only in March 2026.

### Pricing model details for the PRD

- Free to use; chef pays only payment processing.
- Default fee structure: 2.9% + $0.30 to Stripe (chef pays); 5% + $0.55 to Hotplate (customer pays).
- Fee split is configurable per chef.
- Hotplate fee is calculated on **pre-discount** subtotal (loophole when chef passes fee to customer).
- 1099-K issued via Track1099 above federal/state thresholds.

### What looks worth copying (initial product hypothesis)

- The drop-as-central-object model.
- Subscriber-first growth loop with SMS as primary channel.
- Real-time auto-aggregating prep list.
- Multi-layered inventory limits.
- Loyalty program with bonus types.
- Stripe Connect for payouts + Connect-style fee split.
- Per-drop "Additional options" toggles (visibility, checkout time, etc.).
- Public storefront FAQ + cancellation policy hosting.
- Reviews tied to orders.
- Granular team permissions.

### What looks worth doing differently

- **Native subscriptions** as a first-class product, not a workaround.
- **Native delivery** with map/radius zones and (optional) courier integration.
- **Real bundle / build-your-own** primitives in the data model.
- **Native mobile app** (or true PWA).
- **Inbox routing** for teammates beyond admin.
- **Per-drop external payment toggles**.
- **Customer profile edits** for chefs.
- **Cleaner gift card UX** (one model for storefront and in-drop).
- **International from day one** if our jurisdiction allows.

---

## Source URL inventory

(All URLs pulled from `help.hotplate.com/en/` index, April 2026.)

### Getting Started
- https://help.hotplate.com/en/articles/13730387-how-hotplate-works
- https://help.hotplate.com/en/articles/13730404-how-to-sell-out-your-first-drop
- https://help.hotplate.com/en/articles/13730442-switching-to-hotplate-from-another-system
- https://help.hotplate.com/en/articles/13730467-how-to-get-subscribers
- https://help.hotplate.com/en/articles/13730481-why-should-i-use-hotplate
- https://help.hotplate.com/en/articles/13730542-your-first-4-steps-on-hotplate

### FAQs
- https://help.hotplate.com/en/articles/13705481-what-kind-of-businesses-can-use-hotplate
- https://help.hotplate.com/en/articles/13705600-does-hotplate-support-international-customers
- https://help.hotplate.com/en/articles/13706687-can-i-offer-subscriptions
- https://help.hotplate.com/en/articles/13706751-does-hotplate-have-an-app
- https://help.hotplate.com/en/articles/13707328-understanding-hotplate-s-pricing

### Drops
- https://help.hotplate.com/en/articles/13720207-how-to-sell-gift-cards
- https://help.hotplate.com/en/articles/13720422-how-to-create-and-manage-menu-items
- https://help.hotplate.com/en/articles/14032945-how-to-set-up-menu-item-options
- https://help.hotplate.com/en/articles/13720517-how-to-set-up-assorted-boxes-and-bundles
- https://help.hotplate.com/en/articles/13720613-how-to-set-inventory-and-order-limits
- https://help.hotplate.com/en/articles/13729869-what-additional-options-can-i-set-up-for-my-drop
- https://help.hotplate.com/en/articles/14032751-how-to-request-delivery-set-up
- https://help.hotplate.com/en/articles/13730228-how-do-i-change-the-checkout-time-limit

### Orders and Prep
- https://help.hotplate.com/en/articles/13708607-getting-to-know-the-orders-tab
- https://help.hotplate.com/en/articles/13708925-how-to-edit-an-order
- https://help.hotplate.com/en/articles/13709228-how-to-refund-or-cancel-an-order
- https://help.hotplate.com/en/articles/13709480-how-to-create-a-discount-code
- https://help.hotplate.com/en/articles/13709527-getting-to-know-your-prep-list
- https://help.hotplate.com/en/articles/13709611-how-to-create-an-order
- https://help.hotplate.com/en/articles/13709635-how-to-print-your-order-tickets

### Customer Communication
- https://help.hotplate.com/en/articles/13709705-how-to-message-customers-through-hotplate
- https://help.hotplate.com/en/articles/13718368-how-to-text-blast-your-customers
- https://help.hotplate.com/en/articles/13718429-customers-aren-t-getting-texts-troubleshooting
- https://help.hotplate.com/en/articles/13719038-guide-to-automated-text-reminders
- https://help.hotplate.com/en/articles/13719661-understanding-your-customer-list
- https://help.hotplate.com/en/articles/13720086-guide-to-reviews

### New Portal FAQs
- https://help.hotplate.com/en/articles/14032279-where-are-payouts-in-the-new-hotplate-portal
- https://help.hotplate.com/en/articles/14039379-where-to-find-links-in-the-new-portal
- https://help.hotplate.com/en/articles/14041234-how-to-duplicate-a-drop-in-the-new-portal
- https://help.hotplate.com/en/articles/14032639-prep-list-vs-pickup-report-in-the-new-portal
- https://help.hotplate.com/en/articles/14032282-how-to-message-customers-in-the-new-portal
- https://help.hotplate.com/en/articles/14032288-how-to-edit-order-details-in-the-new-portal
- https://help.hotplate.com/en/articles/14032291-how-to-download-reports-in-the-new-portal
- https://help.hotplate.com/en/articles/14032293-where-did-things-move-in-the-new-portal

### Reports
- https://help.hotplate.com/en/articles/13706152-how-to-see-item-level-sales-data
- https://help.hotplate.com/en/articles/13708054-how-to-download-a-fee-report
- https://help.hotplate.com/en/articles/13730735-when-will-i-get-my-1099k-tax-form

### Settings
- https://help.hotplate.com/en/articles/13704989-how-to-change-the-name-of-your-storefront
- https://help.hotplate.com/en/articles/13730730-how-to-customize-your-storefront
- https://help.hotplate.com/en/articles/13731161-how-to-add-team-members-to-your-hotplate-account
- https://help.hotplate.com/en/articles/13772914-can-i-accept-cash-venmo-or-zelle
- https://help.hotplate.com/en/articles/13780051-how-to-set-sales-tax-rates
- https://help.hotplate.com/en/articles/13801591-how-to-reward-customers-with-loyalty-points

### Payouts
- https://help.hotplate.com/en/articles/14019853-how-to-payout
- https://help.hotplate.com/en/articles/13780039-what-happens-if-my-payout-balance-is-negative
- https://help.hotplate.com/en/articles/13962274-how-to-get-set-up-with-stripe
- https://help.hotplate.com/en/articles/14032280-why-is-my-payout-balance-0-negative-or-still-processing
