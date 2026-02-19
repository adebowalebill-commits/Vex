/**
 * Bot Business API
 * Bot-facing CRUD for business management.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

// GET /api/bot/business — Look up businesses by owner discord ID
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const discordId = searchParams.get('discordId')
        const discordServerId = searchParams.get('discordServerId')
        const businessId = searchParams.get('businessId')

        // Direct lookup by business ID
        if (businessId) {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                include: {
                    owner: { select: { displayName: true } },
                    region: { select: { name: true } },
                    _count: { select: { employees: true, inventory: true } },
                    productionInputs: { include: { resource: true } },
                    productionOutputs: { include: { resource: true } },
                },
            })

            if (!business) {
                return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
            }

            return NextResponse.json({ success: true, data: business })
        }

        // Look up by discord ID
        if (!discordId || !discordServerId) {
            return NextResponse.json(
                { success: false, error: 'discordId + discordServerId or businessId required' },
                { status: 400 }
            )
        }

        const world = await prisma.world.findUnique({
            where: { discordServerId },
            select: { id: true },
        })

        if (!world) {
            return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })
        }

        const citizen = await prisma.citizen.findFirst({
            where: { user: { discordId }, worldId: world.id },
            select: { id: true },
        })

        if (!citizen) {
            return NextResponse.json({ success: false, error: 'Citizen not found' }, { status: 404 })
        }

        const businesses = await prisma.business.findMany({
            where: { ownerId: citizen.id, worldId: world.id },
            include: {
                region: { select: { name: true } },
                _count: { select: { employees: true, inventory: true } },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, data: businesses })
    } catch (error) {
        console.error('Error fetching businesses:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch businesses' }, { status: 500 })
    }
}

// POST /api/bot/business — Create a business via bot
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { discordId, discordServerId, name, type, regionId, description } = body

        if (!discordId || !discordServerId || !name || !type || !regionId) {
            return NextResponse.json(
                { success: false, error: 'discordId, discordServerId, name, type, and regionId are required' },
                { status: 400 }
            )
        }

        const world = await prisma.world.findUnique({
            where: { discordServerId },
            select: { id: true },
        })

        if (!world) {
            return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })
        }

        const citizen = await prisma.citizen.findFirst({
            where: { user: { discordId }, worldId: world.id },
            select: { id: true },
        })

        if (!citizen) {
            return NextResponse.json({ success: false, error: 'Citizen not found' }, { status: 404 })
        }

        // Verify region belongs to this world
        const region = await prisma.region.findFirst({
            where: { id: regionId, worldId: world.id },
        })

        if (!region) {
            return NextResponse.json({ success: false, error: 'Region not found in this world' }, { status: 404 })
        }

        // Create business with production chain setup
        const business = await prisma.business.create({
            data: {
                name,
                description: description || '',
                type: type as never,
                ownerId: citizen.id,
                worldId: world.id,
                regionId,
                walletBalance: 0,
            },
            include: {
                owner: { select: { displayName: true } },
                region: { select: { name: true } },
            },
        })

        // Auto-setup production inputs/outputs from seed chain definitions
        try {
            const { PRODUCTION_CHAINS } = await import('@/../../scripts/seed-resources')
            const chain = PRODUCTION_CHAINS[type]

            if (chain) {
                // Set operating cost
                await prisma.business.update({
                    where: { id: business.id },
                    data: { operatingCost: chain.operatingCost },
                })

                // Create production inputs
                for (const input of chain.inputs) {
                    const resource = await prisma.resource.findUnique({ where: { name: input.resource } })
                    if (resource) {
                        await prisma.productionInput.create({
                            data: {
                                quantity: input.quantity,
                                resourceId: resource.id,
                                businessId: business.id,
                            },
                        })
                    }
                }

                // Create production outputs
                for (const output of chain.outputs) {
                    const resource = await prisma.resource.findUnique({ where: { name: output.resource } })
                    if (resource) {
                        await prisma.productionOutput.create({
                            data: {
                                quantity: output.quantity,
                                resourceId: resource.id,
                                businessId: business.id,
                            },
                        })
                    }
                }
            }
        } catch {
            // Chain setup is best-effort — business is still created
            console.warn('Could not auto-setup production chain for', type)
        }

        return NextResponse.json({
            success: true,
            data: business,
            message: `Business "${name}" created in ${region.name}`,
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating business:', error)
        return NextResponse.json({ success: false, error: 'Failed to create business' }, { status: 500 })
    }
}

// PATCH /api/bot/business — Update business settings
export async function PATCH(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { businessId, isOperating, name, description } = body

        if (!businessId) {
            return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
        }

        const updateData: Record<string, unknown> = {}
        if (isOperating !== undefined) updateData.isOperating = isOperating
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
        }

        const business = await prisma.business.update({
            where: { id: businessId },
            data: updateData,
        })

        return NextResponse.json({
            success: true,
            data: business,
            message: `Business "${business.name}" updated`,
        })
    } catch (error) {
        console.error('Error updating business:', error)
        return NextResponse.json({ success: false, error: 'Failed to update business' }, { status: 500 })
    }
}

// DELETE /api/bot/business — Close/deactivate a business
export async function DELETE(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const businessId = searchParams.get('businessId')

        if (!businessId) {
            return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
        }

        const business = await prisma.business.update({
            where: { id: businessId },
            data: { isActive: false, isOperating: false },
        })

        return NextResponse.json({
            success: true,
            message: `Business "${business.name}" has been closed`,
        })
    } catch (error) {
        console.error('Error closing business:', error)
        return NextResponse.json({ success: false, error: 'Failed to close business' }, { status: 500 })
    }
}
