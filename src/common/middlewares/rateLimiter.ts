import rateLimit from 'express-rate-limit'

import { config } from '../../config'

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    data: null,
  },
})

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: Math.max(10, Math.floor(config.rateLimitMax / 4)),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    data: null,
  },
})
