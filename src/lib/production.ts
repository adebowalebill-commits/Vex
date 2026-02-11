/**
 * Production Engine
 * Handles production cycles for businesses: resource extraction,
 * input consumption, output creation, and operating costs.
 */

import prisma from './prisma'
import { getProductivityMultiplier } from './decay'

// ============================================
// TYPES
// ============================================

export interface ProductionResult {
    businessId: string
    businessName: string
    success: boolean
    error?: string
    inputsConsumed?: { resource: string; quantity: number }[]
    outputsProduced?: { resource: string; quantity: number }[]
    operatingCostPaid?: number
    productivityMultiplier?: number
}

export interface WorldProductionSummary {
    worldId: string
    cyclesRun: number
    successful: number
    failed: number
    results: ProductionResult[]
}

export interface ProductionStatus {
    businessId: string
    businessName: string
    type: string
    isOperating: boolean
    canProduce: boolean
    missingInputs: { resource: string; needed: number; have: number }[]
    operatingCost: number
    walletBalance: number
    productionCapacity: number
    ownerProductivity: number
}

// ============================================
// SINGLE BUSINESS PRODUCTION
// ============================================

/**
 * Run one production cycle for a business.
 * 1. Check owner's productivity (survival needs)
 * 2. Check business has required inputs in inventory
 * 3. Consume inputs
 * 4. Produce outputs (scaled by productivity)
 * 5. Deduct operating cost
 * 6. If extractor, pull from ResourceDeposit
 */
export async function runProductionCycle(businessId: string): Promise<ProductionResult> {
    const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
            owner: {
                include: { survivalNeeds: true },
            },
            productionInputs: {
                include: { resource: true },
            },
            productionOutputs: {
                include: { resource: true },
            },
            inventory: {
                include: { resource: true },
            },
            extracting: {
                include: { resource: true },
            },
        },
    })

    if (!business) {
        return { businessId, businessName: 'Unknown', success: false, error: 'Business not found' }
    }

    if (!business.isActive || !business.isOperating) {
        return { businessId, businessName: business.name, success: false, error: 'Business is not operating' }
    }

    // 1. Check owner productivity from survival needs
    const ownerNeeds = business.owner.survivalNeeds
    const food = ownerNeeds?.food ?? 100
    const water = ownerNeeds?.water ?? 100
    const sleep = ownerNeeds?.sleep ?? 100
    const productivity = getProductivityMultiplier(food, water, sleep)

    if (!productivity.canOperateBusiness) {
        return {
            businessId,
            businessName: business.name,
            success: false,
            error: `Owner cannot operate business: ${productivity.reason}`,
        }
    }

    // 2. Check operating cost
    if (business.operatingCost > 0 && business.walletBalance < business.operatingCost) {
        return {
            businessId,
            businessName: business.name,
            success: false,
            error: `Insufficient funds for operating cost: need ${business.operatingCost}, have ${business.walletBalance}`,
        }
    }

    // 3. Handle resource extraction (if business is an extractor)
    const extractionOutputs: { resource: string; quantity: number }[] = []

    for (const deposit of business.extracting) {
        if (deposit.remainingAmount <= 0) continue

        const extractAmount = Math.min(
            deposit.extractionRate * productivity.multiplier,
            deposit.remainingAmount
        )

        // Reduce deposit and add to inventory
        await prisma.$transaction(async (tx) => {
            await tx.resourceDeposit.update({
                where: { id: deposit.id },
                data: { remainingAmount: { decrement: extractAmount } },
            })

            // Upsert inventory item
            const existingItem = await tx.inventoryItem.findUnique({
                where: {
                    resourceId_businessId: {
                        resourceId: deposit.resourceId,
                        businessId: business.id,
                    },
                },
            })

            if (existingItem) {
                await tx.inventoryItem.update({
                    where: { id: existingItem.id },
                    data: { quantity: { increment: extractAmount } },
                })
            } else {
                await tx.inventoryItem.create({
                    data: {
                        quantity: extractAmount,
                        resourceId: deposit.resourceId,
                        businessId: business.id,
                    },
                })
            }
        })

        extractionOutputs.push({
            resource: deposit.resource.name,
            quantity: extractAmount,
        })
    }

    // 4. Check and consume production inputs
    const inputsConsumed: { resource: string; quantity: number }[] = []

    if (business.productionInputs.length > 0) {
        // Check all inputs are available
        for (const input of business.productionInputs) {
            const inventoryItem = business.inventory.find(
                (i) => i.resourceId === input.resourceId
            )
            const available = inventoryItem?.quantity ?? 0
            const needed = input.quantity * productivity.multiplier

            if (available < needed) {
                return {
                    businessId,
                    businessName: business.name,
                    success: false,
                    error: `Missing input: ${input.resource.name} (need ${needed.toFixed(1)}, have ${available.toFixed(1)})`,
                }
            }
        }

        // Consume inputs
        for (const input of business.productionInputs) {
            const needed = input.quantity * productivity.multiplier
            await prisma.inventoryItem.updateMany({
                where: {
                    resourceId: input.resourceId,
                    businessId: business.id,
                },
                data: { quantity: { decrement: needed } },
            })
            inputsConsumed.push({
                resource: input.resource.name,
                quantity: needed,
            })
        }
    }

    // 5. Produce outputs
    const outputsProduced: { resource: string; quantity: number }[] = []

    for (const output of business.productionOutputs) {
        const produced = output.quantity * productivity.multiplier

        // Upsert inventory
        const existingItem = await prisma.inventoryItem.findUnique({
            where: {
                resourceId_businessId: {
                    resourceId: output.resourceId,
                    businessId: business.id,
                },
            },
        })

        if (existingItem) {
            await prisma.inventoryItem.update({
                where: { id: existingItem.id },
                data: { quantity: { increment: produced } },
            })
        } else {
            await prisma.inventoryItem.create({
                data: {
                    quantity: produced,
                    resourceId: output.resourceId,
                    businessId: business.id,
                },
            })
        }

        outputsProduced.push({
            resource: output.resource.name,
            quantity: produced,
        })
    }

    // 6. Deduct operating cost
    let operatingCostPaid = 0
    if (business.operatingCost > 0) {
        await prisma.business.update({
            where: { id: business.id },
            data: { walletBalance: { decrement: business.operatingCost } },
        })
        operatingCostPaid = business.operatingCost
    }

    return {
        businessId,
        businessName: business.name,
        success: true,
        inputsConsumed,
        outputsProduced: [...extractionOutputs, ...outputsProduced],
        operatingCostPaid,
        productivityMultiplier: productivity.multiplier,
    }
}

// ============================================
// WORLD-WIDE PRODUCTION
// ============================================

/**
 * Run production cycles for all active businesses in a world.
 */
export async function runWorldProduction(worldId: string): Promise<WorldProductionSummary> {
    const businesses = await prisma.business.findMany({
        where: { worldId, isActive: true, isOperating: true },
        select: { id: true },
    })

    const results: ProductionResult[] = []
    let successful = 0
    let failed = 0

    for (const biz of businesses) {
        const result = await runProductionCycle(biz.id)
        results.push(result)
        if (result.success) successful++
        else failed++
    }

    return {
        worldId,
        cyclesRun: businesses.length,
        successful,
        failed,
        results,
    }
}

// ============================================
// PRODUCTION STATUS
// ============================================

/**
 * Get production readiness status for a business.
 */
export async function getProductionStatus(businessId: string): Promise<ProductionStatus | null> {
    const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
            owner: {
                include: { survivalNeeds: true },
            },
            productionInputs: {
                include: { resource: true },
            },
            inventory: {
                include: { resource: true },
            },
        },
    })

    if (!business) return null

    const ownerNeeds = business.owner.survivalNeeds
    const productivity = getProductivityMultiplier(
        ownerNeeds?.food ?? 100,
        ownerNeeds?.water ?? 100,
        ownerNeeds?.sleep ?? 100
    )

    const missingInputs: { resource: string; needed: number; have: number }[] = []

    for (const input of business.productionInputs) {
        const inventoryItem = business.inventory.find(
            (i) => i.resourceId === input.resourceId
        )
        const available = inventoryItem?.quantity ?? 0
        const needed = input.quantity * productivity.multiplier

        if (available < needed) {
            missingInputs.push({
                resource: input.resource.name,
                needed,
                have: available,
            })
        }
    }

    return {
        businessId: business.id,
        businessName: business.name,
        type: business.type,
        isOperating: business.isOperating,
        canProduce: missingInputs.length === 0 && productivity.canOperateBusiness,
        missingInputs,
        operatingCost: business.operatingCost,
        walletBalance: business.walletBalance,
        productionCapacity: business.productionCapacity,
        ownerProductivity: productivity.multiplier,
    }
}

/**
 * Get production status for all businesses in a world.
 */
export async function getWorldProductionStatus(worldId: string): Promise<ProductionStatus[]> {
    const businesses = await prisma.business.findMany({
        where: { worldId, isActive: true },
        select: { id: true },
    })

    const statuses: ProductionStatus[] = []
    for (const biz of businesses) {
        const status = await getProductionStatus(biz.id)
        if (status) statuses.push(status)
    }

    return statuses
}
