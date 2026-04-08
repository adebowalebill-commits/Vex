/**
 * Bot Passport API
 * Purchase a passport to participate in a world's economy.
 * If passportRequired is true on the world, citizens must have a passport
 * before they can create businesses, work, or trade.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

// POST /api/bot/passport — Purchase a passport
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
            select: {
                id: true,
                name: true,
                passportRequired: true,
                passportPrice: true,
                currencySymbol: true,
            },
        })

        if (!world) {
            return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })
        }

        if (!world.passportRequired) {
            return NextResponse.json(
                { success: false, error: 'This world does not require passports. Everyone can participate freely.' },
                { status: 400 }
            )
        }

        const citizen = await prisma.citizen.findFirst({
            where: { user: { discordId }, worldId: world.id },
            select: { id: true, walletBalance: true, hasPassport: true },
        })

        if (!citizen) {
            return NextResponse.json({ success: false, error: 'Citizen not found. Join the world first.' }, { status: 404 })
        }

        if (citizen.hasPassport) {
            return NextResponse.json(
                { success: false, error: 'You already have a passport for this world.' },
                { status: 400 }
            )
        }

        const cost = world.passportPrice

        // If passport is free, just grant it
        if (cost <= 0) {
            await prisma.citizen.update({
                where: { id: citizen.id },
                data: { hasPassport: true },
            })

            return NextResponse.json({
                success: true,
                message: `Passport granted for ${world.name}! You can now fully participate in the economy.`,
                data: { cost: 0, walletBalance: citizen.walletBalance },
            }, { status: 201 })
        }

        // Check funds
        if (citizen.walletBalance < cost) {
            return NextResponse.json(
                { success: false, error: `Insufficient funds. Passport costs ${world.currencySymbol}${cost}, you have ${world.currencySymbol}${citizen.walletBalance}` },
                { status: 400 }
            )
        }

        // Atomically: deduct wallet, credit treasury, grant passport
        await prisma.$transaction(async (tx) => {
            await tx.citizen.update({
                where: { id: citizen.id },
                data: {
                    walletBalance: { decrement: cost },
                    hasPassport: true,
                },
            })

            await tx.treasury.updateMany({
                where: { worldId: world.id },
                data: {
                    balance: { increment: cost },
                    totalPermitRevenue: { increment: cost },
                },
            })

            await tx.transaction.create({
                data: {
                    amount: cost,
                    type: 'PASSPORT_PURCHASE',
                    description: `Passport purchase for ${world.name}`,
                    status: 'COMPLETED',
                    worldId: world.id,
                    senderCitizenId: citizen.id,
                },
            })
        })

        return NextResponse.json({
            success: true,
            message: `Passport purchased for ${world.currencySymbol}${cost}! You can now fully participate in ${world.name}'s economy.`,
            data: {
                cost,
                walletBalance: citizen.walletBalance - cost,
            },
        }, { status: 201 })
    } catch (error) {
        console.error('Error purchasing passport:', error)
        return NextResponse.json({ success: false, error: 'Failed to purchase passport' }, { status: 500 })
    }
}

// GET /api/bot/passport — Check passport status and price
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
        select: {
            id: true,
            name: true,
            passportRequired: true,
            passportPrice: true,
            currencySymbol: true,
        },
    })
    if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })

    const citizen = await prisma.citizen.findFirst({
        where: { user: { discordId }, worldId: world.id },
        select: { id: true, hasPassport: true, walletBalance: true },
    })

    return NextResponse.json({
        success: true,
        data: {
            worldName: world.name,
            passportRequired: world.passportRequired,
            passportPrice: world.passportPrice,
            currencySymbol: world.currencySymbol,
            hasPassport: citizen?.hasPassport ?? false,
            canAfford: citizen ? citizen.walletBalance >= world.passportPrice : false,
            walletBalance: citizen?.walletBalance ?? 0,
        },
    })
}
