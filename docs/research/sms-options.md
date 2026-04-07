# SMS options for the product-drops MVP

Reference doc for scoping how we handle SMS (drop alerts, blasts, reminders) for launch. Structured so it can be turned into a Whimsical flowchart or decision tree.

---

## The core constraint: A2P 10DLC

Before getting into options, it's important to understand why "just use Twilio" isn't a one-day decision.

**A2P 10DLC** (Application-to-Person, 10-Digit Long Code) is a US carrier requirement — not a Twilio-specific thing — that any business sending SMS to US phone numbers from a standard 10-digit number must register:

1. Their **brand** (the legal entity sending messages) with The Campaign Registry (TCR)
2. Each **campaign** (use case, e.g. "drop announcements", "order confirmations") with TCR
3. Undergo carrier vetting that produces a "trust score", which gates throughput

**Cost:** ~$4 brand registration + $10/month per campaign + per-message surcharges.
**Timeline:** 1–4 weeks end-to-end for long-code registration.
**Consequence of skipping:** Carriers will filter or block your messages, and Twilio will eventually suspend the sending number.

This requirement applies to **every provider** that uses US long codes: Twilio, Telnyx, Bandwidth, MessageBird, Sinch, Plivo. Switching providers does not dodge it.

**However**, there are two faster-to-launch paths that avoid 10DLC long-code bureaucracy: **toll-free SMS** and **short codes**. We'll cover both below.

---

## The options

### Option 1: Twilio toll-free SMS (recommended for MVP)

**What it is:** Use a Twilio toll-free number (e.g. 1-833-xxx-xxxx) instead of a 10-digit long code. Toll-free has its own verification process, separate from 10DLC.

- **Setup time:** 1–5 business days for toll-free verification
- **Cost:** $2/month for the number + $0.0075/message outbound + ~$0.004 inbound
- **Throughput:** 3 messages/second baseline, verified TFNs scale higher. Enough for hundreds of messages per blast at launch-partner volumes.
- **What we build:** Standard Twilio API integration. Webhooks for inbound replies and delivery status.
- **Gotchas:** Toll-free verification requires submitting sample message content, opt-in language, and the customer-facing storefront URL. Reject rate is low if you have a real opt-in flow.
- **Fit for MVP:** Strong. Fastest path to automated SMS with minimal ceremony.

### Option 2: Twilio long code + A2P 10DLC

**What it is:** The "normal" path — a regular 10-digit local number with full 10DLC registration.

- **Setup time:** 2–4 weeks
- **Cost:** $1/month number + $4 brand + $10/month campaign + $0.0075/message + per-message 10DLC fees ($0.004 ish)
- **Throughput:** Depends on trust score. Low trust = heavily rate-limited, high trust = hundreds/sec.
- **What we build:** Same Twilio integration as option 1, plus paperwork for brand and campaign registration.
- **Fit for MVP:** Poor for launch. Good for post-launch once we know volume justifies it. Looks "local" to customers, which some prefer.

### Option 3: SMS marketing SaaS (SimpleTexting, EZ Texting, Textedly, Attentive)

**What it is:** Web-based SMS marketing tools where the partner logs in and sends blasts manually. Vendor handles 10DLC.

- **Setup time:** Days (vendor handles registration).
- **Cost:** $30–$100/month per partner, depending on volume.
- **What we build:** **Almost nothing.** Maybe a CSV export of opted-in phone numbers from our portal so partners can import their list.
- **Tradeoff:** We don't own the SMS data, can't build segmentation or analytics around sends, and partners have to learn another tool.
- **Fit for MVP:** Viable if we want zero SMS work. But it means giving up control over what is arguably the most important channel for drop businesses.

### Option 4: WhatsApp Business API (via Twilio or 360dialog)

**What it is:** Send messages over WhatsApp instead of SMS. No 10DLC equivalent. Richer media (images, buttons, order cards).

- **Setup time:** 1–2 weeks for Meta Business verification
- **Cost:** Per-conversation pricing (~$0.01–$0.08 per conversation depending on country/type)
- **What we build:** WhatsApp integration via Twilio's WhatsApp sandbox initially, then production.
- **Fit for MVP:** Only a fit if our launch partners' customers are WhatsApp-native. In the US food context that's uncommon unless the partners serve specific communities. Worth asking partners.

### Option 5: No SMS — email only (via Resend)

**What it is:** Replace SMS entirely with transactional email for the MVP. Drop-live alerts, order confirmations, pickup reminders, all email.

- **Setup time:** Hours
- **Cost:** Free at launch volumes (Resend: 3k emails/month free)
- **What we build:** Resend integration + React Email templates for each notification.
- **Tradeoff:** Email open rates ~20% vs SMS ~95%. Conversion on "the drop is live, buy now" messages will be meaningfully worse. But it's free and shippable in a day.
- **Fit for MVP:** Good as a fallback or belt-and-suspenders layer. Risky as the only channel if drops rely on urgency.

### Option 6: No SMS build — partners use their existing channels

**What it is:** Don't build any notification channel. Instead, give partners a shareable drop URL and let them announce via their existing Instagram, TikTok, email list, or SMS tool.

- **Setup time:** Zero
- **Cost:** Zero
- **What we build:** A clean share surface on the drop page (QR code, share buttons, pre-filled copy).
- **Tradeoff:** Notification quality depends entirely on the partner's existing audience. No automated reminders.
- **Fit for MVP:** Surprisingly viable if launch partners already have strong Instagram followings (which many food pop-ups do). Saves weeks of work. Can be combined with option 5 for automated order confirmations.

---

## Recommended path for MVP

A layered approach, not a single pick:

1. **Day one:** Start Twilio toll-free number verification (fire and forget, 1–5 days).
2. **Week one:** Build Resend transactional email integration. Order confirmation, receipt, pickup reminder all work over email from day one. No regulatory risk.
3. **Once toll-free is verified:** Layer in Twilio for the time-critical "drop is live" blast, because this is where SMS open rates actually matter. Everything else can stay on email.
4. **Also from day one:** Build good shareable drop URLs (with OG images, pre-filled share copy, QR codes) so partners can announce via their own channels regardless of what we automate.
5. **Post-launch:** If volume justifies it, graduate from toll-free to 10DLC long codes for the "local number" feel. Or add WhatsApp if partner customer bases are WhatsApp-heavy.

Avoid for MVP: 10DLC long codes (too slow), SMS marketing SaaS (gives up the channel), building WhatsApp speculatively.

---

## Decision tree (for diagram)

```
Start
  │
  ├── Do launch partners have strong existing social channels (Instagram, etc.)?
  │     ├── Yes  → Build shareable drop URLs first, layer SMS on later
  │     └── No   → SMS is critical from day one
  │
  ├── Is urgency a core driver (last-minute drop alerts)?
  │     ├── Yes  → SMS required. Go Twilio toll-free for fast start.
  │     └── No   → Email-only via Resend is enough for MVP
  │
  ├── Twilio toll-free path
  │     ├── Start verification day one
  │     ├── 1–5 business days to approval
  │     ├── Ship automated drop-live blasts
  │     └── Graduate to 10DLC post-launch if volume demands
  │
  └── Always layer
        ├── Resend email for non-urgent notifications
        ├── Shareable drop URLs for partner-driven announcements
        └── Opt-in capture at checkout so the subscriber list grows from day one
```

---

## Comparison matrix (for diagram)

| Option | Setup time | Build effort | Monthly cost | Per-message cost | Throughput | Fit for MVP |
|---|---|---|---|---|---|---|
| Twilio toll-free | 1–5 days | Medium | ~$2 + fees | $0.0075 | 3 msg/s+ | **Recommended** |
| Twilio 10DLC long code | 2–4 weeks | Medium | ~$15 + fees | $0.0075 + $0.004 | Varies by trust score | Post-launch |
| SMS SaaS (SimpleTexting etc.) | Days | Near zero | $30–100/partner | Included | Vendor-dependent | Fallback |
| WhatsApp Business API | 1–2 weeks | Medium-high | Low | $0.01–0.08/conv | High | Only if partners' customers are WhatsApp-native |
| Resend email only | Hours | Low | Free | Free at scale | Unlimited | Belt-and-suspenders layer |
| Share URLs / no build | Zero | Zero | Zero | Zero | N/A | Works if partners have audience |

---

## Terms / glossary (for diagram notes)

- **A2P 10DLC:** Application-to-Person, 10-Digit Long Code. US carrier program that regulates business SMS from standard phone numbers.
- **TCR:** The Campaign Registry. The industry body that approves brand and campaign registrations for 10DLC.
- **Trust score:** A number assigned to a registered brand that determines SMS throughput caps. Higher trust = more messages per second.
- **Toll-free number (TFN):** A 1-8xx number. Has a separate, faster verification process and is exempt from 10DLC. Good for blasts.
- **Short code:** A 5–6 digit number (e.g. 12345). Best deliverability and throughput, but months to provision and thousands of dollars to set up. Not an MVP option.
- **Opt-in:** Customer's explicit consent to receive SMS, required for legal compliance (TCPA in the US).
- **STOP/UNSUB:** Keywords that must unsubscribe a customer. Twilio and other providers handle this automatically.
