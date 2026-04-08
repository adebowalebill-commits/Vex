/**
 * Bot Market API
 * Browse marketplace listings and buy/sell resources.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'
import { buyFromBusiness, sellToBusiness, getBusinessListings } from '@/lib/marketplace'

// GET /api/bot/market — Browse marketplace listings
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const discordServerId = searchParams.get('discordServerId')
        const worldId = searchParams.get('worldId')

        let targetWorldId = worldId

        if (!targetWorldId && discordServerId) {
            const world = await prisma.world.findUnique({ where: { discordServerId }, select: { id: true } })
            if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })
            targetWorldId = world.id
        }

        if (!targetWorldId) {
            return NextResponse.json({ success: false, error: 'worldId or discordServerId required' }, { status: 400 })
        }

        const listings = await getBusinessListings(targetWorldId)

        return NextResponse.json({ success: true, data: listings })
    } catch (error) {
        console.error('Error fetching market listings:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch listings' }, { status: 500 })
    }
}

// POST /api/bot/market — Buy or sell resources
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { action, discordId, discordServerId, citizenId, businessId, resourceName, quantity } = body

        if (!action || !businessId || !resourceName || !quantity || quantity <= 0) {
            return NextResponse.json(
                { success: false, error: 'action, businessId, resourceName, and positive quantity required' },
                { status: 400 }
            )
        }

        // Resolve citizen
        let targetCitizenId = citizenId
        if (!targetCitizenId && discordId && discordServerId) {
            const world = await prisma.world.findUnique({ where: { discordServerId }, select: { id: true } })
            if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })

            const citizen = await prisma.citizen.findFirst({
                where: { user: { discordId }, worldId: world.id },
                select: { id: true },
            })
            if (!citizen) return NextResponse.json({ success: false, error: 'Citizen not found' }, { status: 404 })
            targetCitizenId = citizen.id
        }

        if (!targetCitizenId) {
            return NextResponse.json({ success: false, error: 'citizenId or discordId + discordServerId required' }, { status: 400 })
        }

        let result
        if (action === 'buy') {
            result = await buyFromBusiness(targetCitizenId, businessId, resourceName, quantity)
        } else if (action === 'sell') {
            result = await sellToBusiness(targetCitizenId, businessId, resourceName, quantity)
        } else {
            return NextResponse.json({ success: false, error: 'action must be "buy" or "sell"' }, { status: 400 })
        }

        return NextResponse.json(result, { status: result.success ? 200 : 400 })
    } catch (error) {
        console.error('Error processing market trade:', error)
        return NextResponse.json({ success: false, error: 'Trade failed' }, { status: 500 })
    }
}
