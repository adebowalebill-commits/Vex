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
            }
        })

        if (!world) {
            return NextResponse.json(
                { error: 'World not found or access denied' },
                { status: 404 }
            )
        }

        // Get all regions in this world
        const regions = await prisma.region.findMany({
            where: { worldId },
            include: {
                mayor: {
                    select: { displayName: true }
                },
                _count: {
                    select: {
                        businesses: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        // Get citizen counts per region if needed
        // For now, regions don't have citizens directly attached
        // This may need adjustment based on actual schema

        return NextResponse.json({
            success: true,
            data: {
                regions: regions.map(r => ({
                    id: r.id,
                    name: r.name,
                    description: r.description,
                    mayorName: r.mayor?.displayName || null,
                    citizenCount: 0, // Regions may not have direct citizen count in schema
                    businessCount: r._count.businesses,
                    isActive: r.isActive,
                    createdAt: r.createdAt.toISOString()
                })),
                stats: {
                    total: regions.length,
                    active: regions.filter(r => r.isActive).length,
                    totalPopulation: 0 // Would need to aggregate from region-based citizens
                }
            }
        })
    } catch (error) {
        console.error('Error fetching regions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch regions' },
            { status: 500 }
        )
    }
}
