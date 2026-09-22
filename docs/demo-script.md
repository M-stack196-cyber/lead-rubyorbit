# Demo Script

## 1. Open Frontend

- What to click: Open the frontend URL in the browser.
- What to explain: LeadRubyOrbit opens directly into the operational workspace.
- Business value: The team has a central place to manage outreach workflow status.
- Safety note: Confirm the demo environment is using `EMAIL_SEND_MODE=mock`.

## 2. Show Dashboard

- What to click: Click `Dashboard` in the sidebar.
- What to explain: The dashboard summarizes campaigns, leads, drafts, replies, notifications, pending actions, and recent activity.
- Business value: Leadership can see pipeline and operational health without digging through each campaign.

## 3. Show Campaigns List

- What to click: Click `Campaigns`.
- What to explain: Campaigns are listed with status and lead context so the team can manage outreach by campaign.
- Business value: Campaign-level organization keeps outreach structured and reviewable.

## 4. Open Campaign Detail

- What to click: Select a campaign from the list.
- What to explain: The detail view brings together campaign leads, drafts, sent history, replies, decisions, notifications, and timelines.
- Business value: Operators can work from one campaign command center instead of switching tools.

## 5. Show Campaign Leads

- What to click: Scroll to the campaign leads section or choose the leads view in the campaign detail.
- What to explain: Imported leads can be attached to campaigns and reviewed before outreach.
- Business value: The business can validate lead data before any outreach action.

## 6. Show Draft Workflow

- What to click: Open the draft section, select or create a draft, then show save, submit, approve, and reject controls.
- What to explain: Drafts move through a manual review workflow before they can be sent.
- Business value: Approval control reduces messaging mistakes and keeps the team aligned.
- Safety note: Approval does not automatically send an email.

## 7. Show Mock Email Sending

- What to click: Open the sending section and use the manual send control only in mock mode.
- What to explain: Mock sending records sent-email history without contacting real recipients.
- Business value: The team can demonstrate the full workflow safely before approving live outreach.
- Safety note: Keep `EMAIL_SEND_MODE=mock`; do not switch to live during the demo.

## 8. Show Gmail OAuth/Account Connection Status

- What to click: Click `Email Accounts` and show Gmail account status.
- What to explain: Gmail connection status is visible without exposing OAuth tokens.
- Business value: The business can confirm account readiness while keeping credentials protected.
- Safety note: Do not show `.env` files, OAuth secrets, access tokens, or refresh tokens.

## 9. Show Reply Monitoring Result

- What to click: Return to the campaign detail and open the replies section.
- What to explain: Manual reply monitoring can identify replies and attach them to campaign context.
- Business value: Replies become trackable business events instead of getting lost in inboxes.

## 10. Show Team Decisions

- What to click: Open the team decisions area in the campaign detail.
- What to explain: Replies and no-reply cases can be routed to manual decisions.
- Business value: The team can decide the next action with context and accountability.

## 11. Show No-Reply Handling

- What to click: Open the no-reply section and show manual no-reply review.
- What to explain: No-reply detection supports review after a timeout window.
- Business value: Leads that need follow-up can be identified without automatic outreach.
- Safety note: No follow-up is sent automatically.

## 12. Show Follow-Up Draft Cycle

- What to click: Open follow-up drafts and show review status.
- What to explain: Follow-up drafts are created for manual review and approval.
- Business value: The team can continue outreach while retaining human control.
- Safety note: Follow-up sending remains manual and mock-safe during the demo.

## 13. Show Notifications

- What to click: Click `Notifications`.
- What to explain: Notifications surface workflow items that need attention.
- Business value: Operators can prioritize decisions, replies, and follow-ups.

## 14. Show Dashboard Timeline/Activity

- What to click: Return to `Dashboard`, then show recent activity and timeline sections.
- What to explain: Activity records provide visibility into what happened across the workflow.
- Business value: The business gets traceability for campaign progress and team actions.

## 15. Show Production Readiness Docs

- What to click: Open `docs/phase-19-production-readiness.md`, `docs/phase-20-final-demo-preparation.md`, and `docs/final-project-summary.md`.
- What to explain: The project includes deployment safety notes, demo preparation, and handoff material.
- Business value: Stakeholders have a clear path from demo to production planning.
- Safety note: Real sending must be explicitly approved before live production use.
