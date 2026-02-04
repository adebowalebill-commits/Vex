import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/citizens - List citizens in a world
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

        // Verify user has access to this world
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

        const citizens = await prisma.citizen.findMany({
            where: { worldId, isActive: true },
            include: {
                user: {
                    select: { id: true, name: true, image: true, discordId: true },
                },
                survivalNeeds: true,
                ownedBusinesses: {
                    select: { id: true, name: true, type: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, data: citizens })
    } catch (error) {
        console.error('Error fetching citizens:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch citizens' },
            { status: 500 }
        )
    }
}

// POST /api/citizens - Register as a citizen in a world
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
        const { worldId, displayName } = body

        if (!worldId) {
            return NextResponse.json(
                { success: false, error: 'worldId is required' },
                { status: 400 }
            )
        }

        // Check if world exists
        const world = await prisma.world.findUnique({
            where: { id: worldId },
            select: { id: true, initialCitizenBalance: true, isActive: true },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found' },
                { status: 404 }
            )
        }

        if (!world.isActive) {
            return NextResponse.json(
                { success: false, error: 'This world is not accepting new citizens' },
                { status: 400 }
            )
        }

        // Check if already a citizen
        const existing = await prisma.citizen.findFirst({
            where: { worldId, userId: session.user.id },
        })

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'You are already a citizen of this world' },
                { status: 409 }
            )
        }

        // Create citizen with survival needs
        const citizen = await prisma.citizen.create({
            data: {
                displayName: displayName || session.user.name || 'New Citizen',
                walletBalance: world.initialCitizenBalance,
                bankBalance: 0,
                userId: session.user.id,
                worldId,
                survivalNeeds: {
                    create: {
                        food: 100,
                        water: 100,
                        sleep: 100,
                    },
                },
            },
            include: {
                user: {
                    select: { id: true, name: true, image: true },
                },
                survivalNeeds: true,
            },
        })

        return NextResponse.json(
            { success: true, data: citizen, message: 'Successfully registered as citizen' },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error registering citizen:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to register as citizen' },
            { status: 500 }
        )
    }
}
