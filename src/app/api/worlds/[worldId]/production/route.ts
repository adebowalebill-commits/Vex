/**
 * GET /api/worlds/[worldId]/production — Production chains for all businesses
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

    const businesses = await prisma.business.findMany({
        where: { worldId, isActive: true },
        include: {
            productionInputs: { include: { resource: { select: { name: true } } } },
            productionOutputs: { include: { resource: { select: { name: true } } } },
            _count: { select: { employees: true } },
        },
        orderBy: { name: 'asc' },
    })

    const data = businesses.map(b => ({
        businessId: b.id,
        businessName: b.name,
        type: b.type,
        isOperating: b.isOperating,
        operatingCost: b.operatingCost,
        inputs: b.productionInputs.map(pi => ({
            resource: pi.resource.name,
            quantity: pi.quantity,
        })),
        outputs: b.productionOutputs.map(po => ({
            resource: po.resource.name,
            quantity: po.quantity,
        })),
        employeeCount: b._count.employees,
    }))

    return NextResponse.json({ success: true, data })
}
