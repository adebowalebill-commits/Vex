/**
 * Economy Enforcement API
 * Scan for inactive businesses and enforce policy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBotAuth } from '@/lib/bot-auth'
import { checkInactivity, revokePermit, forceSale } from '@/lib/enforcement'

// GET /api/economy/enforcement — List flagged inactive entities
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const worldId = searchParams.get('worldId')

        if (!worldId) {
            return NextResponse.json({ success: false, error: 'worldId is required' }, { status: 400 })
        }

        const flags = await checkInactivity(worldId)

        return NextResponse.json({
            success: true,
            data: {
                flags,
                summary: {
                    total: flags.length,
                    critical: flags.filter(f => f.severity === 'CRITICAL').length,
                    warning: flags.filter(f => f.severity === 'WARNING').length,
                },
            },
        })
    } catch (error) {
        console.error('Error scanning inactivity:', error)
        return NextResponse.json({ success: false, error: 'Scan failed' }, { status: 500 })
    }
}

// POST /api/economy/enforcement — Execute enforcement action
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { action, businessId, worldId } = body

        switch (action) {
            case 'scan': {
                if (!worldId) return NextResponse.json({ success: false, error: 'worldId required' }, { status: 400 })
                const flags = await checkInactivity(worldId)
                return NextResponse.json({ success: true, data: flags })
            }

            case 'revoke': {
                if (!businessId) return NextResponse.json({ success: false, error: 'businessId required' }, { status: 400 })
                const result = await revokePermit(businessId)
                return NextResponse.json(result, { status: result.success ? 200 : 400 })
            }

            case 'force_sale': {
                if (!businessId) return NextResponse.json({ success: false, error: 'businessId required' }, { status: 400 })
                const result = await forceSale(businessId)
                return NextResponse.json(result, { status: result.success ? 200 : 400 })
            }

            case 'auto_enforce': {
                if (!worldId) return NextResponse.json({ success: false, error: 'worldId required' }, { status: 400 })
                const flags = await checkInactivity(worldId)
                const results = []

                for (const flag of flags) {
                    if (flag.severity === 'CRITICAL') {
                        results.push(await revokePermit(flag.businessId))
                    }
                }

                return NextResponse.json({
                    success: true,
                    data: { scanned: flags.length, enforced: results.length, results },
                })
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'action must be "scan", "revoke", "force_sale", or "auto_enforce"' },
                    { status: 400 }
                )
        }
    } catch (error) {
        console.error('Error executing enforcement:', error)
        return NextResponse.json({ success: false, error: 'Enforcement failed' }, { status: 500 })
    }
}
