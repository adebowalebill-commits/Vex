/**
 * Survival Decay Engine
 * Processes periodic decay of citizen survival needs (food, water, sleep).
 * Low needs reduce productivity and restrict actions per the PRD.
 */

import prisma from './prisma'

// ============================================
// CONSTANTS & TYPES
// ============================================

/** Default decay per tick (100 / 24 ≈ 4.17 → needs drain in ~24 ticks) */
const DEFAULT_DECAY_RATE = 4.17

/** Decay rates per need type (can be tuned independently) */
const DECAY_RATES = {
    food: DEFAULT_DECAY_RATE,
    water: DEFAULT_DECAY_RATE * 1.2,  // Water drains slightly faster
    sleep: DEFAULT_DECAY_RATE * 0.8,  // Sleep drains slightly slower
}

export interface ProductivityMultiplier {
    multiplier: number
    canOperateBusiness: boolean
    canWork: boolean
    reason: string
}

export interface DecaySummary {
    worldId: string
    processed: number
    critical: string[]     // Citizens with any need ≤ 24
    warnings: string[]     // Citizens with any need ≤ 49
    events: number
}

export interface CitizenSurvivalStatus {
    citizenId: string
    displayName: string
    food: number
    water: number
    sleep: number
    productivity: ProductivityMultiplier
    lastDecayAt: Date
}

// ============================================
// PRODUCTIVITY CALCULATIONS
// ============================================

/**
 * Calculate productivity multiplier based on survival needs.
 * Per PRD: neglect causes reduced productivity, inability to operate businesses,
 * and restricted movement/work.
 */
export function getProductivityMultiplier(
    food: number,
    water: number,
    sleep: number
): ProductivityMultiplier {
    const lowestNeed = Math.min(food, water, sleep)

    if (lowestNeed >= 75) {
        return {
            multiplier: 1.0,
            canOperateBusiness: true,
            canWork: true,
            reason: 'Healthy',
        }
    }

    if (lowestNeed >= 50) {
        return {
            multiplier: 0.9,
            canOperateBusiness: true,
            canWork: true,
            reason: 'Needs attention — 10% productivity loss',
        }
    }

    if (lowestNeed >= 25) {
        return {
            multiplier: 0.75,
            canOperateBusiness: false,
            canWork: true,
            reason: 'Struggling — 25% productivity loss, cannot operate businesses',
        }
    }

    return {
        multiplier: 0.5,
        canOperateBusiness: false,
        canWork: false,
        reason: 'Critical — 50% productivity loss, restricted from most actions',
    }
}

// ============================================
// DECAY PROCESSING
// ============================================

/**
 * Process survival decay for all active citizens in a world.
 * Called by the bot or a cron job at regular intervals.
 */
export async function processSurvivalDecay(worldId: string): Promise<DecaySummary> {
    const summary: DecaySummary = {
        worldId,
        processed: 0,
        critical: [],
        warnings: [],
        events: 0,
    }

    // Get all active citizens with survival needs
    const citizens = await prisma.citizen.findMany({
        where: { worldId, isActive: true },
        include: {
            survivalNeeds: true,
        },
    })

    for (const citizen of citizens) {
        if (!citizen.survivalNeeds) {
            // Create survival needs if missing
            await prisma.survivalNeeds.create({
                data: {
                    citizenId: citizen.id,
                    food: 100,
                    water: 100,
                    sleep: 100,
                },
            })
            continue
        }

        const needs = citizen.survivalNeeds
        const now = new Date()

        // Calculate new values (clamp to 0)
        const newFood = Math.max(0, needs.food - DECAY_RATES.food)
        const newWater = Math.max(0, needs.water - DECAY_RATES.water)
        const newSleep = Math.max(0, needs.sleep - DECAY_RATES.sleep)

        // Update survival needs
        await prisma.survivalNeeds.update({
            where: { id: needs.id },
            data: {
                food: newFood,
                water: newWater,
                sleep: newSleep,
                lastDecayAt: now,
            },
        })

        // Record decay events
        const events = []
        if (needs.food !== newFood) {
            events.push({
                type: 'SURVIVAL_FOOD' as const,
                targetId: citizen.id,
                oldValue: needs.food,
                newValue: newFood,
            })
        }
        if (needs.water !== newWater) {
            events.push({
                type: 'SURVIVAL_WATER' as const,
                targetId: citizen.id,
                oldValue: needs.water,
                newValue: newWater,
            })
        }
        if (needs.sleep !== newSleep) {
            events.push({
                type: 'SURVIVAL_SLEEP' as const,
                targetId: citizen.id,
                oldValue: needs.sleep,
                newValue: newSleep,
            })
        }

        if (events.length > 0) {
            await prisma.decayEvent.createMany({ data: events })
            summary.events += events.length
        }

        // Track alerts
        const lowestNeed = Math.min(newFood, newWater, newSleep)
        if (lowestNeed <= 24) {
            summary.critical.push(citizen.displayName)
        } else if (lowestNeed <= 49) {
            summary.warnings.push(citizen.displayName)
        }

        summary.processed++
    }

    return summary
}

// ============================================
// NEED REPLENISHMENT
// ============================================

/** Cost multiplier per unit of need restored */
const REPLENISH_COST_PER_UNIT = {
    food: 2,   // 2 currency per unit of food
    water: 1,  // 1 currency per unit of water
    sleep: 0,  // Sleep is free (rest)
}

export type NeedType = 'food' | 'water' | 'sleep'

/**
 * Replenish a citizen's survival need by spending currency.
 * Sleep is free. Food and water cost currency.
 */
export async function replenishNeed(
    citizenId: string,
    needType: NeedType,
    amount: number
): Promise<{ success: boolean; newValue?: number; cost?: number; error?: string }> {
    if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' }
    }

    const citizen = await prisma.citizen.findUnique({
        where: { id: citizenId },
        include: { survivalNeeds: true },
    })

    if (!citizen || !citizen.survivalNeeds) {
        return { success: false, error: 'Citizen or survival needs not found' }
    }

    const currentValue = citizen.survivalNeeds[needType]
    const maxReplenish = 100 - currentValue
    const actualAmount = Math.min(amount, maxReplenish)

    if (actualAmount <= 0) {
        return { success: false, error: `${needType} is already full` }
    }

    const costPerUnit = REPLENISH_COST_PER_UNIT[needType]
    const totalCost = actualAmount * costPerUnit

    // Check if citizen can afford it (sleep is free)
    if (totalCost > 0 && citizen.walletBalance < totalCost) {
        return { success: false, error: `Insufficient balance. Need ${totalCost} but have ${citizen.walletBalance}` }
    }

    // Update needs and deduct cost in a transaction
    await prisma.$transaction(async (tx) => {
        await tx.survivalNeeds.update({
            where: { id: citizen.survivalNeeds!.id },
            data: { [needType]: currentValue + actualAmount },
        })

        if (totalCost > 0) {
            await tx.citizen.update({
                where: { id: citizenId },
                data: { walletBalance: { decrement: totalCost } },
            })

            // Record the spending as a transaction
            await tx.transaction.create({
                data: {
                    amount: totalCost,
                    type: 'PAYMENT',
                    description: `Purchased ${actualAmount} units of ${needType}`,
                    status: 'COMPLETED',
                    worldId: citizen.worldId,
                    senderCitizenId: citizenId,
                },
            })
        }
    })

    return {
        success: true,
        newValue: currentValue + actualAmount,
        cost: totalCost,
    }
}

// ============================================
// STATUS QUERIES
// ============================================

/**
 * Get survival status for all citizens in a world.
 */
export async function getWorldSurvivalStatus(worldId: string): Promise<CitizenSurvivalStatus[]> {
    const citizens = await prisma.citizen.findMany({
        where: { worldId, isActive: true },
        include: { survivalNeeds: true },
        orderBy: { displayName: 'asc' },
    })

    return citizens.map((c) => {
        const food = c.survivalNeeds?.food ?? 100
        const water = c.survivalNeeds?.water ?? 100
        const sleep = c.survivalNeeds?.sleep ?? 100

        return {
            citizenId: c.id,
            displayName: c.displayName,
            food,
            water,
            sleep,
            productivity: getProductivityMultiplier(food, water, sleep),
            lastDecayAt: c.survivalNeeds?.lastDecayAt ?? new Date(),
        }
    })
}

/**
 * Get survival status for a single citizen.
 */
export async function getCitizenSurvivalStatus(citizenId: string): Promise<CitizenSurvivalStatus | null> {
    const citizen = await prisma.citizen.findUnique({
        where: { id: citizenId },
        include: { survivalNeeds: true },
    })

    if (!citizen) return null

    const food = citizen.survivalNeeds?.food ?? 100
    const water = citizen.survivalNeeds?.water ?? 100
    const sleep = citizen.survivalNeeds?.sleep ?? 100

    return {
        citizenId: citizen.id,
        displayName: citizen.displayName,
        food,
        water,
        sleep,
        productivity: getProductivityMultiplier(food, water, sleep),
        lastDecayAt: citizen.survivalNeeds?.lastDecayAt ?? new Date(),
    }
}
