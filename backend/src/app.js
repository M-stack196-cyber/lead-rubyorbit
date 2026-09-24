import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { apiRoutes } from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { securityHeaders } from './middleware/securityHeaders.js'
import { rateLimit } from './middleware/rateLimit.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.clientUrl,
    }),
  )
  app.use(securityHeaders)
  app.use(rateLimit())
  app.use(express.json({ limit: env.security.jsonBodyLimit }))
  app.use(requestLogger)

  app.use('/api', apiRoutes)

  app.use(errorHandler)

  return app
}
