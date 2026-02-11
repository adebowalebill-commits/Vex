/**
 * Economy Decay API
 * Trigger and query survival decay processing for worlds.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBotAuth } from '@/lib/bot-auth'
import { processSurvivalDecay, getWorldSurvivalStatus } from '@/lib/decay'

// GET /api/economy/decay — Get citizen survival status for a world
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const worldId = searchParams.get('worldId')

        if (!worldId) {
            return NextResponse.json(
                { success: false, error: 'worldId is required' },
                { status: 400 }
            )
        }

        const status = await getWorldSurvivalStatus(worldId)

        const critical = status.filter(s => Math.min(s.food, s.water, s.sleep) <= 24)
        const warning = status.filter(s => {
            const min = Math.min(s.food, s.water, s.sleep)
            return min > 24 && min <= 49
        })

        return NextResponse.json({
            success: true,
            data: {
                citizens: status,
                summary: {
                    total: status.length,
                    healthy: status.length - critical.length - warning.length,
                    warning: warning.length,
                    critical: critical.length,
                },
            },
        })
    } catch (error) {
        console.error('Error fetching survival status:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch survival status' },
            { status: 500 }
        )
    }
}

// POST /api/economy/decay — Trigger decay tick for a world
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { worldId } = body

        if (!worldId) {
            return NextResponse.json(
                { success: false, error: 'worldId is required' },
                { status: 400 }
            )
        }

        const summary = await processSurvivalDecay(worldId)

        return NextResponse.json({
            success: true,
            data: summary,
            message: `Processed decay for ${summary.processed} citizens. ${summary.critical.length} critical, ${summary.warnings.length} warnings.`,
        })
    } catch (error) {
        console.error('Error processing decay:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to process decay' },
            { status: 500 }
        )
    }
}
