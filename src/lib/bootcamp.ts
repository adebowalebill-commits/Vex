/**
 * Bootcamp Engine
 * Tracks the 13 essential businesses required to graduate an economy
 * from TRAINING phase to ACTIVE phase.
 */

import prisma from '@/lib/prisma'
import { BusinessType } from '@prisma/client'
import { audit } from '@/lib/audit'

/**
 * The 13 essential business types required for bootcamp graduation.
 */
export const ESSENTIAL_BUSINESSES = [
    { type: 'WATER_PURIFICATION', label: 'Water Purification' },
    { type: 'MINING', label: 'Mining' },
    { type: 'LOGGING', label: 'Forestry' },
    { type: 'FARM', label: 'Farm' },
    { type: 'GROCERY_STORE', label: 'Grocery Store' },
    { type: 'OIL_DRILLING', label: 'Oil Drilling' },
    { type: 'OIL_REFINERY', label: 'Oil Refinery' },
    { type: 'GAS_STATION', label: 'Gas Station' },
    { type: 'MACHINERY_MANUFACTURING', label: 'Machinery' },
    { type: 'VEHICLE_DEALERSHIP', label: 'Vehicle Dealership' },
    { type: 'TRUCKING_COMPANY', label: 'Trucking / Logistics' },
    { type: 'BUSINESS_CONSTRUCTION', label: 'Business Construction' },
    { type: 'REAL_ESTATE_CONSTRUCTION', label: 'Real Estate Construction' },
] as const

export type EssentialType = typeof ESSENTIAL_BUSINESSES[number]['type']

/**
 * Get the bootcamp progress for a world.
 * Returns which essential businesses are filled and which are still needed.
 */
export async function getBootcampProgress(worldId: string) {
    const world = await prisma.world.findUnique({
        where: { id: worldId },
        select: { economyPhase: true },
    })

    if (!world) return null

    // Count active businesses by type in this world
    const businesses = await prisma.business.findMany({
        where: { worldId, isActive: true },
        select: { type: true, name: true, id: true },
    })

    const filledTypes = new Set(businesses.map(b => b.type))

    const slots = ESSENTIAL_BUSINESSES.map(slot => {
        const match = businesses.find(b => b.type === slot.type as BusinessType)
        return {
            type: slot.type,
            label: slot.label,
            filled: filledTypes.has(slot.type as BusinessType),
            businessName: match?.name || null,
            businessId: match?.id || null,
        }
    })

    const filledCount = slots.filter(s => s.filled).length
    const totalRequired = ESSENTIAL_BUSINESSES.length

    return {
        phase: world.economyPhase,
        filledCount,
        totalRequired,
        progress: Math.round((filledCount / totalRequired) * 100),
        isComplete: filledCount >= totalRequired,
        slots,
    }
}

/**
 * Check if a world should graduate from TRAINING to ACTIVE.
 * Call this after every business creation.
 * Returns true if the world just graduated.
 */
export async function checkBootcampGraduation(worldId: string): Promise<boolean> {
    const world = await prisma.world.findUnique({
        where: { id: worldId },
        select: { economyPhase: true },
    })

    // Only check if still in TRAINING
    if (!world || world.economyPhase !== 'TRAINING') return false

    // Count distinct essential business types
    const essentialTypes = ESSENTIAL_BUSINESSES.map(b => b.type)

    const distinctTypes = await prisma.business.groupBy({
        by: ['type'],
        where: {
            worldId,
            isActive: true,
            type: { in: essentialTypes as BusinessType[] },
        },
    })

    if (distinctTypes.length >= ESSENTIAL_BUSINESSES.length) {
        // Graduate!
        await prisma.world.update({
            where: { id: worldId },
            data: { economyPhase: 'ACTIVE' },
        })

        audit('ENFORCEMENT_ACTION', {
            worldId,
            details: {
                event: 'BOOTCAMP_GRADUATED',
                essentialBusinessesFilled: distinctTypes.length,
            },
        })

        return true
    }

    return false
}
