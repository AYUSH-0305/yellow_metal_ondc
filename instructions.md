# What's left to actually go live

Organized by who it depends on — some of this is just work, some of it needs an answer from someone before any code is written.

## Needs an answer from Ayushman/Nishit/Rahul before code can be written

1. **Non-accepted/expired leads don't fit the current API.** The sequence diagram (Flow 4) says AarthikLabs pushes a lead to us even when the borrower never accepted the offer — but the Lead Creation schema requires `offer_accepted_at`, so there's currently no way to represent that case. Needs a decision on what that payload looks like.
2. **How does AarthikLabs get our rate/LTV/serviceability rules?** The diagram shows AarthikLabs computing the offer using "Yellow Metal rules" — nothing in either doc shows how that config actually reaches them. Manual setup on their end? A config API we haven't built? Ask before assuming either way.
3. **What's the real status vocabulary?** We know `LEAD_CREATED` and `DISBURSED` are real. `updateLeadStatus` currently validates shape (`UPPER_SNAKE_CASE`) rather than a fixed list, specifically because the full set (rejected, in-branch-review, whatever else) isn't confirmed. Worth locking down once known, so bad values get caught properly instead of just structurally.
4. **The dashboard's own status vocabulary vs. LeadDesk's.** LeadDesk's `Lead.status` enum (`New`/`Contacted`/`Converted`/`Rejected`) doesn't match the backend's (`LEAD_CREATED`/`DISBURSED`/etc.) at all — the sync script currently just maps unknown values to `"New"`. Worth deciding if these should actually be the same vocabulary before more leads flow through both systems.

## Credentials/config that need real values, not dev placeholders

All of these currently have `dev_*`/placeholder values in `.env` — none of them are real:
- `AARTHIKLABS_API_KEY` — the real key AarthikLabs will send us.
- `AARTHIKLABS_WEBHOOK_URL` — currently a `webhook.site` test sandbox. Needs the real preprod/production URL from Nishit (the doc references `preprod.credit.aarthiklabs.com`, worth confirming that's the real target).
- `GOLD_API_URL`/`GOLD_API_KEY` — currently pointed at a fake unroutable URL for local dev (deliberately, so it falls back to hardcoded rates). Needs a real Gold Spot API subscription before launch, or the "live" rate is fiction.
- `INTERNAL_API_KEY` — fine as a stopgap key for now, but see the staff-auth item below.
- **Rotate the leaked key** — an earlier commit (`3d09a69`, before `b73f038` fixed it forward) has a real-looking hardcoded API key/URL fallback sitting in this public repo's history. If that key is real, it needs rotating regardless of the code fix — git history doesn't forget.

## Deployment (neither half of this is hosted anywhere yet)

- **Backend**: only runs locally (`localhost:8080`, local Docker Postgres). Needs: a host (Railway/Render/Fly/a VM — whatever the team already uses elsewhere), a real production Postgres (not the local Docker one), `prisma migrate deploy` run against it, all the env vars above set for real.
- **Frontend (LeadDesk)**: already linked to a Vercel project, but the database isn't provisioned there — it's still pointing at local Docker Postgres too. Needs a hosted Postgres (Vercel Postgres, Neon, Supabase — whatever's easiest to wire into the existing Vercel project) and the migrations run against it.
- **CORS**: backend's `cors()` is currently wide open (no origin restriction) — fine for local dev, worth locking to the actual frontend's real domain once both are hosted.

## Real engineering work, no external decision needed, just time

- **Fix `scripts/sync-ondc-leads.ts`.** It's built against the *old* backend schema (`distributor_ref_id`, `borrower_name`, `address`, `dob`, `ltv_pct`, and a `pagination` object shape) — none of which match the current backend anymore. This needs a real rewrite against the current field names, not a patch. This is the actual bridge between the two systems, so it's high priority once the status-vocabulary question above is answered (no point mapping fields twice).
- **Real staff auth for `/api/internal/*`.** The `INTERNAL_API_KEY` is explicitly a stopgap — one shared secret, no per-user accountability, no revocation without breaking every consumer. Whenever LeadDesk gets real staff accounts, this should become real session/token auth instead.
- **Nearest Branch API is a hardcoded stub.** Always returns the same Rajkot branch regardless of pincode. Needs a real branch directory + lookup before it's usable for anything beyond demos.
- **LeadDesk structural gaps**, deferred when the design system was applied: no real pagination on the leads table (renders everything client-side — fine at current volume, won't scale), filters are dropdown fields rather than the LMS doc's FilterPill chips, lead detail is a slide-over rather than the doc's centered Modal. None of these are broken, just not matching the reference design's exact component choices.
- **Auto-reject-after-5-working-days.** Scoped in an earlier session (LeadDesk-side, Vercel Cron, `New`-status leads only, Mon–Fri). Paused specifically on whether an auto-rejected AarthikLabs-sourced lead should also notify AarthikLabs via webhook — same open question as item 1 above, really.
- **A real Settings section**, if/when it's worth building: partner invite/management (Partners page is currently read-only, no way to add one) and lead-handling rules (once the auto-reject threshold is real, it needs a UI). Everything else discussed (staff accounts, notifications, branch management) can wait until there's enough of it to justify a dedicated page.

## Housekeeping

- `frontend/` in this repo is a **copy**, not a git subtree/submodule — it can drift from the canonical `YellowMetal-LeadDesk` repo if both get edited independently. Worth deciding whether that's fine (treat this repo's copy as the source of truth going forward) or whether it needs a real sync mechanism.
- Any *future* restructure should delete files it makes dead in the same commit — `offer.service.ts`/`lead.service.ts`/`utils/officers.ts` sat unused and uncompilable for two days before this pass caught it.
