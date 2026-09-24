# Changelog

Covers both halves of this repo — `backend/` (the AarthikLabs/ONDC integration service) and `frontend/` (LeadDesk, the staff dashboard).

## Backend

### Before (original build, commit `9516910`)
- 2 endpoints: Broadcast/Dedupe (mobile + gold weight → provisional offer) and Lead Push (nested `borrower{}` payload).
- `Lead` schema: `distributor_ref_id`, `borrower_name`, `address`, `dob`, `interest_rate_pct`, `tenure_months`, `ltv_pct`.
- Gold rate: a `DailyGoldRate` table, simulated via a mock "8AM cron" function — never real.
- `/api/internal/*` (dashboard-facing): no auth.
- Webhook dispatch: audit trail + retry/backoff, single hardcoded `AARTHIKLABS_WEBHOOK_URL`.

### Ayushman's restructure (`3d09a69`, `b73f038`) — rebuilt to match the real AarthikLabs spec
- 4 endpoints now: **Dedupe**, **Lead Creation**, **Nearest Branch** (new), **Lead Status** (new) — verified field-for-field against AarthikLabs' actual spec doc.
- `Lead` schema rebuilt: `loan_id`/`customer_id`, `name`, `address_line_1`/`address_line_2`, `date_of_birth`, `disbursement_amount`, `product_type`, `tenure`/`tenure_unit`, status vocabulary moved to `LEAD_CREATED`/`DISBURSED`.
- Gold rate: `DailyGoldRate` removed, replaced with a live external Gold Spot API call, with a hardcoded fallback rate if that call fails.
- A hardcoded API key fallback was briefly introduced then removed for security (`b73f038`) — the old key is still visible in that commit's history.
- Side effects of the rewrite (not the point of the commit, but real): `getLeads` lost pagination/filtering, `updateLeadStatus` lost its input validation.

### What we fixed/added on top of that, this pass
- **Auth on `/api/internal/*`** — was open to anyone. Added a separate `INTERNAL_API_KEY` (not reusing `AARTHIKLABS_API_KEY` — different trust boundary), constant-time comparison on both keys.
- **Lead ID format** — was unpadded random digits (`YMLEAD901224`, inconsistent length). Now zero-padded 8-digit (`YMLEAD87287788`, matching AarthikLabs' own example format), with a collision-safe retry loop on create.
- **`updateLeadStatus` validation restored** — was accepting any string as status with no checks. Now validates shape (non-empty, `UPPER_SNAKE_CASE`) plus the other body fields' types. Not a hardcoded status enum yet — the full vocabulary (rejected/expired leads) is still an open question, see `instructions.md`.
- **`getLeads` pagination restored** — was returning the entire table on every call, no filters. Restored `page`/`limit`/`status`/`pincode`, capped at 100/page.
- **Webhook retry-sweep restored, and actually scheduled** — the crash-recovery function existed in the original build but was *never wired to anything* (verified via `grep` — no `setInterval`/cron ever called it, even before the restructure). It's back, and `server.ts` now runs it every 60 seconds.
- **Dead code removed** — `offer.service.ts`, `lead.service.ts`, `utils/officers.ts` were unused after the restructure and were failing the project's own `tsc` typecheck. Deleted.
- **Rate limiting added** — 100 req/15min on both `/api/v1/*` and `/api/internal/*`. There was none before.
- **`.env.example` gaps fixed** — `GOLD_API_URL`/`GOLD_API_KEY` are required by the restructured code but were never documented; added, along with the new `INTERNAL_API_KEY`.
- **Two DB indexes** — `Lead.pincode` (used by `getLeads`' filter) and a composite `WebhookEvent(delivery_status, next_retry_at)` (used by the retry sweep) — added, reapplied after the restructure changed the schema shape.

## Frontend (LeadDesk)

- **Design system applied** — full re-theme to match the Yellow Metal LMS design system: colors, Manrope font, spacing/radius, button/card/badge shapes. Previously a gold/amber Material Design 3 theme with Geist.
- **Real bugs found and fixed during/after the redesign**: a sidebar flex-overflow bug that scrolled the entire page (including the sidebar) horizontally; stat-card label misalignment when labels wrap to different line counts; a systemic top-padding regression across 13 `CardContent` usages (an artifact of the redesign, not pre-existing); client-side count-up/bar-grow animations that replayed on every navigation and were the actual cause of reported "lag" (removed — numbers render instantly now).
- **Switched off demo mode** — was serving in-memory example data. Now reads/writes the real local Postgres DB.
- **Backend integration bridge** — `scripts/sync-ondc-leads.ts` + a `distributorRefId` field pull leads from the backend's `/api/internal/leads` into LeadDesk's own DB. Built two sessions ago; **now needs a rework** — the backend restructure changed every field name it depends on, and it doesn't send the new auth header's actual production value. See `instructions.md`.
- **This repo now contains the frontend too** — added as `frontend/`, alongside `backend/`, so both halves of the platform live in one place.

---

*Everything above is grounded in this session's actual work — code read directly, commits read directly, endpoints tested directly (not summarized from memory).*
