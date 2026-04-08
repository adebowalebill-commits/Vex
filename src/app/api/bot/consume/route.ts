/**
 * Bot Consume API
 * Consume resources from inventory to replenish survival needs
 * or use items directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

// Maps consumable resource names to the need they replenish
const CONSUMABLE_EFFECTS: Record<string, { need: 'food' | 'water' | 'sleep'; restorePerUnit: number }> = {
    'Food': { need: 'food', restorePerUnit: 10 },
    'Clean Water': { need: 'water', restorePerUnit: 8 },
}

// POST /api/bot/consume — Consume a resource item from inventory
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { citizenId, discordId, discordServerId, resourceName, quantity } = body

        if (!resourceName || !quantity || quantity <= 0) {
            return NextResponse.json(
                { success: false, error: 'resourceName and positive quantity are required' },
                { status: 400 }
            )
        }

        // Resolve citizen
        let targetCitizenId = citizenId

        if (!targetCitizenId && discordId && discordServerId) {
            const world = await prisma.world.findUnique({
                where: { discordServerId },
                select: { id: true },
            })

            if (!world) {
                return NextResponse.json(
                    { success: false, error: 'World not found' },
                    { status: 404 }
                )
            }

            const citizen = await prisma.citizen.findFirst({
                where: { user: { discordId }, worldId: world.id },
                select: { id: true },
            })

            if (!citizen) {
                return NextResponse.json(
                    { success: false, error: 'Citizen not found' },
                    { status: 404 }
                )
            }
            targetCitizenId = citizen.id
        }

        if (!targetCitizenId) {
            return NextResponse.json(
                { success: false, error: 'citizenId or (discordId + discordServerId) required' },
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

        // Check citizen has the item
        const inventoryItem = await prisma.inventoryItem.findUnique({
            where: {
                resourceId_citizenId: {
                    resourceId: resource.id,
                    citizenId: targetCitizenId,
                },
            },
        })

        if (!inventoryItem || inventoryItem.quantity < quantity) {
            return NextResponse.json(
                { success: false, error: `Insufficient ${resourceName}: have ${inventoryItem?.quantity ?? 0}, need ${quantity}` },
                { status: 400 }
            )
        }

        // Check if this resource replenishes a survival need
        const effect = CONSUMABLE_EFFECTS[resourceName]

        const survivalEffect = await prisma.$transaction(async (tx) => {
            // Deduct from inventory
            const newQty = inventoryItem.quantity - quantity
            if (newQty <= 0) {
                await tx.inventoryItem.delete({ where: { id: inventoryItem.id } })
            } else {
                await tx.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: { quantity: newQty },
                })
            }

            // If consumable, replenish survival needs
            if (effect) {
                const needs = await tx.survivalNeeds.findFirst({
                    where: { citizenId: targetCitizenId },
                })

                if (needs) {
                    const needKey = effect.need
                    const currentValue = needKey === 'food' ? needs.food : needKey === 'water' ? needs.water : needs.sleep
                    const restoreAmount = quantity * effect.restorePerUnit
                    const newValue = Math.min(100, currentValue + restoreAmount)

                    await tx.survivalNeeds.update({
                        where: { id: needs.id },
                        data: { [needKey]: newValue },
                    })

                    return {
                        need: needKey,
                        oldValue: currentValue,
                        newValue,
                    }
                }
            }

            return null
        })

        return NextResponse.json({
            success: true,
            data: {
                consumed: { resource: resourceName, quantity },
                survivalEffect,
            },
            message: survivalEffect
                ? `Consumed ${quantity}x ${resourceName} — ${survivalEffect.need} restored to ${survivalEffect.newValue}`
                : `Consumed ${quantity}x ${resourceName}`,
        })
    } catch (error) {
        console.error('Error consuming resource:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to consume resource' },
            { status: 500 }
        )
    }
}
