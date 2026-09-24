import { env } from '../config/env.js'

const buckets = new Map()

function createHttpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getClientKey(req, name) {
  const forwardedFor = req.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown'

  return `${name}:${ip}`
}

export function rateLimit({
  name = 'default',
  windowMs = env.security.rateLimitWindowMs,
  maxRequests = env.security.rateLimitMaxRequests,
} = {}) {
  return (req, res, next) => {
    const now = Date.now()
    const key = getClientKey(req, name)
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      })
      next()
      return
    }

    bucket.count += 1

    if (bucket.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000)
      res.setHeader('Retry-After', String(retryAfterSeconds))
      next(createHttpError('Too many requests. Please try again later.', 429))
      return
    }

    next()
  }
}

export function sensitiveRateLimit(name) {
  return rateLimit({
    name,
    windowMs: env.security.sensitiveRateLimitWindowMs,
    maxRequests: env.security.sensitiveRateLimitMaxRequests,
  })
}

export function clearRateLimitBuckets() {
  buckets.clear()
}
