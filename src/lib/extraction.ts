/**
 * Resource Extraction Engine (RNG-based)
 * 
 * Workers at extraction businesses can perform extraction actions.
 * Each action rolls against a loot table to determine what resources
 * are gathered. Common resources appear frequently, rare resources
 * have low drop rates.
 */

import prisma from '@/lib/prisma'

// ============================================
// LOOT TABLE DEFINITIONS
// ============================================

interface LootDrop {
    resource: string       // Resource name (must exist in DB)
    minQty: number         // Minimum quantity per drop
    maxQty: number         // Maximum quantity per drop
    weight: number         // Relative drop weight (higher = more common)
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY'
}

interface LootTable {
    drops: LootDrop[]
    maxDrops: number       // Max different resources per extraction
    cooldownMs: number     // Cooldown between extractions (ms)
}

const EXTRACTION_LOOT_TABLES: Record<string, LootTable> = {
    MINING: {
        maxDrops: 3,
        cooldownMs: 60_000,   // 1 minute cooldown
        drops: [
            { resource: 'Stone',   minQty: 3, maxQty: 8,  weight: 50, rarity: 'COMMON' },
            { resource: 'Metal',   minQty: 2, maxQty: 5,  weight: 30, rarity: 'COMMON' },
            { resource: 'Coal',    minQty: 1, maxQty: 4,  weight: 15, rarity: 'UNCOMMON' },
            { resource: 'Gold',    minQty: 1, maxQty: 2,  weight: 4,  rarity: 'RARE' },
            { resource: 'Diamond', minQty: 1, maxQty: 1,  weight: 1,  rarity: 'LEGENDARY' },
        ],
    },
    LOGGING: {
        maxDrops: 3,
        cooldownMs: 60_000,
        drops: [
            { resource: 'Wood',         minQty: 4, maxQty: 10, weight: 50, rarity: 'COMMON' },
            { resource: 'Hardwood',     minQty: 1, maxQty: 4,  weight: 25, rarity: 'UNCOMMON' },
            { resource: 'Exotic Wood',  minQty: 1, maxQty: 2,  weight: 5,  rarity: 'RARE' },
        ],
    },
    FARM: {
        maxDrops: 3,
        cooldownMs: 60_000,
        drops: [
            { resource: 'Crops',        minQty: 5, maxQty: 15, weight: 50, rarity: 'COMMON' },
            { resource: 'Herbs',        minQty: 1, maxQty: 5,  weight: 25, rarity: 'UNCOMMON' },
            { resource: 'Exotic Herbs', minQty: 1, maxQty: 2,  weight: 5,  rarity: 'RARE' },
        ],
    },
    OIL_DRILLING: {
        maxDrops: 2,
        cooldownMs: 90_000,   // 1.5 minute cooldown (heavier operations)
        drops: [
            { resource: 'Oil',       minQty: 5, maxQty: 15, weight: 60, rarity: 'COMMON' },
            { resource: 'Natural Gas', minQty: 2, maxQty: 8,  weight: 30, rarity: 'UNCOMMON' },
            { resource: 'Rare Minerals', minQty: 1, maxQty: 2, weight: 10, rarity: 'RARE' },
        ],
    },
}

// ============================================
// RNG FUNCTIONS
// ============================================

function rollWeighted(drops: LootDrop[]): LootDrop {
    const totalWeight = drops.reduce((sum, d) => sum + d.weight, 0)
    let roll = Math.random() * totalWeight

    for (const drop of drops) {
        roll -= drop.weight
        if (roll <= 0) return drop
    }

    return drops[drops.length - 1] // fallback
}

function rollQuantity(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// ============================================
// EXTRACTION FUNCTION
// ============================================

export interface ExtractionResult {
    success: boolean
    error?: string
    data?: {
        businessName: string
        businessType: string
        workerName: string
        extractions: {
            resource: string
            quantity: number
            rarity: string
            value: number
        }[]
        totalValue: number
        cooldownMs: number
    }
}

export async function performExtraction(
    businessId: string,
    workerDiscordId: string,
    discordServerId: string
): Promise<ExtractionResult> {
    // 1. Validate world
    const world = await prisma.world.findUnique({
        where: { discordServerId },
        select: { id: true },
    })
    if (!world) return { success: false, error: 'World not found' }

    // 2. Validate business is a resource extraction type
    const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: {
            id: true,
            name: true,
            type: true,
            worldId: true,
            isActive: true,
            isOperating: true,
        },
    })
    if (!business) return { success: false, error: 'Business not found' }
    if (!business.isActive || !business.isOperating) {
        return { success: false, error: 'Business is not currently operating' }
    }
    if (business.worldId !== world.id) {
        return { success: false, error: 'Business does not belong to this world' }
    }

    const lootTable = EXTRACTION_LOOT_TABLES[business.type]
    if (!lootTable) {
        return { success: false, error: `${business.type} is not a resource extraction business` }
    }

    // 3. Validate worker is employed at this business
    const citizen = await prisma.citizen.findFirst({
        where: { user: { discordId: workerDiscordId }, worldId: world.id },
        select: { id: true, displayName: true },
    })
    if (!citizen) return { success: false, error: 'Citizen not found in this world' }

    const employment = await prisma.employee.findFirst({
        where: {
            citizenId: citizen.id,
            businessId: business.id,
            isActive: true,
        },
        select: { id: true },
    })

    // Also allow business owner to extract
    const isOwner = await prisma.business.findFirst({
        where: { id: businessId, ownerId: citizen.id },
        select: { id: true },
    })

    if (!employment && !isOwner) {
        return { success: false, error: 'You must be employed at or own this business to extract resources' }
    }

    // 4. Roll the loot table
    const extractions: { resource: string; quantity: number; rarity: string; value: number }[] = []
    const rolledResources = new Set<string>()

    for (let i = 0; i < lootTable.maxDrops; i++) {
        const drop = rollWeighted(lootTable.drops)
        
        // Skip duplicate resources in same extraction
        if (rolledResources.has(drop.resource)) continue
        rolledResources.add(drop.resource)

        const quantity = rollQuantity(drop.minQty, drop.maxQty)

        // Get resource from DB
        const resource = await prisma.resource.findUnique({
            where: { name: drop.resource },
        })

        if (!resource) {
            // Resource doesn't exist in DB yet — auto-create it
            const newResource = await prisma.resource.create({
                data: {
                    name: drop.resource,
                    category: 'RAW_MATERIAL',
                    baseValue: drop.rarity === 'LEGENDARY' ? 100 :
                               drop.rarity === 'RARE' ? 50 :
                               drop.rarity === 'UNCOMMON' ? 20 : 10,
                    description: `${drop.rarity} extraction resource`,
                },
            })

            // Add to business inventory
            await prisma.inventoryItem.upsert({
                where: { resourceId_businessId: { resourceId: newResource.id, businessId: business.id } },
                update: { quantity: { increment: quantity } },
                create: {
                    resourceId: newResource.id,
                    businessId: business.id,
                    quantity,
                },
            })

            extractions.push({
                resource: drop.resource,
                quantity,
                rarity: drop.rarity,
                value: newResource.baseValue * quantity,
            })
        } else {
            // Add to business inventory
            await prisma.inventoryItem.upsert({
                where: { resourceId_businessId: { resourceId: resource.id, businessId: business.id } },
                update: { quantity: { increment: quantity } },
                create: {
                    resourceId: resource.id,
                    businessId: business.id,
                    quantity,
                },
            })

            extractions.push({
                resource: drop.resource,
                quantity,
                rarity: drop.rarity,
                value: resource.baseValue * quantity,
            })
        }
    }

    // 5. Track hours worked for the employee
    if (employment) {
        await prisma.employee.update({
            where: { id: employment.id },
            data: { hoursWorked: { increment: 1 } },
        })
    }

    const totalValue = extractions.reduce((sum, e) => sum + e.value, 0)

    return {
        success: true,
        data: {
            businessName: business.name,
            businessType: business.type,
            workerName: citizen.displayName,
            extractions,
            totalValue,
            cooldownMs: lootTable.cooldownMs,
        },
    }
}

// Export loot tables for reference
export { EXTRACTION_LOOT_TABLES }
