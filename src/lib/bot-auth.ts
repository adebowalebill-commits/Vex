/**
 * Bot API Authentication
 * Validates API key for Discord bot requests
 */

import { NextRequest, NextResponse } from 'next/server'

const BOT_API_KEY = process.env.BOT_API_KEY

export interface BotAuthResult {
    authenticated: boolean
    error?: string
}

/**
 * Validate bot API key from request headers
 */
export function validateBotApiKey(request: NextRequest): BotAuthResult {
    if (!BOT_API_KEY) {
        console.error('BOT_API_KEY not configured')
        return { authenticated: false, error: 'Bot API not configured' }
    }

    const apiKey = request.headers.get('X-Bot-API-Key')

    if (!apiKey) {
        return { authenticated: false, error: 'Missing API key' }
    }

    if (apiKey !== BOT_API_KEY) {
        return { authenticated: false, error: 'Invalid API key' }
    }

    return { authenticated: true }
}

/**
 * Middleware helper to check bot authentication
 * Returns error response if not authenticated, null otherwise
 */
export function requireBotAuth(request: NextRequest): NextResponse | null {
    const auth = validateBotApiKey(request)

    if (!auth.authenticated) {
        return NextResponse.json(
            { success: false, error: auth.error },
            { status: 401 }
        )
    }

    return null
}

/**
 * Generate a secure API key (run once to generate key)
 */
export function generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'vxv_'
    for (let i = 0; i < 48; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}
