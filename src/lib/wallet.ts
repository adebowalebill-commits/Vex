/**
 * Wallet Service
 * Handles balance operations for citizens and businesses
 */

import prisma from './prisma'

export type EntityType = 'CITIZEN' | 'BUSINESS' | 'TREASURY'

export interface WalletBalance {
    wallet: number
    bank: number
    total: number
}

export interface TransferResult {
    success: boolean
    error?: string
    transactionId?: string
    newSenderBalance?: number
    newReceiverBalance?: number
}

/**
 * Get balance for a citizen or business
 */
export async function getBalance(
    entityId: string,
    entityType: EntityType
): Promise<WalletBalance | null> {
    if (entityType === 'CITIZEN') {
        const citizen = await prisma.citizen.findUnique({
            where: { id: entityId },
            select: { walletBalance: true, bankBalance: true },
        })
        if (!citizen) return null
        return {
            wallet: citizen.walletBalance,
            bank: citizen.bankBalance,
            total: citizen.walletBalance + citizen.bankBalance,
        }
    }

    if (entityType === 'BUSINESS') {
        const business = await prisma.business.findUnique({
            where: { id: entityId },
            select: { walletBalance: true },
        })
        if (!business) return null
        return {
            wallet: business.walletBalance,
            bank: 0,
            total: business.walletBalance,
        }
    }

    if (entityType === 'TREASURY') {
        const treasury = await prisma.treasury.findUnique({
            where: { worldId: entityId },
            select: { balance: true },
        })
        if (!treasury) return null
        return {
            wallet: treasury.balance,
            bank: 0,
            total: treasury.balance,
        }
    }

    return null
}

/**
 * Get citizen by Discord ID and World
 */
export async function getCitizenByDiscordId(
    discordId: string,
    worldId: string
) {
    return prisma.citizen.findFirst({
        where: {
            user: { discordId },
            worldId,
        },
        include: {
            user: { select: { id: true, name: true, discordId: true } },
            survivalNeeds: true,
        },
    })
}

/**
 * Deposit funds to an entity's wallet
 */
export async function deposit(
    entityId: string,
    entityType: EntityType,
    amount: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' }
    }

    try {
        if (entityType === 'CITIZEN') {
            const updated = await prisma.citizen.update({
                where: { id: entityId },
                data: { walletBalance: { increment: amount } },
                select: { walletBalance: true },
            })
            return { success: true, newBalance: updated.walletBalance }
        }

        if (entityType === 'BUSINESS') {
            const updated = await prisma.business.update({
                where: { id: entityId },
                data: { walletBalance: { increment: amount } },
                select: { walletBalance: true },
            })
            return { success: true, newBalance: updated.walletBalance }
        }

        if (entityType === 'TREASURY') {
            const updated = await prisma.treasury.update({
                where: { worldId: entityId },
                data: { balance: { increment: amount } },
                select: { balance: true },
            })
            return { success: true, newBalance: updated.balance }
        }

        return { success: false, error: 'Invalid entity type' }
    } catch (error) {
        console.error('Deposit error:', error)
        return { success: false, error: 'Failed to deposit funds' }
    }
}

/**
 * Withdraw funds from an entity's wallet
 */
export async function withdraw(
    entityId: string,
    entityType: EntityType,
    amount: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' }
    }

    // Check balance first
    const balance = await getBalance(entityId, entityType)
    if (!balance) {
        return { success: false, error: 'Entity not found' }
    }
    if (balance.wallet < amount) {
        return { success: false, error: 'Insufficient balance' }
    }

    try {
        if (entityType === 'CITIZEN') {
            const updated = await prisma.citizen.update({
                where: { id: entityId },
                data: { walletBalance: { decrement: amount } },
                select: { walletBalance: true },
            })
            return { success: true, newBalance: updated.walletBalance }
        }

        if (entityType === 'BUSINESS') {
            const updated = await prisma.business.update({
                where: { id: entityId },
                data: { walletBalance: { decrement: amount } },
                select: { walletBalance: true },
            })
            return { success: true, newBalance: updated.walletBalance }
        }

        if (entityType === 'TREASURY') {
            const updated = await prisma.treasury.update({
                where: { worldId: entityId },
                data: { balance: { decrement: amount } },
                select: { balance: true },
            })
            return { success: true, newBalance: updated.balance }
        }

        return { success: false, error: 'Invalid entity type' }
    } catch (error) {
        console.error('Withdraw error:', error)
        return { success: false, error: 'Failed to withdraw funds' }
    }
}

/**
 * Transfer between wallet and bank (citizens only)
 */
export async function transferToBank(
    citizenId: string,
    amount: number
): Promise<{ success: boolean; error?: string }> {
    if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' }
    }

    const citizen = await prisma.citizen.findUnique({
        where: { id: citizenId },
        select: { walletBalance: true },
    })

    if (!citizen) {
        return { success: false, error: 'Citizen not found' }
    }

    if (citizen.walletBalance < amount) {
        return { success: false, error: 'Insufficient wallet balance' }
    }

    await prisma.citizen.update({
        where: { id: citizenId },
        data: {
            walletBalance: { decrement: amount },
            bankBalance: { increment: amount },
        },
    })

    return { success: true }
}

/**
 * Transfer from bank to wallet (citizens only)
 */
export async function transferFromBank(
    citizenId: string,
    amount: number
): Promise<{ success: boolean; error?: string }> {
    if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' }
    }

    const citizen = await prisma.citizen.findUnique({
        where: { id: citizenId },
        select: { bankBalance: true },
    })

    if (!citizen) {
        return { success: false, error: 'Citizen not found' }
    }

    if (citizen.bankBalance < amount) {
        return { success: false, error: 'Insufficient bank balance' }
    }

    await prisma.citizen.update({
        where: { id: citizenId },
        data: {
            bankBalance: { decrement: amount },
            walletBalance: { increment: amount },
        },
    })

    return { success: true }
}

/**
 * Verify entity ownership by user
 */
export async function verifyOwnership(
    userId: string,
    entityId: string,
    entityType: EntityType
): Promise<boolean> {
    if (entityType === 'CITIZEN') {
        const citizen = await prisma.citizen.findUnique({
            where: { id: entityId },
            select: { userId: true },
        })
        return citizen?.userId === userId
    }

    if (entityType === 'BUSINESS') {
        const business = await prisma.business.findUnique({
            where: { id: entityId },
            include: { owner: { select: { userId: true } } },
        })
        return business?.owner.userId === userId
    }

    return false
}
