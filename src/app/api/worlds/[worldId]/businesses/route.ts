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
            select: {
                currencySymbol: true
            }
        })

        if (!world) {
            return NextResponse.json(
                { error: 'World not found or access denied' },
                { status: 404 }
            )
        }

        // Get all businesses in this world
        const businesses = await prisma.business.findMany({
            where: { worldId },
            include: {
                owner: {
                    select: { displayName: true }
                },
                _count: {
                    select: { employees: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Calculate stats
        const totalBalance = businesses.reduce(
            (sum, b) => sum + b.walletBalance, 0
        )
        const operating = businesses.filter(b => b.isOperating).length

        return NextResponse.json({
            success: true,
            data: {
                businesses: businesses.map(b => ({
                    id: b.id,
                    name: b.name,
                    type: b.type,
                    ownerName: b.owner?.displayName || 'Unknown',
                    walletBalance: b.walletBalance,
                    bankBalance: 0, // Business model doesn't have bankBalance
                    employeeCount: b._count.employees,
                    isOperating: b.isOperating,
                    createdAt: b.createdAt.toISOString()
                })),
                stats: {
                    total: businesses.length,
                    operating,
                    totalBalance
                },
                currencySymbol: world.currencySymbol
            }
        })
    } catch (error) {
        console.error('Error fetching businesses:', error)
        return NextResponse.json(
            { error: 'Failed to fetch businesses' },
            { status: 500 }
        )
    }
}
