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
  databaseUrl: process.env.DATABASE_URL || '',
}
