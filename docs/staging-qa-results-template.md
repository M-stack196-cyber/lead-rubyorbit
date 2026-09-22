# Staging QA Results Template

## Environment Details

- QA run date:
- Tester:
- Frontend URL:
- Backend URL:
- Supabase project ref/name:
- Tested commit:
- Browser/device:
- `EMAIL_SEND_MODE`:
- `GHL_MODE`:

## Smoke Test Results

| Test area | Test case | Expected result | Actual result | Status | Notes | Owner | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Backend | `GET /api/health` | Successful JSON response |  |  |  |  |  |
| Backend | `GET /api/dashboard/summary` | Dashboard data or valid empty state |  |  |  |  |  |
| Backend | `GET /api/notifications/summary` | Notification counts returned |  |  |  |  |  |
| Backend | `GET /api/campaigns` | Campaign data or valid empty list |  |  |  |  |  |
| Backend | `GET /api/email-sending/status` | Mock mode confirmed |  |  |  |  |  |
| Backend | `GET /api/gmail/status` | Gmail status without tokens |  |  |  |  |  |
| Frontend | Dashboard page load | Page loads without console/API errors |  |  |  |  |  |
| Frontend | Campaigns page load | Page loads and campaign area renders |  |  |  |  |  |
| Frontend | Notifications page load | Page loads and notification area renders |  |  |  |  |  |

## Workflow Test Results

| Test area | Test case | Expected result | Actual result | Status | Notes | Owner | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Campaigns | Open campaign detail | Detail view renders workflow sections |  |  |  |  |  |
| Leads | Review campaign leads | Leads render or empty state is clear |  |  |  |  |  |
| Drafts | Submit draft for approval | Draft status updates manually |  |  |  |  |  |
| Drafts | Approve draft | Approval does not send email |  |  |  |  |  |
| Mock send | Check send status | `EMAIL_SEND_MODE=mock` visible/returned |  |  |  |  |  |
| Gmail | Review account status | Status shown without tokens |  |  |  |  |  |
| Replies | Review replies | Replies or empty state render |  |  |  |  |  |
| Team decisions | Review decision queue | Decisions render and remain manual |  |  |  |  |  |
| No-reply | Review no-reply section | No-reply items or empty state render |  |  |  |  |  |
| Follow-up | Review follow-up drafts | Follow-up drafts remain manual |  |  |  |  |  |
| Notifications | Filter notifications | Filters work or valid empty state remains |  |  |  |  |  |
| Dashboard | Review activity/timeline | Activity and timeline sections render |  |  |  |  |  |

## Issues Found

| Issue ID | Area | Severity | Summary | Status | Owner | Link |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

## Final Signoff

- Overall result: `Pass` / `Pass with issues` / `Fail`
- Blocking issues:
- Non-blocking issues:
- No real email sent: `Yes` / `No`
- `EMAIL_SEND_MODE=mock` confirmed: `Yes` / `No`
- Approved for demo/staging review by:
- Date:
