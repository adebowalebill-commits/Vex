import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'


// GET /api/transactions - List transactions
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const worldId = searchParams.get('worldId')
        const citizenId = searchParams.get('citizenId')
        const businessId = searchParams.get('businessId')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!worldId) {
            return NextResponse.json(
                { success: false, error: 'worldId is required' },
                { status: 400 }
            )
        }

        // Build where clause
        const where: Record<string, unknown> = { worldId }

        if (citizenId) {
            where.OR = [
                { senderCitizenId: citizenId },
                { receiverCitizenId: citizenId },
            ]
        }

        if (businessId) {
            where.OR = [
                { senderBusinessId: businessId },
                { receiverBusinessId: businessId },
            ]
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    senderCitizen: { select: { id: true, displayName: true } },
                    senderBusiness: { select: { id: true, name: true } },
                    receiverCitizen: { select: { id: true, displayName: true } },
                    receiverBusiness: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.transaction.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            data: transactions,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        })
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch transactions' },
            { status: 500 }
        )
    }
}

// POST /api/transactions - Create a new transaction (transfer)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const {
            worldId,
            amount,
            type = 'TRANSFER',
            description,
            senderCitizenId,
            senderBusinessId,
            receiverCitizenId,
            receiverBusinessId,
        } = body

        // Validation
        if (!worldId || !amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'worldId and positive amount are required' },
                { status: 400 }
            )
        }

        if (!senderCitizenId && !senderBusinessId) {
            return NextResponse.json(
                { success: false, error: 'Sender (citizen or business) is required' },
                { status: 400 }
            )
        }

        if (!receiverCitizenId && !receiverBusinessId) {
            return NextResponse.json(
                { success: false, error: 'Receiver (citizen or business) is required' },
                { status: 400 }
            )
        }

        // Verify sender ownership
        if (senderCitizenId) {
            const citizen = await prisma.citizen.findUnique({
                where: { id: senderCitizenId },
                select: { userId: true, walletBalance: true },
            })

            if (!citizen || citizen.userId !== session.user.id) {
                return NextResponse.json(
                    { success: false, error: 'You can only send from your own accounts' },
                    { status: 403 }
                )
            }

            if (citizen.walletBalance < amount) {
                return NextResponse.json(
                    { success: false, error: 'Insufficient balance' },
                    { status: 400 }
                )
            }
        }

        if (senderBusinessId) {
            const business = await prisma.business.findUnique({
                where: { id: senderBusinessId },
                include: { owner: { select: { userId: true } } },
            })

            if (!business || business.owner.userId !== session.user.id) {
                return NextResponse.json(
                    { success: false, error: 'You can only send from your own businesses' },
                    { status: 403 }
                )
            }

            if (business.walletBalance < amount) {
                return NextResponse.json(
                    { success: false, error: 'Insufficient business balance' },
                    { status: 400 }
                )
            }
        }

        // Get world tax rate
        const world = await prisma.world.findUnique({
            where: { id: worldId },
            select: { salesTaxRate: true },
        })

        const taxAmount = type === 'PAYMENT' ? amount * ((world?.salesTaxRate || 0) / 100) : 0
        const netAmount = amount - taxAmount

        // Execute transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transaction = await prisma.$transaction(async (tx: any) => {
            // Deduct from sender
            if (senderCitizenId) {
                await tx.citizen.update({
                    where: { id: senderCitizenId },
                    data: { walletBalance: { decrement: amount } },
                })
            } else if (senderBusinessId) {
                await tx.business.update({
                    where: { id: senderBusinessId },
                    data: { walletBalance: { decrement: amount } },
                })
            }

            // Add to receiver
            if (receiverCitizenId) {
                await tx.citizen.update({
                    where: { id: receiverCitizenId },
                    data: { walletBalance: { increment: netAmount } },
                })
            } else if (receiverBusinessId) {
                await tx.business.update({
                    where: { id: receiverBusinessId },
                    data: { walletBalance: { increment: netAmount } },
                })
            }

            // Add tax to treasury if applicable
            if (taxAmount > 0) {
                await tx.treasury.update({
                    where: { worldId },
                    data: {
                        balance: { increment: taxAmount },
                        totalTaxRevenue: { increment: taxAmount },
                    },
                })
            }

            // Create transaction record
            return tx.transaction.create({
                data: {
                    amount,
                    type: type as never,
                    description,
                    taxAmount,
                    worldId,
                    senderCitizenId,
                    senderBusinessId,
                    receiverCitizenId,
                    receiverBusinessId,
                },
                include: {
                    senderCitizen: { select: { id: true, displayName: true } },
                    senderBusiness: { select: { id: true, name: true } },
                    receiverCitizen: { select: { id: true, displayName: true } },
                    receiverBusiness: { select: { id: true, name: true } },
                },
            })
        })

        return NextResponse.json(
            { success: true, data: transaction, message: 'Transaction completed' },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error creating transaction:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create transaction' },
            { status: 500 }
        )
    }
}
