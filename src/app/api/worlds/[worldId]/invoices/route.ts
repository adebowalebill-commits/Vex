/**
 * GET /api/worlds/[worldId]/invoices — All invoices in a world
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

    const invoices = await prisma.invoice.findMany({
        where: { worldId },
        include: {
            senderCitizen: { select: { displayName: true } },
            senderBusiness: { select: { name: true } },
            receiverCitizen: { select: { displayName: true } },
            receiverBusiness: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    })

    return NextResponse.json({ success: true, data: invoices })
}
