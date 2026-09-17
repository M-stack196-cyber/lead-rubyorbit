import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

export function createDatabasePool() {
  if (!env.databaseUrl) {
    return null
  }

  return new Pool({
    connectionString: env.databaseUrl,
  })
}

export const databaseConfig = {
  connectionStringConfigured: Boolean(env.databaseUrl),
}
