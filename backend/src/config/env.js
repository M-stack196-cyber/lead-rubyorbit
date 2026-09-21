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
