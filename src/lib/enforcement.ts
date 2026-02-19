/**
 * Enforcement Engine
 * Handles inactivity scanning, permit revocation, and forced sales.
 */

import prisma from '@/lib/prisma'
import { getProductivityMultiplier } from '@/lib/decay'

export interface InactivityFlag {
    businessId: string
    businessName: string
    ownerId: string
    ownerName: string
    reasons: string[]
    severity: 'WARNING' | 'CRITICAL'
}

export interface EnforcementResult {
    businessId: string
    businessName: string
    action: string
    success: boolean
    error?: string
}

/**
 * Scan for inactive or problematic businesses
 */
export async function checkInactivity(worldId: string): Promise<InactivityFlag[]> {
    const businesses = await prisma.business.findMany({
        where: { worldId, isActive: true },
        include: {
            owner: {
                select: {
                    id: true,
                    displayName: true,
                    survivalNeeds: true,
                },
            },
        },
    })

    const flags: InactivityFlag[] = []

    for (const biz of businesses) {
        const reasons: string[] = []

        // Check owner survival needs
        if (biz.owner.survivalNeeds) {
            const { food, water, sleep } = biz.owner.survivalNeeds
            const productivity = getProductivityMultiplier(food, water, sleep)

            if (!productivity.canOperateBusiness) {
                reasons.push(`Owner cannot operate: ${productivity.reason}`)
            }
            if (food <= 10 || water <= 10 || sleep <= 10) {
                reasons.push(`Owner critical needs: F:${food} W:${water} S:${sleep}`)
            }
        } else {
            reasons.push('Owner has no survival data')
        }

        // Check empty wallet
        if (biz.walletBalance <= 0 && biz.operatingCost > 0) {
            reasons.push(`Empty wallet, cannot pay operating cost of ${biz.operatingCost}`)
        }

        // Check not operating
        if (!biz.isOperating) {
            reasons.push('Business is not operating')
        }

        if (reasons.length > 0) {
            const severity = reasons.some(r => r.includes('cannot operate') || r.includes('critical'))
                ? 'CRITICAL' : 'WARNING'

            flags.push({
                businessId: biz.id,
                businessName: biz.name,
                ownerId: biz.owner.id,
                ownerName: biz.owner.displayName,
                reasons,
                severity,
            })
        }
    }

    return flags
}

/**
 * Revoke a business permit — force-close and log event
 */
export async function revokePermit(businessId: string): Promise<EnforcementResult> {
    try {
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { id: true, name: true, worldId: true },
        })

        if (!business) return { businessId, businessName: 'Unknown', action: 'revoke', success: false, error: 'Not found' }

        await prisma.$transaction(async (tx) => {
            // Deactivate business
            await tx.business.update({
                where: { id: businessId },
                data: { isActive: false, isOperating: false },
            })

            // Unassign any deposits
            await tx.resourceDeposit.updateMany({
                where: { extractorId: businessId },
                data: { extractorId: null },
            })

            // Log enforcement event
            await tx.decayEvent.create({
                data: {
                    type: 'INACTIVITY_PENALTY',
                    targetId: businessId,
                    oldValue: 1,
                    newValue: 0,
                },
            })
        })

        return { businessId, businessName: business.name, action: 'permit_revoked', success: true }
    } catch (error) {
        console.error('Error revoking permit:', error)
        return { businessId, businessName: 'Unknown', action: 'revoke', success: false, error: 'Failed' }
    }
}

/**
 * Force-sale — deactivate and release all resources
 */
export async function forceSale(businessId: string): Promise<EnforcementResult> {
    try {
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { id: true, name: true, worldId: true, walletBalance: true },
        })

        if (!business) return { businessId, businessName: 'Unknown', action: 'force_sale', success: false, error: 'Not found' }

        await prisma.$transaction(async (tx) => {
            // Transfer remaining balance to treasury
            if (business.walletBalance > 0) {
                await tx.treasury.update({
                    where: { worldId: business.worldId },
                    data: { balance: { increment: business.walletBalance } },
                })
            }

            // Deactivate
            await tx.business.update({
                where: { id: businessId },
                data: { isActive: false, isOperating: false, walletBalance: 0 },
            })

            // Release deposits
            await tx.resourceDeposit.updateMany({
                where: { extractorId: businessId },
                data: { extractorId: null },
            })

            // Fire all employees
            await tx.employee.updateMany({
                where: { businessId, isActive: true },
                data: { isActive: false },
            })

            // Log
            await tx.decayEvent.create({
                data: {
                    type: 'INACTIVITY_PENALTY',
                    targetId: businessId,
                    oldValue: business.walletBalance,
                    newValue: 0,
                },
            })
        })

        return { businessId, businessName: business.name, action: 'force_sale', success: true }
    } catch (error) {
        console.error('Error processing force sale:', error)
        return { businessId, businessName: 'Unknown', action: 'force_sale', success: false, error: 'Failed' }
    }
}
