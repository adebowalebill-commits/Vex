import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - List citizens in a world
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
        const search = searchParams.get('search') || ''
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const skip = (page - 1) * limit

        // Verify world exists and user has access
        const world = await prisma.world.findUnique({
            where: { id: worldId }
        })

        if (!world) {
            return NextResponse.json(
                { error: 'World not found' },
                { status: 404 }
            )
        }

        // Build where clause with search
        const where = {
            worldId,
            ...(search && {
                OR: [
                    { displayName: { contains: search, mode: 'insensitive' as const } },
                    { user: { discordId: { contains: search } } }
                ]
            })
        }

        // Get citizens with pagination
        const [citizens, total] = await Promise.all([
            prisma.citizen.findMany({
                where,
                include: {
                    user: {
                        select: {
                            discordId: true,
                            image: true
                        }
                    },
                    survivalNeeds: true,
                    _count: {
                        select: {
                            ownedBusinesses: true,
                            employments: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.citizen.count({ where })
        ])

        return NextResponse.json({
            success: true,
            data: {
                citizens: citizens.map(c => ({
                    id: c.id,
                    displayName: c.displayName,
                    discordId: c.user.discordId,
                    image: c.user.image,
                    walletBalance: c.walletBalance,
                    bankBalance: c.bankBalance,
                    totalBalance: c.walletBalance + c.bankBalance,
                    businessCount: c._count.ownedBusinesses,
                    employmentCount: c._count.employments,
                    survivalNeeds: c.survivalNeeds ? {
                        food: c.survivalNeeds.food,
                        water: c.survivalNeeds.water,
                        sleep: c.survivalNeeds.sleep
                    } : null,
                    isActive: c.isActive,
                    createdAt: c.createdAt
                })),
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
        console.error('Error fetching citizens:', error)
        return NextResponse.json(
            { error: 'Failed to fetch citizens' },
            { status: 500 }
        )
    }
}
