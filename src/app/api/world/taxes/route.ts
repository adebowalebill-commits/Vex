/**
 * PUT /api/world/taxes — Update tax rates for a world (session-authenticated, owner only)
 * Body: { worldId, salesTaxRate?, incomeTaxRate?, propertyTaxRate? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { worldId, salesTaxRate, incomeTaxRate, propertyTaxRate } = await request.json()

        if (!worldId) {
            return NextResponse.json({ success: false, error: 'worldId is required' }, { status: 400 })
        }

        // Verify the session user owns this world
        const world = await prisma.world.findFirst({
            where: { id: worldId, ownerId: session.user.id },
        })

        if (!world) {
            return NextResponse.json({ success: false, error: 'World not found or you are not the owner' }, { status: 403 })
        }

        // Validate rates (0-100%)
        const rates: Record<string, number> = {}
        if (salesTaxRate !== undefined) {
            if (salesTaxRate < 0 || salesTaxRate > 100) {
                return NextResponse.json({ success: false, error: 'salesTaxRate must be 0-100' }, { status: 400 })
            }
            rates.salesTaxRate = salesTaxRate
        }
        if (incomeTaxRate !== undefined) {
            if (incomeTaxRate < 0 || incomeTaxRate > 100) {
                return NextResponse.json({ success: false, error: 'incomeTaxRate must be 0-100' }, { status: 400 })
            }
            rates.incomeTaxRate = incomeTaxRate
        }
        if (propertyTaxRate !== undefined) {
            if (propertyTaxRate < 0 || propertyTaxRate > 100) {
                return NextResponse.json({ success: false, error: 'propertyTaxRate must be 0-100' }, { status: 400 })
            }
            rates.propertyTaxRate = propertyTaxRate
        }

        if (Object.keys(rates).length === 0) {
            return NextResponse.json({ success: false, error: 'At least one tax rate must be provided' }, { status: 400 })
        }

        // Tax rates live on the World model
        const updated = await prisma.world.update({
            where: { id: worldId },
            data: rates,
            select: {
                salesTaxRate: true,
                incomeTaxRate: true,
                propertyTaxRate: true,
            },
        })

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Tax rates updated',
        })
    } catch (error) {
        console.error('Error updating tax rates:', error)
        return NextResponse.json({ success: false, error: 'Failed to update tax rates' }, { status: 500 })
    }
}
