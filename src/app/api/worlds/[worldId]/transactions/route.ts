import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma, TransactionType } from '@prisma/client'

// GET - Get transactions for a world
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { worldId } = await params
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || ''
        const period = searchParams.get('period') || '7d'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const skip = (page - 1) * limit

        // Calculate date filter
        let dateFilter: Date | undefined
        switch (period) {
            case '24h':
                dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000)
                break
            case '7d':
                dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                break
            case '30d':
                dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                break
            default:
                dateFilter = undefined
        }

        // Build where clause with proper types
        const where: Prisma.TransactionWhereInput = {
            worldId,
            ...(dateFilter && { createdAt: { gte: dateFilter } })
        }

        // Only add type filter if it's a valid enum value
        if (type && type !== 'all') {
            const upperType = type.toUpperCase()
            if (Object.values(TransactionType).includes(upperType as TransactionType)) {
                where.type = upperType as TransactionType
            }
        }

        // Get world for currency symbol
        const world = await prisma.world.findUnique({
            where: { id: worldId },
            select: { currencySymbol: true }
        })

        if (!world) {
            return NextResponse.json(
                { error: 'World not found' },
                { status: 404 }
            )
        }

        // Get transactions with pagination
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    senderCitizen: {
                        select: { displayName: true }
                    },
                    receiverCitizen: {
                        select: { displayName: true }
                    },
                    senderBusiness: {
                        select: { name: true }
                    },
                    receiverBusiness: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.transaction.count({ where })
        ])

        // Get stats
        const stats = await prisma.transaction.aggregate({
            where: {
                worldId,
                ...(dateFilter && { createdAt: { gte: dateFilter } })
            },
            _sum: { amount: true },
            _count: true
        })

        return NextResponse.json({
            success: true,
            data: {
                transactions: transactions.map(t => ({
                    id: t.id,
                    amount: t.amount,
                    type: t.type,
                    description: t.description,
                    senderName: t.senderCitizen?.displayName || t.senderBusiness?.name || 'Treasury',
                    receiverName: t.receiverCitizen?.displayName || t.receiverBusiness?.name || 'Treasury',
                    createdAt: t.createdAt
                })),
                stats: {
                    totalVolume: stats._sum.amount || 0,
                    transactionCount: stats._count
                },
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                },
                currencySymbol: world.currencySymbol
            }
        })
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        )
    }
}
