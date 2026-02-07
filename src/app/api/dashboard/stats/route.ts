import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = session.user.id

        // Get all worlds owned by user
        const ownedWorlds = await prisma.world.findMany({
            where: { ownerId: userId },
            select: { id: true }
        })

        // Get all citizenships
        const citizenships = await prisma.citizen.findMany({
            where: { userId },
            select: {
                id: true,
                walletBalance: true,
                bankBalance: true,
                worldId: true
            }
        })

        // Calculate total balance across all worlds
        const totalBalance = citizenships.reduce(
            (sum, c) => sum + c.walletBalance + c.bankBalance,
            0
        )

        // Get recent transactions (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const citizenIds = citizenships.map(c => c.id)

        // Only query transactions if user has citizenships
        let recentTransactions = 0
        if (citizenIds.length > 0) {
            recentTransactions = await prisma.transaction.count({
                where: {
                    createdAt: { gte: oneDayAgo },
                    OR: [
                        { senderCitizenId: { in: citizenIds } },
                        { receiverCitizenId: { in: citizenIds } }
                    ]
                }
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                totalBalance,
                worldsOwned: ownedWorlds.length,
                citizenships: citizenships.length,
                recentTransactions,
                // Include world IDs for other pages to use
                worldIds: ownedWorlds.map(w => w.id)
            }
        })
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        )
    }
}
