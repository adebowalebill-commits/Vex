/**
 * Bot Inventory API
 * Query citizen/business inventory items.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

// GET /api/bot/inventory — Get a citizen's inventory
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const discordId = searchParams.get('discordId')
        const discordServerId = searchParams.get('discordServerId')
        const citizenId = searchParams.get('citizenId')
        const businessId = searchParams.get('businessId')

        // If businessId is provided, get business inventory
        if (businessId) {
            const items = await prisma.inventoryItem.findMany({
                where: { businessId },
                include: { resource: true },
                orderBy: { resource: { name: 'asc' } },
            })

            return NextResponse.json({
                success: true,
                data: {
                    ownerType: 'business',
                    ownerId: businessId,
                    items: items.map(i => ({
                        id: i.id,
                        resource: i.resource.name,
                        category: i.resource.category,
                        quantity: i.quantity,
                        baseValue: i.resource.baseValue,
                        totalValue: i.quantity * i.resource.baseValue,
                    })),
                },
            })
        }

        // Resolve citizen
        let targetCitizenId = citizenId

        if (!targetCitizenId && discordId) {
            const whereClause: { user: { discordId: string }; worldId?: string } = {
                user: { discordId },
            }

            // If discordServerId provided, scope to that world
            if (discordServerId) {
                const world = await prisma.world.findUnique({
                    where: { discordServerId },
                    select: { id: true },
                })
                if (!world) {
                    return NextResponse.json(
                        { success: false, error: 'World not found' },
                        { status: 404 }
                    )
                }
                whereClause.worldId = world.id
            }

            const citizen = await prisma.citizen.findFirst({
                where: whereClause,
                select: { id: true, displayName: true },
            })

            if (!citizen) {
                return NextResponse.json(
                    { success: false, error: 'Citizen not found' },
                    { status: 404 }
                )
            }
            targetCitizenId = citizen.id
        }

        if (!targetCitizenId) {
            return NextResponse.json(
                { success: false, error: 'discordId, citizenId, or businessId required' },
                { status: 400 }
            )
        }

        const items = await prisma.inventoryItem.findMany({
            where: { citizenId: targetCitizenId },
            include: { resource: true },
            orderBy: { resource: { name: 'asc' } },
        })

        const citizen = await prisma.citizen.findUnique({
            where: { id: targetCitizenId },
            select: { displayName: true },
        })

        return NextResponse.json({
            success: true,
            data: {
                ownerType: 'citizen',
                ownerId: targetCitizenId,
                ownerName: citizen?.displayName,
                items: items.map(i => ({
                    id: i.id,
                    resource: i.resource.name,
                    category: i.resource.category,
                    quantity: i.quantity,
                    baseValue: i.resource.baseValue,
                    totalValue: i.quantity * i.resource.baseValue,
                })),
            },
        })
    } catch (error) {
        console.error('Error fetching inventory:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch inventory' },
            { status: 500 }
        )
    }
}
