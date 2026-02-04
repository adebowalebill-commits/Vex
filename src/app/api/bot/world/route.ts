/**
 * Bot World API
 * World lookup and citizen listing for Discord bot
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

// GET /api/bot/world - Get world info and citizens
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const discordServerId = searchParams.get('discordServerId')
        const worldId = searchParams.get('worldId')
        const includeCitizens = searchParams.get('includeCitizens') === 'true'
        const includeStats = searchParams.get('includeStats') === 'true'

        if (!discordServerId && !worldId) {
            return NextResponse.json(
                { success: false, error: 'discordServerId or worldId is required' },
                { status: 400 }
            )
        }

        const world = await prisma.world.findUnique({
            where: discordServerId ? { discordServerId } : { id: worldId! },
            select: {
                id: true,
                name: true,
                description: true,
                discordServerId: true,
                currencyName: true,
                currencySymbol: true,
                salesTaxRate: true,
                incomeTaxRate: true,
                propertyTaxRate: true,
                initialCitizenBalance: true,
                isActive: true,
                createdAt: true,
                owner: {
                    select: { id: true, name: true, discordId: true },
                },
                treasury: {
                    select: { balance: true, totalTaxRevenue: true },
                },
            },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found' },
                { status: 404 }
            )
        }

        let citizens = null
        if (includeCitizens) {
            citizens = await prisma.citizen.findMany({
                where: { worldId: world.id, isActive: true },
                select: {
                    id: true,
                    displayName: true,
                    walletBalance: true,
                    bankBalance: true,
                    user: { select: { discordId: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
            })
        }

        let stats = null
        if (includeStats) {
            const [citizenCount, businessCount, transactionCount, totalMoneySupply] = await Promise.all([
                prisma.citizen.count({ where: { worldId: world.id, isActive: true } }),
                prisma.business.count({ where: { worldId: world.id, isActive: true } }),
                prisma.transaction.count({ where: { worldId: world.id } }),
                prisma.citizen.aggregate({
                    where: { worldId: world.id },
                    _sum: { walletBalance: true, bankBalance: true },
                }),
            ])

            stats = {
                citizenCount,
                businessCount,
                transactionCount,
                totalMoneySupply:
                    (totalMoneySupply._sum.walletBalance || 0) +
                    (totalMoneySupply._sum.bankBalance || 0) +
                    (world.treasury?.balance || 0),
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                world,
                citizens,
                stats,
            },
        })
    } catch (error) {
        console.error('Error fetching world:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch world' },
            { status: 500 }
        )
    }
}

// POST /api/bot/world - Create or update world
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const {
            discordServerId,
            name,
            description,
            ownerDiscordId,
            currencyName,
            currencySymbol,
            salesTaxRate,
        } = body

        if (!discordServerId || !name || !ownerDiscordId) {
            return NextResponse.json(
                { success: false, error: 'discordServerId, name, and ownerDiscordId are required' },
                { status: 400 }
            )
        }

        // Get owner user
        const owner = await prisma.user.findUnique({
            where: { discordId: ownerDiscordId },
        })

        if (!owner) {
            return NextResponse.json(
                { success: false, error: 'Owner must first sign in via the website' },
                { status: 404 }
            )
        }

        // Check if world exists
        const existingWorld = await prisma.world.findUnique({
            where: { discordServerId },
        })

        if (existingWorld) {
            // Update existing world
            const updated = await prisma.world.update({
                where: { discordServerId },
                data: {
                    name,
                    description,
                    currencyName: currencyName || existingWorld.currencyName,
                    currencySymbol: currencySymbol || existingWorld.currencySymbol,
                    salesTaxRate: salesTaxRate ?? existingWorld.salesTaxRate,
                },
            })

            return NextResponse.json({
                success: true,
                data: updated,
                message: 'World updated',
            })
        }

        // Create new world with treasury
        const world = await prisma.world.create({
            data: {
                name,
                description,
                discordServerId,
                currencyName: currencyName || 'Credits',
                currencySymbol: currencySymbol || '©',
                salesTaxRate: salesTaxRate ?? 5,
                ownerId: owner.id,
                treasury: {
                    create: {
                        balance: 0,
                    },
                },
            },
            include: {
                treasury: true,
            },
        })

        // Register owner as first citizen
        await prisma.citizen.create({
            data: {
                displayName: owner.name || 'World Owner',
                walletBalance: world.initialCitizenBalance,
                userId: owner.id,
                worldId: world.id,
                survivalNeeds: {
                    create: { food: 100, water: 100, sleep: 100 },
                },
            },
        })

        return NextResponse.json({
            success: true,
            data: world,
            message: 'World created successfully',
        })
    } catch (error) {
        console.error('Error creating/updating world:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create/update world' },
            { status: 500 }
        )
    }
}
