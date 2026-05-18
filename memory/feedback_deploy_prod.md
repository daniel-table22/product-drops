---
name: Always deploy to production
description: Daniel always wants vercel --prod, never preview deploys
type: feedback
---

Always deploy with `vercel --prod`. Do not deploy to preview, do not ask for confirmation before deploying to production.

**Why:** Daniel's explicit instruction — he always wants production deploys.

**How to apply:** Any time code changes are ready to deploy, run `vercel --prod` directly without asking.
