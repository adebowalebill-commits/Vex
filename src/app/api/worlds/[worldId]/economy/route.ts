import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: Request,
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

        // Verify user has access to this world
        const world = await prisma.world.findFirst({
            where: {
                id: worldId,
                OR: [
                    { ownerId: session.user.id },
                    { citizens: { some: { userId: session.user.id } } }
                ]
            },
            include: {
                treasury: { select: { balance: true } },
                _count: {
                    select: {
                        citizens: true,
                        businesses: true
                    }
                }
            }
        })

        if (!world) {
            return NextResponse.json(
                { error: 'World not found or access denied' },
                { status: 404 }
            )
        }

        // Calculate money supply (sum of all citizen and business balances)
        const citizenBalances = await prisma.citizen.aggregate({
            where: { worldId },
            _sum: {
                walletBalance: true,
                bankBalance: true
            }
        })

        const businessBalances = await prisma.business.aggregate({
            where: { worldId },
            _sum: {
                walletBalance: true
            }
        })

        const moneySupply =
            (citizenBalances._sum.walletBalance || 0) +
            (citizenBalances._sum.bankBalance || 0) +
            (businessBalances._sum?.walletBalance || 0) +
            (world.treasury?.balance || 0)

        // Calculate daily volume (transactions from last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const dailyVolumeResult = await prisma.transaction.aggregate({
            where: {
                worldId,
                createdAt: { gte: oneDayAgo }
            },
            _sum: { amount: true }
        })

        // Get employment count
        const employmentCount = await prisma.employee.count({
            where: {
                business: { worldId }
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                moneySupply,
                treasuryBalance: world.treasury?.balance || 0,
                dailyVolume: dailyVolumeResult._sum.amount || 0,
                citizenCount: world._count.citizens,
                businessCount: world._count.businesses,
                employmentCount,
                currencySymbol: world.currencySymbol
            }
        })
    } catch (error) {
        console.error('Error fetching economy stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch economy stats' },
            { status: 500 }
        )
    }
}
