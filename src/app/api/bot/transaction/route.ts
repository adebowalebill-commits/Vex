/**
 * Bot Transaction API
 * Transaction intent creation and status for Discord bot
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

const INTENT_EXPIRY_MINUTES = parseInt(process.env.TRANSACTION_INTENT_EXPIRY_MINUTES || '15')

// POST /api/bot/transaction - Create a transaction intent
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const {
            amount,
            type = 'PAYMENT',
            description,
            senderDiscordId,
            receiverDiscordId,
            receiverBusinessId,
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
                { success: false, error: 'senderDiscordId is required' },
                { status: 400 }
            )
        }

        if (!receiverDiscordId && !receiverBusinessId) {
            return NextResponse.json(
                { success: false, error: 'receiverDiscordId or receiverBusinessId is required' },
                { status: 400 }
            )
        }

        if (!discordServerId) {
            return NextResponse.json(
                { success: false, error: 'discordServerId is required' },
                { status: 400 }
            )
        }

        // Get world
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

        // Get sender
        const sender = await prisma.citizen.findFirst({
            where: {
                user: { discordId: senderDiscordId },
                worldId: world.id,
            },
            select: { id: true, displayName: true, walletBalance: true },
        })

        if (!sender) {
            return NextResponse.json(
                { success: false, error: 'Sender is not a citizen of this world' },
                { status: 404 }
            )
        }

        // Check balance
        if (sender.walletBalance < amount) {
            return NextResponse.json({
                success: false,
                error: 'Insufficient balance',
                data: {
                    currentBalance: sender.walletBalance,
                    required: amount,
                    currency: world.currencySymbol,
                },
            }, { status: 400 })
        }

        // Get receiver
        let receiverId: string
        let receiverType: 'CITIZEN' | 'BUSINESS' = 'CITIZEN'
        let receiverName: string

        if (receiverBusinessId) {
            const business = await prisma.business.findUnique({
                where: { id: receiverBusinessId },
                select: { id: true, name: true },
            })
            if (!business) {
                return NextResponse.json(
                    { success: false, error: 'Business not found' },
                    { status: 404 }
                )
            }
            receiverId = business.id
            receiverType = 'BUSINESS'
            receiverName = business.name
        } else {
            const receiver = await prisma.citizen.findFirst({
                where: {
                    user: { discordId: receiverDiscordId },
                    worldId: world.id,
                },
                select: { id: true, displayName: true },
            })
            if (!receiver) {
                return NextResponse.json(
                    { success: false, error: 'Receiver is not a citizen of this world' },
                    { status: 404 }
                )
            }
            receiverId = receiver.id
            receiverName = receiver.displayName
        }

        // Cannot send to self
        if (receiverId === sender.id) {
            return NextResponse.json(
                { success: false, error: 'Cannot send payment to yourself' },
                { status: 400 }
            )
        }

        // Create intent
        const expiresAt = new Date(Date.now() + INTENT_EXPIRY_MINUTES * 60 * 1000)

        const intent = await prisma.transactionIntent.create({
            data: {
                amount,
                type: type as never,
                description,
                senderType: 'CITIZEN',
                senderId: sender.id,
                receiverType: receiverType as never,
                receiverId,
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
                expiresInMinutes: INTENT_EXPIRY_MINUTES,
                transaction: {
                    amount,
                    currency: world.currencySymbol,
                    sender: sender.displayName,
                    receiver: receiverName,
                    description,
                    type,
                },
            },
        })
    } catch (error) {
        console.error('Error creating transaction intent:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create transaction' },
            { status: 500 }
        )
    }
}

// GET /api/bot/transaction - Check transaction intent status
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
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            )
        }

        // Check and update if expired
        const now = new Date()
        let status = intent.status
        if (now > intent.expiresAt && intent.status === 'PENDING') {
            await prisma.transactionIntent.update({
                where: { id: intent.id },
                data: { status: 'EXPIRED' },
            })
            status = 'EXPIRED'
        }

        return NextResponse.json({
            success: true,
            data: {
                intentId: intent.id,
                status,
                amount: intent.amount,
                type: intent.type,
                description: intent.description,
                createdAt: intent.createdAt.toISOString(),
                expiresAt: intent.expiresAt.toISOString(),
                completedAt: intent.completedAt?.toISOString(),
                transactionId: intent.transactionId,
                errorMessage: intent.errorMessage,
            },
        })
    } catch (error) {
        console.error('Error fetching transaction status:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch transaction status' },
            { status: 500 }
        )
    }
}
