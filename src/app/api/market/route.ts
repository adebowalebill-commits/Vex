/**
 * GET /api/market — Browse marketplace listings (session-authenticated)
 * Query params: worldId (required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBusinessListings } from '@/lib/marketplace'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const worldId = searchParams.get('worldId')

    if (!worldId) {
        return NextResponse.json({ success: false, error: 'worldId is required' }, { status: 400 })
    }

    try {
        const listings = await getBusinessListings(worldId)
        return NextResponse.json({ success: true, data: listings })
    } catch (error) {
        console.error('Error fetching market listings:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch listings' }, { status: 500 })
    }
}
