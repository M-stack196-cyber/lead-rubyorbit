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

Later phases will add outreach execution workflows. The current project intentionally does not include authentication, GHL integration, AI, email sending, reply checking, follow-ups, notifications delivery, or workers.

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

### Leads

- `GET /api/leads`

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

The Phase 1 database migration is located at:

```bash
backend/db/migrations/001_initial_schema.sql
```

Apply this SQL in a Supabase PostgreSQL project when you are ready to create the schema. Do not commit real `.env` files or secrets.

## Verify Phase 0

1. Start the backend with `npm run dev` from `backend/`.
2. Start the frontend with `npm run dev` from `frontend/`.
3. Open `http://localhost:5173`.
4. Confirm the dashboard loads and the backend connection status shows the health service as online.
5. Visit `http://localhost:5000/api/health` and confirm the JSON response.
