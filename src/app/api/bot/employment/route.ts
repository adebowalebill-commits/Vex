/**
 * Bot Employment API
 * Hire, fire, list employees, process payroll.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'
import { hireCitizen, fireCitizen, processPayroll, getEmployees, getCitizenJobs } from '@/lib/employment'

// GET /api/bot/employment — List employees or jobs
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const businessId = searchParams.get('businessId')
        const citizenId = searchParams.get('citizenId')
        const discordId = searchParams.get('discordId')
        const discordServerId = searchParams.get('discordServerId')

        // List employees for a business
        if (businessId) {
            const employees = await getEmployees(businessId)
            return NextResponse.json({
                success: true,
                data: employees.map(e => ({
                    id: e.id,
                    citizenName: e.citizen.displayName,
                    citizenId: e.citizenId,
                    position: e.position,
                    hourlyWage: e.hourlyWage,
                    hoursWorked: e.hoursWorked,
                    hiredAt: e.hiredAt.toISOString(),
                })),
            })
        }

        // List jobs for a citizen
        let targetCitizenId = citizenId

        if (!targetCitizenId && discordId && discordServerId) {
            const world = await prisma.world.findUnique({ where: { discordServerId }, select: { id: true } })
            if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })

            const citizen = await prisma.citizen.findFirst({
                where: { user: { discordId }, worldId: world.id },
                select: { id: true },
            })
            if (!citizen) return NextResponse.json({ success: false, error: 'Citizen not found' }, { status: 404 })
            targetCitizenId = citizen.id
        }

        if (targetCitizenId) {
            const jobs = await getCitizenJobs(targetCitizenId)
            return NextResponse.json({
                success: true,
                data: jobs.map(j => ({
                    id: j.id,
                    businessName: j.business.name,
                    businessType: j.business.type,
                    businessId: j.businessId,
                    position: j.position,
                    hourlyWage: j.hourlyWage,
                    hoursWorked: j.hoursWorked,
                    hiredAt: j.hiredAt.toISOString(),
                })),
            })
        }

        return NextResponse.json({ success: false, error: 'businessId, citizenId, or discordId required' }, { status: 400 })
    } catch (error) {
        console.error('Error fetching employment data:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch employment data' }, { status: 500 })
    }
}

// POST /api/bot/employment — Hire, fire, or process payroll
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { action } = body

        switch (action) {
            case 'hire': {
                const { businessId, citizenId, discordId, discordServerId, position, hourlyWage } = body

                let targetCitizenId = citizenId
                if (!targetCitizenId && discordId && discordServerId) {
                    const world = await prisma.world.findUnique({ where: { discordServerId }, select: { id: true } })
                    if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })

                    const citizen = await prisma.citizen.findFirst({
                        where: { user: { discordId }, worldId: world.id },
                        select: { id: true },
                    })
                    if (!citizen) return NextResponse.json({ success: false, error: 'Citizen not found' }, { status: 404 })
                    targetCitizenId = citizen.id
                }

                if (!businessId || !targetCitizenId || !position || hourlyWage === undefined) {
                    return NextResponse.json({ success: false, error: 'businessId, citizenId/discordId, position, and hourlyWage required' }, { status: 400 })
                }

                const result = await hireCitizen(businessId, targetCitizenId, position, hourlyWage)
                return NextResponse.json(result, { status: result.success ? 200 : 400 })
            }

            case 'fire': {
                const { employeeId } = body
                if (!employeeId) {
                    return NextResponse.json({ success: false, error: 'employeeId is required' }, { status: 400 })
                }
                const result = await fireCitizen(employeeId)
                return NextResponse.json(result, { status: result.success ? 200 : 400 })
            }

            case 'payroll': {
                const { businessId, hoursThisCycle } = body
                if (!businessId) {
                    return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
                }
                const result = await processPayroll(businessId, hoursThisCycle || 8)
                return NextResponse.json({ success: true, data: result })
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'action must be "hire", "fire", or "payroll"' },
                    { status: 400 }
                )
        }
    } catch (error) {
        console.error('Error processing employment action:', error)
        return NextResponse.json({ success: false, error: 'Failed to process employment action' }, { status: 500 })
    }
}
