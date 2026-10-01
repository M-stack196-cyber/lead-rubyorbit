create index if not exists idx_replies_workspace_lead_campaign
  on public.replies(workspace_id, lead_id, campaign_id, received_at desc)
  where lead_id is not null;

create index if not exists idx_replies_workspace_sent_email
  on public.replies(workspace_id, sent_email_id, received_at desc)
  where sent_email_id is not null;

create index if not exists idx_sent_emails_workspace_account_status
  on public.sent_emails(workspace_id, email_account_id, status, sent_at desc)
  where email_account_id is not null;
