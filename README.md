# LeadRubyOrbit

LeadRubyOrbit — AI-Assisted Lead Outreach & Follow-up Management System

## Overview

LeadRubyOrbit is planned as a lead outreach and follow-up management platform for teams. Future phases will support lead uploads, workflow syncing, email draft approval, sending, reply checks, follow-up pausing, notifications, and team decisions.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: Supabase PostgreSQL
- UI: Tailwind CSS + shadcn/ui
- Icons: Lucide React

## Phase Status

- Phase 0 completed: project foundation, dashboard shell, Express API, health route, and environment examples.
- Phase 1 completed: Supabase PostgreSQL schema migration, schema documentation, and backend database configuration placeholders.
- Phase 2 completed: multi-format lead upload, validation, preview, and import flow.
- Phase 3 completed: campaign management foundation with campaign CRUD, imported lead listing, and campaign lead attachment.
- Phase 4 completed: GoHighLevel integration foundation with mock-mode campaign lead sync.
- Phase 5 completed: email draft creation foundation with manual drafting, editing, approval, and rejection.

## Phase 0 Scope

Phase 0 establishes the project foundation only:

- React/Vite frontend scaffold
- Tailwind CSS and shadcn/ui-style component setup
- Professional SaaS dashboard shell
- Express backend scaffold
- `/api/health` backend route
- Frontend API service for backend health status
- Environment example files

## Phase 1 Scope

Phase 1 adds the database foundation only:

- Initial schema migration at `backend/db/migrations/001_initial_schema.sql`
- Schema documentation at `backend/db/SCHEMA.md`
- Backend Supabase/PostgreSQL config placeholders
- Environment variable examples for Supabase and PostgreSQL

Later phases will add outreach execution workflows. The current project intentionally does not include authentication, AI, email sending, reply checking, follow-ups, notifications delivery, or workers.

## Phase 2 Scope

Phase 2 adds the lead upload module only:

- Multi-format parser support for CSV, XLSX/XLS, JSON, TXT, DOC/DOCX, and PDF
- Lead row normalization, validation, duplicate detection, and preview JSON storage
- Supabase-backed upload metadata and confirmed lead import
- Lead Uploads frontend page with upload, preview, summary, and confirm import controls

## Phase 3 Scope

Phase 3 adds the campaign management foundation only:

- Campaign CRUD APIs backed by the existing `campaigns` table
- Campaign lead attachment backed by the existing `campaign_leads` and `leads` tables
- Duplicate campaign-lead prevention for the same campaign and lead
- Simple imported leads API for attaching leads to campaigns
- Campaigns frontend page with list, create form, detail section, status badges, lead counts, and lead attachment controls

Phase 3 intentionally does not implement GHL, AI email generation, email sending, reply checking, follow-ups, authentication, or notification workflows.

## Phase 4 Scope

Phase 4 adds the GoHighLevel integration foundation only:

- GHL settings status API with `mock` and `live` modes
- Mock GHL client that simulates contact creation and workflow enrollment
- Campaign lead sync, retry failed sync, and sync status APIs
- Campaign-specific sync fields on `campaign_leads`
- Campaign detail UI section for mock/live status, sync controls, summary cards, and sync rows

Mock mode is the default and does not require real GoHighLevel credentials. No real GoHighLevel contacts or workflow enrollments are created in mock mode.

Live mode is scaffolded only. Real live sync requires `GHL_PRIVATE_INTEGRATION_TOKEN`, `GHL_LOCATION_ID`, and `GHL_WORKFLOW_ID`; if any are missing, the backend returns a clear error.

### GHL Environment Variables

```bash
GHL_MODE=mock
GHL_PRIVATE_INTEGRATION_TOKEN=
GHL_LOCATION_ID=
GHL_WORKFLOW_ID=
GHL_API_BASE_URL=https://services.leadconnectorhq.com
```

Phase 4 intentionally does not implement AI email generation, email sending, reply checking, follow-ups, authentication, or notification workflows.

## Phase 5 Scope

Phase 5 adds the email draft creation foundation only:

- Manual email draft APIs backed by the existing `email_drafts` table
- Draft creation, editing, approval, and rejection
- Campaign email draft listing with lead and campaign-lead context
- Campaign detail UI section for draft status summaries, draft table, create/edit form, and approval controls

Draft statuses are `draft`, `saved`, `approved`, and `rejected`. Phase 5 does not send emails. AI draft generation is not implemented yet.

## API Endpoints

### Health

- `GET /api/health`

### Lead Uploads

- `POST /api/lead-uploads/upload`
- `GET /api/lead-uploads/:id/preview`
- `POST /api/lead-uploads/:id/confirm`

### Campaigns

- `GET /api/campaigns`
- `POST /api/campaigns`
- `GET /api/campaigns/:id`
- `PATCH /api/campaigns/:id`
- `POST /api/campaigns/:id/leads`
- `GET /api/campaigns/:id/leads`
- `GET /api/campaigns/:campaignId/email-drafts`

### Leads

- `GET /api/leads`

### GHL

- `GET /api/ghl/settings/status`
- `POST /api/ghl/campaigns/:campaignId/sync`
- `POST /api/ghl/campaigns/:campaignId/retry-failed`
- `GET /api/ghl/campaigns/:campaignId/sync-status`

### Email Drafts

- `GET /api/email-drafts`
- `POST /api/email-drafts`
- `GET /api/email-drafts/:id`
- `PATCH /api/email-drafts/:id`
- `POST /api/email-drafts/:id/approve`
- `POST /api/email-drafts/:id/reject`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` by default.

## Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs at `http://localhost:5000` by default.

## Database Migration

The database migrations are located at:

```bash
backend/db/migrations/001_initial_schema.sql
backend/db/migrations/002_ghl_sync_fields.sql
backend/db/migrations/003_email_draft_fields.sql
```

Apply these SQL migrations in a Supabase PostgreSQL project when you are ready to create or update the schema. Do not commit real `.env` files or secrets.

## Verify Phase 0

1. Start the backend with `npm run dev` from `backend/`.
2. Start the frontend with `npm run dev` from `frontend/`.
3. Open `http://localhost:5173`.
4. Confirm the dashboard loads and the backend connection status shows the health service as online.
5. Visit `http://localhost:5000/api/health` and confirm the JSON response.
