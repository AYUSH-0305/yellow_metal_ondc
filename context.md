# Context for whoever (or whatever agent) picks this up next

Written for Ayushman, or an AI agent working on his behalf — this explains the *why* behind recent changes, not just the *what* (that's `changelog.md`). Read this before changing anything in the areas below, so you don't redo or undo a deliberate call.

## What this session actually did

Backend (`backend/`): merged your `dev`-branch restructure (`3d09a69`, `b73f038`) into a clean branch, then fixed 7 specific things on top of it — auth on `/api/internal/*`, lead ID format, `updateLeadStatus` validation, `getLeads` pagination, the webhook retry sweep, dead code, rate limiting. Frontend (`frontend/`): added LeadDesk (the staff dashboard) into this repo as its own folder, alongside `backend/`. Full list in `changelog.md`.

## Decisions made, and the reasoning — please don't silently redo these

**`INTERNAL_API_KEY` is separate from `AARTHIKLABS_API_KEY`.** Reusing your existing `requireApiKey` pattern for `/api/internal/*` would have been simpler, but it conflates two different trust boundaries — AarthikLabs is an external partner, `/api/internal/*` is staff/dashboard access. Two keys, two env vars, same middleware shape. If you're tempted to consolidate these back into one key for simplicity: don't, that was a deliberate split.

**`updateLeadStatus`'s status validation is structural, not a hardcoded enum.** It checks the value is `UPPER_SNAKE_CASE` and non-empty, not that it's one of `['LEAD_CREATED', 'DISBURSED', ...]`. This is because the full status vocabulary isn't confirmed yet (see open questions below) — only `LEAD_CREATED` and `DISBURSED` are verified real. If you add a hardcoded enum here, make sure it's actually confirmed first, not guessed.

**Lead IDs are zero-padded 8-digit (`YMLEAD00128473`-style), matching AarthikLabs' example — but that's pattern-matching, not a confirmed spec.** Their actual API doc gives one example per endpoint, not a stated format rule. If AarthikLabs rejects this format for some reason, that's new information, not a sign the fix was wrong.

**The webhook retry-sweep (`retryPendingWebhooks`) is now actually scheduled** — a `setInterval` in `server.ts` calls it every 60s. It existed in your original code too, but was never wired to anything, ever (checked via `grep` across the whole history, not just this branch) — so it was silently dead. If you're refactoring `server.ts` and this scheduler looks like unnecessary complexity, it isn't — without it, a webhook that fails mid-retry never resumes after a restart.

**`offer.service.ts`, `lead.service.ts`, `utils/officers.ts` are deleted, not just unused.** They referenced pre-restructure field names and were failing `tsc --noEmit`. Nothing imported them. If you need that logic again (e.g. a real offer-computation engine, a real officer-assignment system), it needs rebuilding against the *current* schema, not resurrecting these files.

## Things this session deliberately did NOT do — and why

- **Did not invent a schema for non-accepted/expired leads** (Flow 4 in the sequence diagram — leads get pushed to us even without acceptance, but `leadCreationReq` requires `offer_accepted_at`). This needs your or Nishit's answer, not a guessed field.
- **Did not invent how Yellow Metal's LTV/rate/serviceability rules reach AarthikLabs.** The diagram shows them computing offers using "Yellow Metal rules" — no API for that exists in either doc. Don't build a config-sync endpoint speculatively; ask first.
- **Did not fix `scripts/sync-ondc-leads.ts`** (in `frontend/`) even though it's broken against the current schema — that's a real rewrite, not a small fix, and touches LeadDesk's side of things too.
- **Did not rotate the leaked API key** in commit `3d09a69`'s history. Can't — only whoever owns that key can.

## Things that are placeholders, not real, right now

Every credential in `backend/.env` is a `dev_*` placeholder: `AARTHIKLABS_API_KEY`, `INTERNAL_API_KEY`, `WEBHOOK_SECRET`, `GOLD_API_KEY`. `AARTHIKLABS_WEBHOOK_URL` points at a `webhook.site` test sandbox, not AarthikLabs' real endpoint. `GOLD_API_URL` is a deliberately fake unroutable URL so local dev always hits the hardcoded fallback rates. None of this is wired to anything real — don't treat test runs against these as validating real-world behavior.

## Where things live

- `changelog.md` — before vs. after, everything changed.
- `instructions.md` — full go-live checklist (decisions needed, real credentials needed, deployment).
- `backend/todobackend.md` — an earlier, backend-only version of the todo list (superseded by `instructions.md`, kept for history).
- `frontend/` — a **copy** of the `YellowMetal-LeadDesk` repo, not a git subtree/submodule. It can drift if both get edited independently — worth a real decision on which is the source of truth going forward.
