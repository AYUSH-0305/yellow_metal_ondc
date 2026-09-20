# YellowMetal Lead Generation Platform - Implementation Plan

This plan details the architecture and build phases for the YellowMetal production APIs (Broadcast/Dedupe, Lead Push, Status Webhook) and the internal Admin Dashboard.

## Architecture Decision: Decoupled (Backend + Frontend)

To keep the codebase clean, professional, and maintain separation of concerns, we are building two distinct systems that will live in separate folders:

1. **`backend/` (Node.js + Express)**: The core engine. It holds the Prisma ORM, connects to PostgreSQL, exposes the external APIs for AarthikLabs, exposes internal REST APIs for the dashboard, and runs the webhook dispatcher.
2. **`admin-dashboard/` (Next.js)**: A pure frontend UI. It has no direct database connection and relies entirely on fetching data from the backend.

---

### Phase 1: Backend Foundation (Node.js/Express)
- Initialize standard Node.js + Express + TypeScript repository.
- Setup Prisma ORM and `leads` database schema.
- Build internal REST APIs (e.g., `GET /internal/leads`) so the frontend has data to consume.

### Phase 2: Frontend Foundation (Next.js)
- Initialize Next.js + Tailwind CSS repository.
- Build the Dashboard UI components (Lead Listing, Details, Filters).
- Wire the UI to fetch data from the Express backend.

### Phase 3: AarthikLabs APIs (Inbound)
- Build `POST /api/v1/dedupe` (Broadcast & Quote Engine).
- Build `POST /api/v1/leads` (Lead Push with Idempotency).
*(Zod validation will be finalized once AarthikLabs provides exact JSON specs).*

### Phase 4: Webhook Dispatcher (Outbound)
- Integrate Upstash QStash into the Express backend.
- When an admin updates a status via the internal API, the backend queues the webhook task to notify AarthikLabs.

## Verification Plan
- **Backend Tests:** Postman collections testing the Express routes.
- **Frontend Tests:** Verify UI renders correctly using mock data from the backend.
- **End-to-End:** Sandbox AarthikLabs request -> hits Express API -> saves to DB -> appears in Next.js dashboard.
