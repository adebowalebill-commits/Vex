/**
 * POST /api/business/hire — Hire a citizen for a business
 * Auth: session (owner check) or bot API key
 * Body: { businessId, citizenId, role?, salary? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateBotApiKey } from '@/lib/bot-auth'
import prisma from '@/lib/prisma'
import { hireCitizen } from '@/lib/employment'

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    const botAuth = validateBotApiKey(request)

    if (!session?.user?.id && !botAuth.authenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { businessId, citizenId, role, salary } = await request.json()

        if (!businessId || !citizenId) {
            return NextResponse.json(
                { success: false, error: 'businessId and citizenId are required' },
                { status: 400 }
            )
        }

        // If session auth, verify ownership. Bot API key skips ownership check.
        if (session?.user?.id && !botAuth.authenticated) {
            const business = await prisma.business.findFirst({
                where: { id: businessId },
                include: { owner: { select: { userId: true } } },
            })

            if (!business) {
                return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
            }

            if (business.owner.userId !== session.user.id) {
                return NextResponse.json({ success: false, error: 'You do not own this business' }, { status: 403 })
            }
        }

        const result = await hireCitizen(businessId, citizenId, role || 'Worker', salary || 0)
        return NextResponse.json(result, { status: result.success ? 201 : 400 })
    } catch (error) {
        console.error('Error hiring citizen:', error)
        return NextResponse.json({ success: false, error: 'Hire failed' }, { status: 500 })
    }
}
