import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface RouteParams {
    params: Promise<{ worldId: string }>
}

// GET /api/worlds/[worldId] - Get world details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        const { worldId } = await params

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const world = await prisma.world.findUnique({
            where: { id: worldId },
            include: {
                owner: {
                    select: { id: true, name: true, image: true },
                },
                treasury: true,
                regions: {
                    include: {
                        mayor: { select: { id: true, displayName: true } },
                        _count: { select: { businesses: true } },
                    },
                },
                _count: {
                    select: { citizens: true, businesses: true, regions: true, transactions: true },
                },
            },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found' },
                { status: 404 }
            )
        }

        // Check if user has access to this world
        const hasAccess = world.ownerId === session.user.id ||
            await prisma.citizen.findFirst({
                where: { worldId, userId: session.user.id },
            })

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            )
        }

        return NextResponse.json({ success: true, data: world })
    } catch (error) {
        console.error('Error fetching world:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch world' },
            { status: 500 }
        )
    }
}

// PATCH /api/worlds/[worldId] - Update world settings
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        const { worldId } = await params

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check ownership
        const world = await prisma.world.findUnique({
            where: { id: worldId },
            select: { ownerId: true },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found' },
                { status: 404 }
            )
        }

        if (world.ownerId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only the world owner can modify settings' },
                { status: 403 }
            )
        }

        const body = await request.json()

        // Only allow updating specific fields
        const allowedFields = [
            'name',
            'description',
            'currencyName',
            'currencySymbol',
            'salesTaxRate',
            'incomeTaxRate',
            'propertyTaxRate',
            'decayInterval',
            'isActive',
        ]

        const updateData: Record<string, unknown> = {}
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field]
            }
        }

        const updated = await prisma.world.update({
            where: { id: worldId },
            data: updateData,
            include: {
                owner: { select: { id: true, name: true, image: true } },
            },
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating world:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update world' },
            { status: 500 }
        )
    }
}

// DELETE /api/worlds/[worldId] - Delete a world
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        const { worldId } = await params

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check ownership
        const world = await prisma.world.findUnique({
            where: { id: worldId },
            select: { ownerId: true, name: true },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found' },
                { status: 404 }
            )
        }

        if (world.ownerId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only the world owner can delete the world' },
                { status: 403 }
            )
        }

        // Delete the world (cascades to related entities)
        await prisma.world.delete({
            where: { id: worldId },
        })

        return NextResponse.json({
            success: true,
            message: `World "${world.name}" deleted successfully`,
        })
    } catch (error) {
        console.error('Error deleting world:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete world' },
            { status: 500 }
        )
    }
}
