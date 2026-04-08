/**
 * Transaction Confirm API
 * Confirms and executes a transaction intent
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { executeTransaction } from '@/lib/ledger'
import { EntityType } from '@/lib/wallet'

// POST /api/transactions/confirm - Confirm and execute a transaction intent
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Please sign in to confirm this transaction' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { token, action } = body

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token is required' },
                { status: 400 }
            )
        }

        // Get the intent
        const intent = await prisma.transactionIntent.findUnique({
            where: { token },
        })

        if (!intent) {
            return NextResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            )
        }

        // Check if already processed
        if (intent.status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: `Transaction already ${intent.status.toLowerCase()}` },
                { status: 400 }
            )
        }

        // Check if expired
        if (new Date() > intent.expiresAt) {
            await prisma.transactionIntent.update({
                where: { id: intent.id },
                data: { status: 'EXPIRED' },
            })
            return NextResponse.json(
                { success: false, error: 'Transaction has expired' },
                { status: 400 }
            )
        }

        // Verify the user is the sender
        const senderCitizen = await prisma.citizen.findFirst({
            where: {
                id: intent.senderId,
                userId: session.user.id,
            },
        })

        if (!senderCitizen) {
            return NextResponse.json(
                { success: false, error: 'You are not authorized to confirm this transaction' },
                { status: 403 }
            )
        }

        // Handle cancellation
        if (action === 'cancel') {
            await prisma.transactionIntent.update({
                where: { id: intent.id },
                data: { status: 'CANCELLED', completedAt: new Date() },
            })
            return NextResponse.json({
                success: true,
                message: 'Transaction cancelled',
            })
        }

        // Mark as confirmed
        await prisma.transactionIntent.update({
            where: { id: intent.id },
            data: { status: 'CONFIRMED' },
        })

        // Execute the transaction
        const result = await executeTransaction({
            worldId: intent.worldId,
            amount: intent.amount,
            type: intent.type,
            description: intent.description || undefined,
            senderType: intent.senderType as EntityType,
            senderId: intent.senderId,
            receiverType: intent.receiverType as EntityType,
            receiverId: intent.receiverId,
            applyTax: true,
        })

        if (!result.success) {
            await prisma.transactionIntent.update({
                where: { id: intent.id },
                data: {
                    status: 'CANCELLED',
                    errorMessage: result.error,
                    completedAt: new Date(),
                },
            })
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            )
        }

        // Mark as executed
        await prisma.transactionIntent.update({
            where: { id: intent.id },
            data: {
                status: 'EXECUTED',
                transactionId: result.transactionId,
                completedAt: new Date(),
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Transaction completed',
            data: {
                transactionId: result.transactionId,
                amount: intent.amount,
                taxAmount: result.taxAmount,
                netAmount: result.netAmount,
            },
        })
    } catch (error) {
        console.error('Error confirming transaction:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to confirm transaction' },
            { status: 500 }
        )
    }
}
