# Security Role Matrix

Live sending is restricted to Admin only and remains approval-gated. `EMAIL_SEND_MODE` should stay `mock` until written approval is recorded.

| Permission | Admin | Manager | Operator | Viewer |
| --- | --- | --- | --- | --- |
| View dashboard | Yes | Yes | Yes | Yes |
| Upload leads | Yes | Yes | Yes | No |
| Import leads | Yes | Yes | Yes | No |
| Create/edit campaigns | Yes | Yes | Yes | No |
| Create/edit drafts | Yes | Yes | Yes | No |
| Approve/reject drafts | Yes | Yes | No | No |
| Mock send | Yes | Yes | Yes | No |
| Live send | Approval-gated | No | No | No |
| Connect Gmail account | Yes | No | No | No |
| View Gmail status | Yes | Yes | Yes | Yes |
| Review replies | Yes | Yes | Yes | Yes |
| Create reply drafts | Yes | Yes | Yes | No |
| Create follow-up drafts | Yes | Yes | Yes | No |
| Resolve notifications | Yes | Yes | Yes | No |
| Manage settings | Yes | No | No | No |
| View audit logs | Yes | No | No | No |

## Role Notes

- Admin owns account-level setup, security-sensitive settings, Gmail OAuth, and approval-gated live sending.
- Manager owns campaign review, draft approvals, decisions, and workflow oversight.
- Operator owns day-to-day lead intake, draft preparation, manual checks, and notification handling.
- Viewer has read-only visibility for reporting, review, and stakeholder observation.
