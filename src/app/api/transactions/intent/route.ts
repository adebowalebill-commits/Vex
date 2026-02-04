/**
 * Transaction Intent API
 * Creates transaction intents for Discord bot initiated payments
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

const INTENT_EXPIRY_MINUTES = parseInt(process.env.TRANSACTION_INTENT_EXPIRY_MINUTES || '15')

// POST /api/transactions/intent - Create a new transaction intent
export async function POST(request: NextRequest) {
    // Validate bot API key
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const {
            amount,
            type = 'PAYMENT',
            description,
            senderDiscordId,
            senderType = 'CITIZEN',
            receiverDiscordId,
            receiverType = 'CITIZEN',
            receiverId, // Direct ID if not using Discord ID
            discordServerId,
        } = body

        // Validate required fields
        if (!amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Valid amount is required' },
                { status: 400 }
            )
        }

        if (!senderDiscordId) {
            return NextResponse.json(
                { success: false, error: 'Sender Discord ID is required' },
                { status: 400 }
            )
        }

        if (!receiverDiscordId && !receiverId) {
            return NextResponse.json(
                { success: false, error: 'Receiver Discord ID or ID is required' },
                { status: 400 }
            )
        }

        if (!discordServerId) {
            return NextResponse.json(
                { success: false, error: 'Discord server ID is required' },
                { status: 400 }
            )
        }

        // Get world by Discord server ID
        const world = await prisma.world.findUnique({
            where: { discordServerId },
            select: { id: true, name: true, currencySymbol: true },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found for this Discord server' },
                { status: 404 }
            )
        }

        // Get sender citizen
        const senderCitizen = await prisma.citizen.findFirst({
            where: {
                user: { discordId: senderDiscordId },
                worldId: world.id,
            },
            select: { id: true, displayName: true, walletBalance: true },
        })

        if (!senderCitizen) {
            return NextResponse.json(
                { success: false, error: 'Sender is not a citizen of this world' },
                { status: 404 }
            )
        }

        // Check sender balance
        if (senderCitizen.walletBalance < amount) {
            return NextResponse.json(
                { success: false, error: 'Insufficient balance' },
                { status: 400 }
            )
        }

        // Get receiver
        let actualReceiverId = receiverId
        let receiverName = 'Unknown'

        if (receiverDiscordId && receiverType === 'CITIZEN') {
            const receiverCitizen = await prisma.citizen.findFirst({
                where: {
                    user: { discordId: receiverDiscordId },
                    worldId: world.id,
                },
                select: { id: true, displayName: true },
            })

            if (!receiverCitizen) {
                return NextResponse.json(
                    { success: false, error: 'Receiver is not a citizen of this world' },
                    { status: 404 }
                )
            }

            actualReceiverId = receiverCitizen.id
            receiverName = receiverCitizen.displayName
        } else if (receiverType === 'BUSINESS' && receiverId) {
            const business = await prisma.business.findUnique({
                where: { id: receiverId },
                select: { id: true, name: true },
            })

            if (!business) {
                return NextResponse.json(
                    { success: false, error: 'Business not found' },
                    { status: 404 }
                )
            }

            actualReceiverId = business.id
            receiverName = business.name
        } else if (receiverType === 'TREASURY') {
            actualReceiverId = world.id
            receiverName = `${world.name} Treasury`
        }

        // Create the intent with expiration
        const expiresAt = new Date(Date.now() + INTENT_EXPIRY_MINUTES * 60 * 1000)

        const intent = await prisma.transactionIntent.create({
            data: {
                amount,
                type: type as never,
                description,
                senderType: senderType as never,
                senderId: senderCitizen.id,
                receiverType: receiverType as never,
                receiverId: actualReceiverId,
                worldId: world.id,
                expiresAt,
            },
        })

        // Generate confirmation URL
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const confirmUrl = `${baseUrl}/confirm/${intent.token}`

        return NextResponse.json({
            success: true,
            data: {
                intentId: intent.id,
                token: intent.token,
                confirmUrl,
                expiresAt: intent.expiresAt.toISOString(),
                amount,
                currency: world.currencySymbol,
                sender: senderCitizen.displayName,
                receiver: receiverName,
                description,
            },
        })
    } catch (error) {
        console.error('Error creating transaction intent:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create transaction intent' },
            { status: 500 }
        )
    }
}

// GET /api/transactions/intent - Get intent status
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const intentId = searchParams.get('intentId')
        const token = searchParams.get('token')

        if (!intentId && !token) {
            return NextResponse.json(
                { success: false, error: 'intentId or token is required' },
                { status: 400 }
            )
        }

        const intent = await prisma.transactionIntent.findFirst({
            where: intentId ? { id: intentId } : { token: token! },
        })

        if (!intent) {
            return NextResponse.json(
                { success: false, error: 'Intent not found' },
                { status: 404 }
            )
        }

        // Check if expired
        const isExpired = new Date() > intent.expiresAt && intent.status === 'PENDING'
        if (isExpired) {
            await prisma.transactionIntent.update({
                where: { id: intent.id },
                data: { status: 'EXPIRED' },
            })
            intent.status = 'EXPIRED'
        }

        return NextResponse.json({
            success: true,
            data: {
                intentId: intent.id,
                status: intent.status,
                amount: intent.amount,
                type: intent.type,
                expiresAt: intent.expiresAt.toISOString(),
                completedAt: intent.completedAt?.toISOString(),
                transactionId: intent.transactionId,
                errorMessage: intent.errorMessage,
            },
        })
    } catch (error) {
        console.error('Error fetching intent:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch intent' },
            { status: 500 }
        )
    }
}
