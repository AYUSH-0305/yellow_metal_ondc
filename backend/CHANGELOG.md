# Changelog

All notable changes to this backend are recorded here.

## [Unreleased] — 2026-09-22

### Added
- Local dev Postgres provisioning: `docker-compose.yml` (port 5434, db `yellowmetal`), plus a local `.env` (gitignored, dev placeholder values) — this repo had no DB provisioning before, so it couldn't be run locally.
- Verified end-to-end locally: pushed a synthetic lead through `POST /api/v1/leads`, confirmed it's readable via `GET /api/internal/leads`, and synced into the LeadDesk dashboard (see `YellowMetal-LeadDesk/scripts/sync-ondc-leads.ts`, a separate repo).

### Fixed
- `Lead`: added `@@index([pincode])` — `getLeads()` filters on `pincode` but it had no index.
- `WebhookEvent`: replaced two separate single-column indexes (`delivery_status`, `next_retry_at`) with one composite `@@index([delivery_status, next_retry_at])`, matching the only query that filters on both together (`retryPendingWebhooks()`). No other query filters `next_retry_at` alone, so the composite fully subsumes the old pair.
  - Commit: `1ffd761` on `dev`. Applied to the local DB via `prisma db push`, not yet pushed to GitHub.

### Known gaps (not yet fixed — deferred to land with the AarthikLabs sample JSON)
- `/api/internal/*` has no auth (`src/routes/internal.routes.ts`) — `getLeads`, `getLeadById`, `updateLeadStatus` are all open.
- `offer.service.ts` doesn't call the existing `goldRate.service.ts` — uses a hardcoded rate instead of the live one.
- Full findings, security review, and DB analysis: `YellowMetal-LeadGen/YELLOW_METAL_ONDC_BACKEND_AUDIT.md` (and `.pdf`).

---

## Remaining / TODO

### Blocked on external input
- **AarthikLabs sample JSON payload + real webhook URL** — expected EOD from Nishit. `AARTHIKLABS_WEBHOOK_URL` currently points at a webhook.site test sandbox.
- **DSA agent-routing app integration** — Rahul's separate app for pincode-based loan-application assignment. Nothing confirmed yet: no webhook URL, no payload schema, no auth mechanism. The one blocking question: does the agent app do pincode→agent assignment itself (thin webhook POST from us) or do we need their agent/pincode directory on our side (a real integration, not just a POST)?
- **`distributor_ref_id` stability** — dedupe/idempotency logic keys off this field from AarthikLabs; not yet confirmed with Nishit that it's stable/unique long-term.

### Security (from the audit, not yet fixed)
- Add session auth to `/api/internal/*` (highest priority — currently wide open).
- `GET /api/internal/leads`: validate `status`/`pincode` query params, bound `page`/`limit` (currently unvalidated `parseInt`, no ceiling).
- Make the `x-api-key` check constant-time (`crypto.timingSafeEqual`) instead of `!==`.
- Add rate limiting — no `express-rate-limit` or equivalent anywhere yet.
- Standardize error response envelope (`not_found` vs `validation_failed` currently return different shapes).

### Architecture
- **Schema reconciliation** — LeadDesk (camelCase, own DB) and this backend (snake_case, own DB) are still two independent `Lead` tables. The manual `sync-ondc-leads.ts` script bridges them for now; a real decision on long-term source of truth is still open.
- **Webhook dispatch is single-target** — hardcoded to `AARTHIKLABS_WEBHOOK_URL`. Generalizing to a named multi-target list is designed (see audit §4) but not built — waiting until the agent-app's webhook details are confirmed.
- **Lead sync into LeadDesk is manual** — `npx tsx scripts/sync-ondc-leads.ts` has to be run by hand; not triggered automatically on webhook/status events yet.
- `offer.service.ts` → `goldRate.service.ts` wiring (listed above under deferred gaps).

### Housekeeping
- This repo's index-fix commit (`1ffd761`) is local only — not yet pushed to GitHub (shared repo with Ayushman, needs confirmation before pushing).
- `interest_rate_pct` and `tenure_months` exist in this backend's `Lead` model but have no equivalent column in LeadDesk yet, so the sync script currently drops them — decide if/when they need to surface on the dashboard.
