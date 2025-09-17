import { NextRequest } from 'next/server'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const rateLimitConfig: RateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
}

// In-memory store for rate limiting (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(identifier: string): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowStart = now - rateLimitConfig.windowMs

  // Clean up old entries
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetTime < windowStart) {
      requestCounts.delete(key)
    }
  }

  const current = requestCounts.get(identifier)
  
  if (!current) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + rateLimitConfig.windowMs,
    })
    return {
      success: true,
      remaining: rateLimitConfig.maxRequests - 1,
      resetTime: now + rateLimitConfig.windowMs,
    }
  }

  if (current.resetTime < now) {
    // Window expired, reset
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + rateLimitConfig.windowMs,
    })
    return {
      success: true,
      remaining: rateLimitConfig.maxRequests - 1,
      resetTime: now + rateLimitConfig.windowMs,
    }
  }

  if (current.count >= rateLimitConfig.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: current.resetTime,
    }
  }

  current.count++
  return {
    success: true,
    remaining: rateLimitConfig.maxRequests - current.count,
    resetTime: current.resetTime,
  }
}

export function getRateLimitIdentifier(request: NextRequest): string {
  // Use IP address as identifier
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return ip
}
