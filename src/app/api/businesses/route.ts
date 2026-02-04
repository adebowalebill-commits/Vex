import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { CreateBusinessInput } from '@/types'

// GET /api/businesses - List businesses in a world
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
        const ownerId = searchParams.get('ownerId')
        const regionId = searchParams.get('regionId')

        if (!worldId) {
            return NextResponse.json(
                { success: false, error: 'worldId is required' },
                { status: 400 }
            )
        }

        const where: Record<string, unknown> = { worldId }
        if (ownerId) where.ownerId = ownerId
        if (regionId) where.regionId = regionId

        const businesses = await prisma.business.findMany({
            where,
            include: {
                owner: {
                    select: { id: true, displayName: true },
                },
                region: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { employees: true, inventory: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, data: businesses })
    } catch (error) {
        console.error('Error fetching businesses:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch businesses' },
            { status: 500 }
        )
    }
}

// POST /api/businesses - Create a new business
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body: CreateBusinessInput = await request.json()

        if (!body.name || !body.type || !body.regionId) {
            return NextResponse.json(
                { success: false, error: 'Name, type, and regionId are required' },
                { status: 400 }
            )
        }

        // Get region to determine world
        const region = await prisma.region.findUnique({
            where: { id: body.regionId },
            select: { id: true, worldId: true },
        })

        if (!region) {
            return NextResponse.json(
                { success: false, error: 'Region not found' },
                { status: 404 }
            )
        }

        // Get user's citizen in this world
        const citizen = await prisma.citizen.findFirst({
            where: { worldId: region.worldId, userId: session.user.id },
        })

        if (!citizen) {
            return NextResponse.json(
                { success: false, error: 'You must be a citizen of this world to create a business' },
                { status: 403 }
            )
        }

        // Create the business
        const business = await prisma.business.create({
            data: {
                name: body.name,
                description: body.description,
                type: body.type as never,
                ownerId: citizen.id,
                worldId: region.worldId,
                regionId: body.regionId,
                walletBalance: 0,
            },
            include: {
                owner: { select: { id: true, displayName: true } },
                region: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(
            { success: true, data: business, message: 'Business created successfully' },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error creating business:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create business' },
            { status: 500 }
        )
    }
}
