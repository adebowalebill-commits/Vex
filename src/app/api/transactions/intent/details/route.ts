/**
 * Transaction Intent Details API
 * Used by the confirmation page to display intent details
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { calculateTax } from '@/lib/ledger'

// GET /api/transactions/intent/details - Get intent details for UI
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token is required' },
                { status: 400 }
            )
        }

        const intent = await prisma.transactionIntent.findUnique({
            where: { token },
        })

        if (!intent) {
            return NextResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            )
        }

        // Check if expired
        if (new Date() > intent.expiresAt && intent.status === 'PENDING') {
            await prisma.transactionIntent.update({
                where: { id: intent.id },
                data: { status: 'EXPIRED' },
            })
            return NextResponse.json(
                { success: false, error: 'Transaction has expired' },
                { status: 400 }
            )
        }

        if (intent.status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: `Transaction already ${intent.status.toLowerCase()}` },
                { status: 400 }
            )
        }

        // Get world info
        const world = await prisma.world.findUnique({
            where: { id: intent.worldId },
            select: { name: true, currencySymbol: true },
        })

        // Get sender name
        let senderName = 'Unknown'
        if (intent.senderType === 'CITIZEN') {
            const citizen = await prisma.citizen.findUnique({
                where: { id: intent.senderId },
                select: { displayName: true },
            })
            senderName = citizen?.displayName || 'Unknown'
        } else if (intent.senderType === 'BUSINESS') {
            const business = await prisma.business.findUnique({
                where: { id: intent.senderId },
                select: { name: true },
            })
            senderName = business?.name || 'Unknown'
        }

        // Get receiver name
        let receiverName = 'Unknown'
        if (intent.receiverType === 'CITIZEN') {
            const citizen = await prisma.citizen.findUnique({
                where: { id: intent.receiverId },
                select: { displayName: true },
            })
            receiverName = citizen?.displayName || 'Unknown'
        } else if (intent.receiverType === 'BUSINESS') {
            const business = await prisma.business.findUnique({
                where: { id: intent.receiverId },
                select: { name: true },
            })
            receiverName = business?.name || 'Unknown'
        } else if (intent.receiverType === 'TREASURY') {
            receiverName = `${world?.name || 'World'} Treasury`
        }

        // Calculate tax preview
        const taxInfo = await calculateTax(intent.amount, intent.worldId, intent.type)

        return NextResponse.json({
            success: true,
            data: {
                intentId: intent.id,
                amount: intent.amount,
                type: intent.type,
                description: intent.description,
                sender: senderName,
                receiver: receiverName,
                expiresAt: intent.expiresAt.toISOString(),
                currencySymbol: world?.currencySymbol || '©',
                worldName: world?.name || 'Unknown',
                taxAmount: taxInfo.taxAmount,
                netAmount: taxInfo.netAmount,
            },
        })
    } catch (error) {
        console.error('Error fetching intent details:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch transaction details' },
            { status: 500 }
        )
    }
}
