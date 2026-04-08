/**
 * Bot Wallet API
 * Balance queries and admin deposits for Discord bot
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'
import { getBalance, deposit } from '@/lib/wallet'

// GET /api/bot/wallet - Get wallet balance
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const discordId = searchParams.get('discordId')
        const discordServerId = searchParams.get('discordServerId')
        const citizenId = searchParams.get('citizenId')

        // Get by citizen ID directly
        if (citizenId) {
            const balance = await getBalance(citizenId, 'CITIZEN')
            if (!balance) {
                return NextResponse.json(
                    { success: false, error: 'Citizen not found' },
                    { status: 404 }
                )
            }
            return NextResponse.json({ success: true, data: balance })
        }

        // Get by Discord ID and server
        if (!discordId || !discordServerId) {
            return NextResponse.json(
                { success: false, error: 'discordId and discordServerId are required' },
                { status: 400 }
            )
        }

        // Get world
        const world = await prisma.world.findUnique({
            where: { discordServerId },
            select: { id: true, currencyName: true, currencySymbol: true },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found' },
                { status: 404 }
            )
        }

        // Get citizen
        const citizen = await prisma.citizen.findFirst({
            where: {
                user: { discordId },
                worldId: world.id,
            },
            select: {
                id: true,
                displayName: true,
                walletBalance: true,
                bankBalance: true,
            },
        })

        if (!citizen) {
            return NextResponse.json(
                { success: false, error: 'Not a citizen of this world' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                citizenId: citizen.id,
                displayName: citizen.displayName,
                wallet: citizen.walletBalance,
                bank: citizen.bankBalance,
                total: citizen.walletBalance + citizen.bankBalance,
                currency: {
                    name: world.currencyName,
                    symbol: world.currencySymbol,
                },
            },
        })
    } catch (error) {
        console.error('Error fetching balance:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch balance' },
            { status: 500 }
        )
    }
}

// POST /api/bot/wallet - Admin deposit (world owner only)
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const {
            citizenId,
            discordId,
            discordServerId,
            amount,
            adminDiscordId,
            reason
        } = body

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Valid amount is required' },
                { status: 400 }
            )
        }

        if (!discordServerId) {
            return NextResponse.json(
                { success: false, error: 'discordServerId is required' },
                { status: 400 }
            )
        }

        // Get world and verify admin is owner
        const world = await prisma.world.findUnique({
            where: { discordServerId },
            include: { owner: { select: { discordId: true } } },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found' },
                { status: 404 }
            )
        }

        if (adminDiscordId && world.owner.discordId !== adminDiscordId) {
            return NextResponse.json(
                { success: false, error: 'Only the world owner can make admin deposits' },
                { status: 403 }
            )
        }

        // Get target citizen
        let targetCitizenId = citizenId
        if (!targetCitizenId && discordId) {
            const citizen = await prisma.citizen.findFirst({
                where: {
                    user: { discordId },
                    worldId: world.id,
                },
                select: { id: true },
            })
            if (!citizen) {
                return NextResponse.json(
                    { success: false, error: 'Target citizen not found' },
                    { status: 404 }
                )
            }
            targetCitizenId = citizen.id
        }

        if (!targetCitizenId) {
            return NextResponse.json(
                { success: false, error: 'citizenId or discordId is required' },
                { status: 400 }
            )
        }

        // Perform deposit
        const result = await deposit(targetCitizenId, 'CITIZEN', amount)

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            )
        }

        // Record as treasury subsidy
        await prisma.transaction.create({
            data: {
                amount,
                type: 'TREASURY_SUBSIDY',
                description: reason || 'Admin deposit',
                status: 'COMPLETED',
                worldId: world.id,
                receiverCitizenId: targetCitizenId,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                newBalance: result.newBalance,
                amount,
            },
            message: `Deposited ${amount} successfully`,
        })
    } catch (error) {
        console.error('Error processing deposit:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to process deposit' },
            { status: 500 }
        )
    }
}
