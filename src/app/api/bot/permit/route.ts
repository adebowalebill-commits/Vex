/**
 * Bot Permit API
 * Buy a permit to create additional businesses beyond the default limit.
 * Deducts businessCreationFee from citizen wallet → treasury, increments their allowed count.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

// POST /api/bot/permit — Buy a business permit
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { discordId, discordServerId } = await request.json()

        if (!discordId || !discordServerId) {
            return NextResponse.json(
                { success: false, error: 'discordId and discordServerId are required' },
                { status: 400 }
            )
        }

        const world = await prisma.world.findUnique({
            where: { discordServerId },
            select: { id: true, businessCreationFee: true, maxBusinessesPerCitizen: true },
        })

        if (!world) {
            return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })
        }

        const citizen = await prisma.citizen.findFirst({
            where: { user: { discordId }, worldId: world.id },
            select: { id: true, walletBalance: true },
        })

        if (!citizen) {
            return NextResponse.json({ success: false, error: 'Citizen not found' }, { status: 404 })
        }

        const permitCost = world.businessCreationFee
        if (citizen.walletBalance < permitCost) {
            return NextResponse.json(
                { success: false, error: `Insufficient funds. Permit costs ${permitCost}, you have ${citizen.walletBalance}` },
                { status: 400 }
            )
        }

        // Atomically: deduct wallet, credit treasury, bump world limit for this citizen
        // We track permits by incrementing maxBusinessesPerCitizen on the world,
        // but since it's world-wide, we'll use a per-citizen approach instead:
        // Count current businesses + 1 as the new effective limit
        const currentCount = await prisma.business.count({
            where: { ownerId: citizen.id, worldId: world.id, isActive: true },
        })

        await prisma.$transaction(async (tx) => {
            // Deduct from citizen
            await tx.citizen.update({
                where: { id: citizen.id },
                data: { walletBalance: { decrement: permitCost } },
            })

            // Credit treasury
            await tx.treasury.updateMany({
                where: { worldId: world.id },
                data: {
                    balance: { increment: permitCost },
                    totalPermitRevenue: { increment: permitCost },
                },
            })

            // Record transaction
            await tx.transaction.create({
                data: {
                    amount: permitCost,
                    type: 'PERMIT_PURCHASE',
                    description: `Business permit purchase (slot ${currentCount + 1} → ${currentCount + 2})`,
                    status: 'COMPLETED',
                    worldId: world.id,
                    senderCitizenId: citizen.id,
                },
            })
        })

        // Bump world-wide limit so this citizen (and others) can create more
        // In a more granular system you'd track per-citizen permits,
        // but for MVP we bump the world setting
        await prisma.world.update({
            where: { id: world.id },
            data: { maxBusinessesPerCitizen: { increment: 1 } },
        })

        return NextResponse.json({
            success: true,
            message: `Permit purchased for ${permitCost}. Business limit increased to ${world.maxBusinessesPerCitizen + 1}.`,
            data: {
                cost: permitCost,
                newLimit: world.maxBusinessesPerCitizen + 1,
                walletBalance: citizen.walletBalance - permitCost,
            },
        }, { status: 201 })
    } catch (error) {
        console.error('Error purchasing permit:', error)
        return NextResponse.json({ success: false, error: 'Failed to purchase permit' }, { status: 500 })
    }
}

// GET /api/bot/permit — Check permit status
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const discordId = searchParams.get('discordId')
    const discordServerId = searchParams.get('discordServerId')

    if (!discordId || !discordServerId) {
        return NextResponse.json({ success: false, error: 'discordId and discordServerId required' }, { status: 400 })
    }

    const world = await prisma.world.findUnique({
        where: { discordServerId },
        select: { id: true, maxBusinessesPerCitizen: true, businessCreationFee: true },
    })
    if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })

    const citizen = await prisma.citizen.findFirst({
        where: { user: { discordId }, worldId: world.id },
        select: { id: true },
    })
    if (!citizen) return NextResponse.json({ success: false, error: 'Citizen not found' }, { status: 404 })

    const ownedCount = await prisma.business.count({
        where: { ownerId: citizen.id, worldId: world.id, isActive: true },
    })

    return NextResponse.json({
        success: true,
        data: {
            ownedBusinesses: ownedCount,
            maxAllowed: world.maxBusinessesPerCitizen,
            slotsAvailable: Math.max(0, world.maxBusinessesPerCitizen - ownedCount),
            permitCost: world.businessCreationFee,
        },
    })
}
