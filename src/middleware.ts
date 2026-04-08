/**
 * Global Rate Limiting Middleware
 * Applies per-IP rate limits to all API routes.
 * Uses in-memory sliding window (resets on cold start — fine for Vercel serverless).
 */

import { NextRequest, NextResponse } from 'next/server'

// Rate limit config
const WINDOW_MS = 60_000 // 1 minute window
const MAX_REQUESTS_API = 60 // 60 requests per minute for API routes
const MAX_REQUESTS_BOT = 120 // 120 requests per minute for bot routes (higher for automation)

// In-memory store (per serverless instance)
const ipRequests = new Map<string, { count: number; windowStart: number }>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, value] of ipRequests.entries()) {
        if (now - value.windowStart > WINDOW_MS * 5) {
            ipRequests.delete(key)
        }
    }
}, 300_000)

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Only rate-limit API routes
    if (!pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    // Skip rate limiting for cron (authenticated by secret)
    if (pathname.startsWith('/api/cron/')) {
        return NextResponse.next()
    }

    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown'

    const key = `${ip}:${pathname.startsWith('/api/bot/') ? 'bot' : 'api'}`
    const limit = pathname.startsWith('/api/bot/') ? MAX_REQUESTS_BOT : MAX_REQUESTS_API
    const now = Date.now()

    const entry = ipRequests.get(key)

    if (!entry || now - entry.windowStart > WINDOW_MS) {
        // New window
        ipRequests.set(key, { count: 1, windowStart: now })
        return addHeaders(NextResponse.next(), 1, limit)
    }

    entry.count++

    if (entry.count > limit) {
        const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000)
        return addHeaders(
            NextResponse.json(
                { success: false, error: 'Rate limit exceeded. Try again later.' },
                { status: 429 }
            ),
            entry.count,
            limit,
            retryAfter
        )
    }

    return addHeaders(NextResponse.next(), entry.count, limit)
}

function addHeaders(
    response: NextResponse,
    current: number,
    limit: number,
    retryAfter?: number
): NextResponse {
    response.headers.set('X-RateLimit-Limit', String(limit))
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - current)))
    if (retryAfter) {
        response.headers.set('Retry-After', String(retryAfter))
    }
    return response
}

export const config = {
    matcher: '/api/:path*',
}
