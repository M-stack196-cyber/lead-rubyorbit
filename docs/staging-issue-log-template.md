# Staging Issue Log Template

Use this template for issues found during staging deployment QA.

| Issue ID | Date | Area | Severity | Steps to reproduce | Expected result | Actual result | Screenshot/link | Owner | Status | Resolution notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STG-001 |  |  |  |  |  |  |  |  |  |  |

## Severity Guide

- Critical: Blocks staging QA, exposes secrets, enables unintended real sending, or prevents core app access.
- High: Breaks a major workflow such as campaign detail, draft review, dashboard, notifications, or email status.
- Medium: Workflow issue with a workaround.
- Low: Minor copy, layout, empty state, or documentation issue.

## Status Values

- New
- In review
- Fixed
- Retest needed
- Closed
- Deferred

## Safety Notes

- Do not include secrets, tokens, database URLs, or service role keys in issue text or screenshots.
- Do not run real send tests while reproducing issues unless explicitly approved.
- Keep `EMAIL_SEND_MODE=mock` during staging QA.
