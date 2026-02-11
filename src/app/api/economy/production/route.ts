/**
 * Economy Production API
 * Trigger and query production cycles for worlds.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBotAuth } from '@/lib/bot-auth'
import { runWorldProduction, getWorldProductionStatus } from '@/lib/production'

// GET /api/economy/production — Get production status for a world
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

        const statuses = await getWorldProductionStatus(worldId)

        const canProduce = statuses.filter(s => s.canProduce).length
        const blocked = statuses.filter(s => !s.canProduce).length

        return NextResponse.json({
            success: true,
            data: {
                businesses: statuses,
                summary: {
                    total: statuses.length,
                    canProduce,
                    blocked,
                },
            },
        })
    } catch (error) {
        console.error('Error fetching production status:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch production status' },
            { status: 500 }
        )
    }
}

// POST /api/economy/production — Trigger production cycle for a world
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

        const summary = await runWorldProduction(worldId)

        return NextResponse.json({
            success: true,
            data: summary,
            message: `Ran ${summary.cyclesRun} production cycles: ${summary.successful} succeeded, ${summary.failed} failed.`,
        })
    } catch (error) {
        console.error('Error running production:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to run production' },
            { status: 500 }
        )
    }
}
