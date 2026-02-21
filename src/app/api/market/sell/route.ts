/**
 * POST /api/market/sell — Sell resources to a business
 * Auth: session or bot API key
 * Body: { worldId, citizenId, businessId, resourceName, quantity }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateBotApiKey } from '@/lib/bot-auth'
import prisma from '@/lib/prisma'
import { sellToBusiness } from '@/lib/marketplace'

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    const botAuth = validateBotApiKey(request)

    if (!session?.user?.id && !botAuth.authenticated) {
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
        let sellerId = citizenId
        if (!sellerId && session?.user?.id) {
            const citizen = await prisma.citizen.findFirst({
                where: { userId: session.user.id, worldId },
                select: { id: true },
            })
            if (!citizen) {
                return NextResponse.json({ success: false, error: 'You are not a citizen of this world' }, { status: 403 })
            }
            sellerId = citizen.id
        }

        if (!sellerId) {
            return NextResponse.json({ success: false, error: 'citizenId is required' }, { status: 400 })
        }

        const result = await sellToBusiness(sellerId, businessId, resourceName, quantity)
        return NextResponse.json(result, { status: result.success ? 200 : 400 })
    } catch (error) {
        console.error('Error selling resource:', error)
        return NextResponse.json({ success: false, error: 'Sell failed' }, { status: 500 })
    }
}
