import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: process.env.PORT || 5000,
  host: process.env.HOST || 'localhost',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  ghl: {
    mode: process.env.GHL_MODE || 'mock',
    privateIntegrationToken: process.env.GHL_PRIVATE_INTEGRATION_TOKEN || '',
    locationId: process.env.GHL_LOCATION_ID || '',
    workflowId: process.env.GHL_WORKFLOW_ID || '',
    apiBaseUrl: process.env.GHL_API_BASE_URL || 'https://services.leadconnectorhq.com',
  },
  emailSend: {
    mode: process.env.EMAIL_SEND_MODE || 'mock',
    liveApproved: process.env.EMAIL_SEND_LIVE_APPROVED === 'true',
  },
  auth: {
    required: process.env.AUTH_REQUIRED === 'true',
  },
  automation: {
    enabled: process.env.BACKGROUND_AUTOMATION_ENABLED === 'true',
    runOnStart: process.env.BACKGROUND_AUTOMATION_RUN_ON_START === 'true',
    intervalMs: Number(process.env.BACKGROUND_AUTOMATION_INTERVAL_MS || 15 * 60 * 1000),
    campaignBatchSize: Number(process.env.BACKGROUND_AUTOMATION_CAMPAIGN_BATCH_SIZE || 25),
    noReplyTimeoutDays: Number(process.env.BACKGROUND_AUTOMATION_NO_REPLY_TIMEOUT_DAYS || 3),
    createFollowupDrafts: process.env.BACKGROUND_AUTOMATION_CREATE_FOLLOWUP_DRAFTS !== 'false',
    followupDraftBatchSize: Number(
      process.env.BACKGROUND_AUTOMATION_FOLLOWUP_DRAFT_BATCH_SIZE || 25,
    ),
  },
  security: {
    jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb',
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300),
    sensitiveRateLimitWindowMs: Number(
      process.env.SENSITIVE_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    ),
    sensitiveRateLimitMaxRequests: Number(process.env.SENSITIVE_RATE_LIMIT_MAX_REQUESTS || 30),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    oauthRedirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/gmail/oauth/callback',
    oauthScopes:
      process.env.GOOGLE_OAUTH_SCOPES ||
      'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
  },
  databaseUrl: process.env.DATABASE_URL || '',
}
