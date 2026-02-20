/**
 * POST /api/market/buy — Buy resources from a business (session-authenticated)
 * Body: { worldId, citizenId?, businessId, resourceName, quantity }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { buyFromBusiness } from '@/lib/marketplace'

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { worldId, citizenId, businessId, resourceName, quantity } = await request.json()

        if (!worldId || !businessId || !resourceName || !quantity) {
            return NextResponse.json(
                { success: false, error: 'worldId, businessId, resourceName, and quantity are required' },
                { status: 400 }
            )
        }

        // Resolve citizenId from session if not provided
        let buyerId = citizenId
        if (!buyerId) {
            const citizen = await prisma.citizen.findFirst({
                where: { userId: session.user.id, worldId },
                select: { id: true },
            })
            if (!citizen) {
                return NextResponse.json({ success: false, error: 'You are not a citizen of this world' }, { status: 403 })
            }
            buyerId = citizen.id
        }

        const result = await buyFromBusiness(buyerId, businessId, resourceName, quantity)
        return NextResponse.json(result, { status: result.success ? 200 : 400 })
    } catch (error) {
        console.error('Error buying resource:', error)
        return NextResponse.json({ success: false, error: 'Purchase failed' }, { status: 500 })
    }
}
