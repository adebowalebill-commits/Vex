/**
 * Bot Transfer API
 * Transfer inventory items between citizens or between citizen and business.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

// POST /api/bot/transfer — Transfer resources between entities
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const {
            fromCitizenId,
            fromBusinessId,
            toCitizenId,
            toBusinessId,
            resourceName,
            quantity,
            discordServerId,
        } = body

        if (!resourceName || !quantity || quantity <= 0) {
            return NextResponse.json(
                { success: false, error: 'resourceName and positive quantity are required' },
                { status: 400 }
            )
        }

        // Must have exactly one source and one destination
        const fromId = fromCitizenId || fromBusinessId
        const toId = toCitizenId || toBusinessId
        if (!fromId || !toId) {
            return NextResponse.json(
                { success: false, error: 'Source (fromCitizenId or fromBusinessId) and destination (toCitizenId or toBusinessId) are required' },
                { status: 400 }
            )
        }

        // Resolve resource
        const resource = await prisma.resource.findUnique({
            where: { name: resourceName },
        })

        if (!resource) {
            return NextResponse.json(
                { success: false, error: `Resource "${resourceName}" not found` },
                { status: 404 }
            )
        }

        // Check source has enough
        const sourceItem = await prisma.inventoryItem.findFirst({
            where: {
                resourceId: resource.id,
                ...(fromCitizenId ? { citizenId: fromCitizenId } : { businessId: fromBusinessId }),
            },
        })

        if (!sourceItem || sourceItem.quantity < quantity) {
            return NextResponse.json(
                { success: false, error: `Insufficient ${resourceName}: have ${sourceItem?.quantity ?? 0}, need ${quantity}` },
                { status: 400 }
            )
        }

        // Execute transfer atomically
        await prisma.$transaction(async (tx) => {
            // Deduct from source
            const newSourceQty = sourceItem.quantity - quantity
            if (newSourceQty <= 0) {
                await tx.inventoryItem.delete({ where: { id: sourceItem.id } })
            } else {
                await tx.inventoryItem.update({
                    where: { id: sourceItem.id },
                    data: { quantity: newSourceQty },
                })
            }

            // Add to destination (upsert)
            const destWhere = toCitizenId
                ? { resourceId_citizenId: { resourceId: resource.id, citizenId: toCitizenId } }
                : { resourceId_businessId: { resourceId: resource.id, businessId: toBusinessId } }

            const existingDest = await tx.inventoryItem.findUnique({
                where: destWhere as any,
            })

            if (existingDest) {
                await tx.inventoryItem.update({
                    where: { id: existingDest.id },
                    data: { quantity: { increment: quantity } },
                })
            } else {
                await tx.inventoryItem.create({
                    data: {
                        quantity,
                        resourceId: resource.id,
                        ...(toCitizenId ? { citizenId: toCitizenId } : { businessId: toBusinessId }),
                    },
                })
            }

            // Resolve worldId for transaction record
            let worldId: string | undefined
            if (discordServerId) {
                const world = await tx.world.findUnique({
                    where: { discordServerId },
                    select: { id: true },
                })
                worldId = world?.id
            }

            if (worldId) {
                await tx.transaction.create({
                    data: {
                        amount: quantity * resource.baseValue,
                        type: 'TRANSFER',
                        description: `Transferred ${quantity}x ${resourceName}`,
                        status: 'COMPLETED',
                        worldId,
                        ...(fromCitizenId ? { senderCitizenId: fromCitizenId } : {}),
                        ...(toCitizenId ? { receiverCitizenId: toCitizenId } : {}),
                    },
                })
            }
        })

        return NextResponse.json({
            success: true,
            message: `Transferred ${quantity}x ${resourceName}`,
        })
    } catch (error) {
        console.error('Error transferring resources:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to transfer resources' },
            { status: 500 }
        )
    }
}
