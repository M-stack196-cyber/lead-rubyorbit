# Security Hardening Checklist

## Auth Checklist

- Choose authentication provider.
- Require authentication for protected API routes.
- Add login/logout/session handling.
- Add session expiration policy.
- Keep public health checks non-sensitive.

## RBAC Checklist

- Approve Admin, Manager, Operator, and Viewer roles.
- Define permission constants.
- Enforce permissions in backend middleware.
- Hide unavailable frontend actions by role.
- Keep live sending Admin-only and approval-gated.

## API Authorization Checklist

- Add authorization middleware to protected routers.
- Check workspace/account membership for every business resource.
- Enforce role checks on approval, send, OAuth, settings, import, and decision actions.
- Return consistent `401` and `403` responses.
- Add tests for unauthorized and forbidden requests.

## Supabase RLS Checklist

- Identify workspace-owned tables.
- Enable RLS policies for workspace-owned records.
- Keep service role key backend-only.
- Verify backend service operations still work.
- Test cross-workspace access denial.

## Token Encryption Checklist

- Choose production encryption or KMS provider.
- Encrypt Gmail access tokens.
- Encrypt Gmail refresh tokens.
- Rotate or revoke exposed tokens.
- Redact tokens from logs and API responses.

## Secret Management Checklist

- Store secrets in hosting provider secret management.
- Keep real `.env` files local and unstaged.
- Restrict production env access.
- Rotate secrets after suspected exposure.
- Never place backend-only secrets in frontend env.

## Logging/Redaction Checklist

- Redact authorization headers and cookies.
- Redact OAuth tokens and provider credentials.
- Redact Supabase service role keys and database URLs.
- Avoid full request body logging on sensitive endpoints.
- Add request IDs for troubleshooting.

## File Upload Checklist

- Enforce file size limits.
- Validate allowed file types.
- Reject malformed or unsafe uploads.
- Store uploads outside public web roots.
- Avoid executing uploaded content.
- Log metadata only.

## Rate Limiting Checklist

- Rate limit login/auth endpoints.
- Rate limit OAuth connect/callback flows.
- Rate limit upload endpoints.
- Rate limit send and bulk-action endpoints.
- Monitor repeated failed authorization attempts.

## Dependency/Security Scanning Checklist

- Run dependency audit before production release.
- Review high and critical findings.
- Keep frontend and backend dependencies patched.
- Review build output for accidental secret exposure.
- Document accepted risks.

## Incident Response Checklist

- Define severity levels.
- Identify incident owners.
- Disable live sending if outreach safety is at risk.
- Rotate exposed secrets.
- Preserve logs safely.
- Document root cause and follow-up actions.

## Pre-Live Security Signoff Checklist

- Authentication implemented and tested.
- RBAC implemented and tested.
- Workspace/account isolation tested.
- Supabase RLS reviewed and tested.
- Gmail token encryption reviewed.
- Secrets verified backend-only.
- Logs reviewed for redaction.
- File uploads hardened.
- Rate limits active.
- Audit logging active.
- Live sending approval recorded before `EMAIL_SEND_MODE=live`.
