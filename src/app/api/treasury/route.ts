import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/treasury - Get treasury balance and details
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

        if (!worldId) {
            return NextResponse.json(
                { success: false, error: 'worldId is required' },
                { status: 400 }
            )
        }

        // Check access
        const hasAccess = await prisma.citizen.findFirst({
            where: { worldId, userId: session.user.id },
        }) || await prisma.world.findFirst({
            where: { id: worldId, ownerId: session.user.id },
        })

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            )
        }

        const treasury = await prisma.treasury.findUnique({
            where: { worldId },
        })

        if (!treasury) {
            return NextResponse.json(
                { success: false, error: 'Treasury not found' },
                { status: 404 }
            )
        }

        // Get recent treasury transactions
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                worldId,
                type: { in: ['TAX', 'PERMIT_PURCHASE', 'LAND_PURCHASE', 'TREASURY_SUBSIDY'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        })

        return NextResponse.json({
            success: true,
            data: {
                treasury,
                recentTransactions,
            },
        })
    } catch (error) {
        console.error('Error fetching treasury:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch treasury' },
            { status: 500 }
        )
    }
}

// POST /api/treasury/deposit - Deposit to treasury (e.g., tax collection)
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
        const { worldId, amount, type, description } = body

        if (!worldId || !amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'worldId and positive amount are required' },
                { status: 400 }
            )
        }

        // Only world owners can manually deposit to treasury
        const world = await prisma.world.findUnique({
            where: { id: worldId },
            select: { ownerId: true },
        })

        if (!world || world.ownerId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only the world owner can deposit to treasury' },
                { status: 403 }
            )
        }

        // Update treasury and create transaction record
        const [treasury] = await prisma.$transaction([
            prisma.treasury.update({
                where: { worldId },
                data: {
                    balance: { increment: amount },
                    totalTaxRevenue: type === 'TAX' ? { increment: amount } : undefined,
                    totalPermitRevenue: type === 'PERMIT_PURCHASE' ? { increment: amount } : undefined,
                    totalLandRevenue: type === 'LAND_PURCHASE' ? { increment: amount } : undefined,
                },
            }),
            prisma.transaction.create({
                data: {
                    amount,
                    type: type || 'TRANSFER',
                    description: description || 'Treasury deposit',
                    worldId,
                },
            }),
        ])

        return NextResponse.json({
            success: true,
            data: treasury,
            message: 'Deposit successful',
        })
    } catch (error) {
        console.error('Error depositing to treasury:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to deposit to treasury' },
            { status: 500 }
        )
    }
}
