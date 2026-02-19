/**
 * Marketplace Engine
 * Handles buying/selling resources between citizens and businesses.
 */

import prisma from '@/lib/prisma'

export interface TradeResult {
    success: boolean
    message?: string
    totalCost?: number
    quantity?: number
    resource?: string
    error?: string
}

/**
 * Buy resources from a business
 * Citizen pays business, receives inventory items
 */
export async function buyFromBusiness(
    citizenId: string,
    businessId: string,
    resourceName: string,
    quantity: number
): Promise<TradeResult> {
    try {
        // Get resource
        const resource = await prisma.resource.findUnique({ where: { name: resourceName } })
        if (!resource) return { success: false, error: `Resource "${resourceName}" not found` }

        // Get business with inventory
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { id: true, name: true, worldId: true, isActive: true },
        })
        if (!business || !business.isActive) return { success: false, error: 'Business not found or inactive' }

        // Check business has stock
        const stock = await prisma.inventoryItem.findUnique({
            where: { resourceId_businessId: { resourceId: resource.id, businessId } },
        })
        if (!stock || stock.quantity < quantity) {
            return { success: false, error: `${business.name} has insufficient ${resourceName}: ${stock?.quantity ?? 0} available` }
        }

        // Calculate cost
        const totalCost = quantity * resource.baseValue

        // Check citizen can afford
        const citizen = await prisma.citizen.findUnique({
            where: { id: citizenId },
            select: { walletBalance: true, worldId: true },
        })
        if (!citizen) return { success: false, error: 'Citizen not found' }
        if (citizen.worldId !== business.worldId) return { success: false, error: 'Citizen and business must be in the same world' }
        if (citizen.walletBalance < totalCost) {
            return { success: false, error: `Insufficient funds: need ${totalCost}, have ${citizen.walletBalance}` }
        }

        // Execute trade atomically
        await prisma.$transaction(async (tx) => {
            // Deduct money from citizen
            await tx.citizen.update({
                where: { id: citizenId },
                data: { walletBalance: { decrement: totalCost } },
            })

            // Add money to business
            await tx.business.update({
                where: { id: businessId },
                data: { walletBalance: { increment: totalCost } },
            })

            // Deduct stock from business
            const newStockQty = stock.quantity - quantity
            if (newStockQty <= 0) {
                await tx.inventoryItem.delete({ where: { id: stock.id } })
            } else {
                await tx.inventoryItem.update({ where: { id: stock.id }, data: { quantity: newStockQty } })
            }

            // Add to citizen inventory (upsert)
            const existingItem = await tx.inventoryItem.findUnique({
                where: { resourceId_citizenId: { resourceId: resource.id, citizenId } },
            })
            if (existingItem) {
                await tx.inventoryItem.update({ where: { id: existingItem.id }, data: { quantity: { increment: quantity } } })
            } else {
                await tx.inventoryItem.create({ data: { quantity, resourceId: resource.id, citizenId } })
            }

            // Record transaction
            await tx.transaction.create({
                data: {
                    amount: totalCost,
                    type: 'PAYMENT',
                    description: `Bought ${quantity}x ${resourceName} from ${business.name}`,
                    status: 'COMPLETED',
                    worldId: business.worldId,
                    senderCitizenId: citizenId,
                    receiverBusinessId: businessId,
                },
            })
        })

        return { success: true, message: `Bought ${quantity}x ${resourceName} for ${totalCost}`, totalCost, quantity, resource: resourceName }
    } catch (error) {
        console.error('Error buying from business:', error)
        return { success: false, error: 'Trade failed' }
    }
}

/**
 * Sell resources to a business
 * Citizen gives inventory to business, receives payment
 */
export async function sellToBusiness(
    citizenId: string,
    businessId: string,
    resourceName: string,
    quantity: number
): Promise<TradeResult> {
    try {
        const resource = await prisma.resource.findUnique({ where: { name: resourceName } })
        if (!resource) return { success: false, error: `Resource "${resourceName}" not found` }

        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { id: true, name: true, worldId: true, isActive: true, walletBalance: true },
        })
        if (!business || !business.isActive) return { success: false, error: 'Business not found or inactive' }

        // Check citizen has the resource
        const citizenStock = await prisma.inventoryItem.findUnique({
            where: { resourceId_citizenId: { resourceId: resource.id, citizenId } },
        })
        if (!citizenStock || citizenStock.quantity < quantity) {
            return { success: false, error: `Insufficient ${resourceName}: have ${citizenStock?.quantity ?? 0}` }
        }

        // Sell at 70% of base value (businesses buy at discount)
        const sellPrice = Math.floor(quantity * resource.baseValue * 0.7)

        if (business.walletBalance < sellPrice) {
            return { success: false, error: `${business.name} cannot afford to buy: needs ${sellPrice}` }
        }

        await prisma.$transaction(async (tx) => {
            // Deduct from citizen inventory
            const newCitizenQty = citizenStock.quantity - quantity
            if (newCitizenQty <= 0) {
                await tx.inventoryItem.delete({ where: { id: citizenStock.id } })
            } else {
                await tx.inventoryItem.update({ where: { id: citizenStock.id }, data: { quantity: newCitizenQty } })
            }

            // Add to business inventory
            const existingBizItem = await tx.inventoryItem.findUnique({
                where: { resourceId_businessId: { resourceId: resource.id, businessId } },
            })
            if (existingBizItem) {
                await tx.inventoryItem.update({ where: { id: existingBizItem.id }, data: { quantity: { increment: quantity } } })
            } else {
                await tx.inventoryItem.create({ data: { quantity, resourceId: resource.id, businessId } })
            }

            // Pay citizen
            await tx.citizen.update({
                where: { id: citizenId },
                data: { walletBalance: { increment: sellPrice } },
            })

            // Deduct from business
            await tx.business.update({
                where: { id: businessId },
                data: { walletBalance: { decrement: sellPrice } },
            })

            // Record transaction
            await tx.transaction.create({
                data: {
                    amount: sellPrice,
                    type: 'PAYMENT',
                    description: `Sold ${quantity}x ${resourceName} to ${business.name}`,
                    status: 'COMPLETED',
                    worldId: business.worldId,
                    senderBusinessId: businessId,
                    receiverCitizenId: citizenId,
                },
            })
        })

        return { success: true, message: `Sold ${quantity}x ${resourceName} for ${sellPrice}`, totalCost: sellPrice, quantity, resource: resourceName }
    } catch (error) {
        console.error('Error selling to business:', error)
        return { success: false, error: 'Trade failed' }
    }
}

/**
 * Get all business listings in a world (available inventory for purchase)
 */
export async function getBusinessListings(worldId: string) {
    const businesses = await prisma.business.findMany({
        where: { worldId, isActive: true, isOperating: true },
        include: {
            inventory: {
                where: { quantity: { gt: 0 } },
                include: { resource: true },
            },
            region: { select: { name: true } },
        },
    })

    return businesses
        .filter(b => b.inventory.length > 0)
        .map(b => ({
            businessId: b.id,
            businessName: b.name,
            type: b.type,
            region: b.region.name,
            listings: b.inventory.map(item => ({
                resource: item.resource.name,
                category: item.resource.category,
                quantity: item.quantity,
                pricePerUnit: item.resource.baseValue,
                sellPricePerUnit: Math.floor(item.resource.baseValue * 0.7),
            })),
        }))
}
