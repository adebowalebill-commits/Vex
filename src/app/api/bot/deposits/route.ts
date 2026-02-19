/**
 * Bot Resource Deposits API
 * List, place, and assign extraction deposits.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

// GET /api/bot/deposits — List deposits in a world/region
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const discordServerId = searchParams.get('discordServerId')
        const worldId = searchParams.get('worldId')
        const regionId = searchParams.get('regionId')

        let targetWorldId = worldId
        if (!targetWorldId && discordServerId) {
            const world = await prisma.world.findUnique({ where: { discordServerId }, select: { id: true } })
            if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })
            targetWorldId = world.id
        }

        if (!targetWorldId) {
            return NextResponse.json({ success: false, error: 'worldId or discordServerId required' }, { status: 400 })
        }

        const where: Record<string, unknown> = { worldId: targetWorldId }
        if (regionId) where.regionId = regionId

        const deposits = await prisma.resourceDeposit.findMany({
            where,
            include: {
                resource: { select: { name: true, category: true, baseValue: true } },
                region: { select: { name: true } },
                extractor: { select: { id: true, name: true, type: true } },
            },
            orderBy: { resource: { name: 'asc' } },
        })

        return NextResponse.json({
            success: true,
            data: deposits.map(d => ({
                id: d.id,
                resource: d.resource.name,
                category: d.resource.category,
                region: d.region.name,
                totalCapacity: d.totalCapacity,
                remainingAmount: d.remainingAmount,
                extractionRate: d.extractionRate,
                extractor: d.extractor ? { id: d.extractor.id, name: d.extractor.name } : null,
                depleted: d.remainingAmount <= 0,
            })),
        })
    } catch (error) {
        console.error('Error fetching deposits:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch deposits' }, { status: 500 })
    }
}

// POST /api/bot/deposits — Place a new deposit or assign extractor
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { action } = body

        switch (action) {
            case 'place': {
                const { discordServerId, regionId, resourceName, totalCapacity, extractionRate } = body

                if (!discordServerId || !regionId || !resourceName || !totalCapacity) {
                    return NextResponse.json({ success: false, error: 'discordServerId, regionId, resourceName, and totalCapacity required' }, { status: 400 })
                }

                const world = await prisma.world.findUnique({ where: { discordServerId }, select: { id: true } })
                if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })

                const resource = await prisma.resource.findUnique({ where: { name: resourceName } })
                if (!resource) return NextResponse.json({ success: false, error: `Resource "${resourceName}" not found` }, { status: 404 })

                const region = await prisma.region.findFirst({ where: { id: regionId, worldId: world.id } })
                if (!region) return NextResponse.json({ success: false, error: 'Region not found in this world' }, { status: 404 })

                const deposit = await prisma.resourceDeposit.create({
                    data: {
                        totalCapacity,
                        remainingAmount: totalCapacity,
                        extractionRate: extractionRate || 5,
                        resourceId: resource.id,
                        worldId: world.id,
                        regionId,
                    },
                    include: { resource: { select: { name: true } }, region: { select: { name: true } } },
                })

                return NextResponse.json({
                    success: true,
                    data: deposit,
                    message: `Placed ${totalCapacity} ${resourceName} deposit in ${region.name}`,
                }, { status: 201 })
            }

            case 'assign': {
                const { depositId, businessId } = body

                if (!depositId || !businessId) {
                    return NextResponse.json({ success: false, error: 'depositId and businessId required' }, { status: 400 })
                }

                const deposit = await prisma.resourceDeposit.findUnique({ where: { id: depositId } })
                if (!deposit) return NextResponse.json({ success: false, error: 'Deposit not found' }, { status: 404 })

                if (deposit.extractorId) {
                    return NextResponse.json({ success: false, error: 'Deposit already assigned to a business' }, { status: 400 })
                }

                const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true, name: true } })
                if (!business) return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })

                await prisma.resourceDeposit.update({
                    where: { id: depositId },
                    data: { extractorId: businessId },
                })

                return NextResponse.json({
                    success: true,
                    message: `Deposit assigned to ${business.name}`,
                })
            }

            case 'unassign': {
                const { depositId } = body

                if (!depositId) {
                    return NextResponse.json({ success: false, error: 'depositId required' }, { status: 400 })
                }

                await prisma.resourceDeposit.update({
                    where: { id: depositId },
                    data: { extractorId: null },
                })

                return NextResponse.json({ success: true, message: 'Deposit unassigned' })
            }

            default:
                return NextResponse.json({ success: false, error: 'action must be "place", "assign", or "unassign"' }, { status: 400 })
        }
    } catch (error) {
        console.error('Error managing deposit:', error)
        return NextResponse.json({ success: false, error: 'Failed to manage deposit' }, { status: 500 })
    }
}
