# LeadRubyOrbit

LeadRubyOrbit — AI-Assisted Lead Outreach & Follow-up Management System

## Overview

LeadRubyOrbit is planned as a lead outreach and follow-up management platform for teams. Future phases will support lead uploads, workflow syncing, email draft approval, sending, reply checks, follow-up pausing, notifications, and team decisions.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- UI: Tailwind CSS + shadcn/ui
- Icons: Lucide React

## Phase 0 Scope

Phase 0 establishes the project foundation only:

- React/Vite frontend scaffold
- Tailwind CSS and shadcn/ui-style component setup
- Professional SaaS dashboard shell
- Express backend scaffold
- `/api/health` backend route
- Frontend API service for backend health status
- Environment example files

Business logic will be added in later phases. This phase intentionally does not include database setup, authentication, lead upload, GHL integration, AI, email sending, reply checking, follow-ups, notifications, or workers.

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

## Verify Phase 0

1. Start the backend with `npm run dev` from `backend/`.
2. Start the frontend with `npm run dev` from `frontend/`.
3. Open `http://localhost:5173`.
4. Confirm the dashboard loads and the backend connection status shows the health service as online.
5. Visit `http://localhost:5000/api/health` and confirm the JSON response.
