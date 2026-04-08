/**
 * Cron Tick API
 * Single endpoint to run all periodic world processes:
 * - Survival decay
 * - Production cycles
 * - Payroll
 * - Inactivity enforcement
 *
 * Secured with CRON_SECRET env var.
 * Can be called by Vercel Cron, external scheduler, or manually.
 */

import { NextRequest, NextResponse } from 'next/server'
import { processSurvivalDecay } from '@/lib/decay'
import { runWorldProduction } from '@/lib/production'
import { processWorldPayroll } from '@/lib/employment'
import { checkInactivity, revokePermit } from '@/lib/enforcement'
import prisma from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Validate cron authentication (CRON_SECRET or BOT_API_KEY)
 */
function validateCronAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('Authorization')
    if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
        return true
    }

    const botKey = request.headers.get('X-Bot-API-Key')
    if (botKey && botKey === process.env.BOT_API_KEY) {
        return true
    }

    return false
}

// POST /api/cron/tick — Run world-wide tick
export async function POST(request: NextRequest) {
    if (!validateCronAuth(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json().catch(() => ({}))
        const targetWorldId = (body as Record<string, string>).worldId

        const worlds = await prisma.world.findMany({
            where: targetWorldId ? { id: targetWorldId } : { isActive: true },
            select: { id: true, name: true },
        })

        const results = []

        for (const world of worlds) {
            const worldResult: Record<string, unknown> = {
                worldId: world.id,
                worldName: world.name,
            }

            // 1. Survival Decay
            try {
                const decay = await processSurvivalDecay(world.id)
                worldResult.decay = {
                    processed: decay.processed,
                    critical: decay.critical.length,
                    warnings: decay.warnings.length,
                    events: decay.events,
                }
            } catch (error) {
                worldResult.decayError = String(error)
            }

            // 2. Production Cycles
            try {
                const production = await runWorldProduction(world.id)
                worldResult.production = {
                    cyclesRun: production.cyclesRun,
                    successful: production.successful,
                    failed: production.failed,
                }
            } catch (error) {
                worldResult.productionError = String(error)
            }

            // 3. Payroll
            try {
                const payroll = await processWorldPayroll(world.id)
                const totalPaid = payroll.reduce((sum, p) => sum + p.totalPaid, 0)
                const totalEmployees = payroll.reduce((sum, p) => sum + p.employeesPaid, 0)
                worldResult.payroll = {
                    businessesProcessed: payroll.length,
                    totalPaid,
                    employeesPaid: totalEmployees,
                }
            } catch (error) {
                worldResult.payrollError = String(error)
            }

            // 4. Enforcement (auto-revoke critical)
            try {
                const flags = await checkInactivity(world.id)
                const critical = flags.filter(f => f.severity === 'CRITICAL')
                const revoked = []

                for (const flag of critical) {
                    const result = await revokePermit(flag.businessId)
                    if (result.success) revoked.push(flag.businessName)
                }

                worldResult.enforcement = {
                    flagged: flags.length,
                    critical: critical.length,
                    revoked: revoked.length,
                    revokedBusinesses: revoked,
                }
            } catch (error) {
                worldResult.enforcementError = String(error)
            }

            results.push(worldResult)
        }

        return NextResponse.json({
            success: true,
            data: {
                worldsProcessed: worlds.length,
                timestamp: new Date().toISOString(),
                results,
            },
        })
    } catch (error) {
        console.error('Cron tick error:', error)
        return NextResponse.json({ success: false, error: 'Cron tick failed' }, { status: 500 })
    }
}

// GET /api/cron/tick — Health check
export async function GET(request: NextRequest) {
    if (!validateCronAuth(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const worldCount = await prisma.world.count({ where: { isActive: true } })

    return NextResponse.json({
        success: true,
        message: 'Cron tick endpoint healthy',
        activeWorlds: worldCount,
        timestamp: new Date().toISOString(),
    })
}
