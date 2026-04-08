/**
 * GET /api/worlds/[worldId]/inventory — All inventory items in a world
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { worldId } = await params

    // Verify access
    const world = await prisma.world.findFirst({
        where: {
            id: worldId,
            OR: [
                { ownerId: session.user.id },
                { citizens: { some: { userId: session.user.id } } },
            ],
        },
        select: { id: true },
    })

    if (!world) {
        return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })
    }

    // Get all inventory items (citizen + business)
    const items = await prisma.inventoryItem.findMany({
        where: {
            OR: [
                { citizen: { worldId } },
                { business: { worldId } },
            ],
        },
        include: {
            resource: { select: { name: true, category: true, baseValue: true } },
            citizen: { select: { displayName: true } },
            business: { select: { name: true } },
        },
        orderBy: { resource: { name: 'asc' } },
    })

    return NextResponse.json({ success: true, data: items })
}
