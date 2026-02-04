/**
 * Ledger Service
 * Handles transaction recording and tax calculations
 */

import prisma from './prisma'
import { EntityType, getBalance } from './wallet'

export interface TaxCalculation {
    grossAmount: number
    taxAmount: number
    netAmount: number
    taxRate: number
    taxType: string
}

export interface TransactionParams {
    worldId: string
    amount: number
    type: string
    description?: string
    senderType: EntityType
    senderId: string
    receiverType: EntityType
    receiverId: string
    applyTax?: boolean
}

export interface TransactionResult {
    success: boolean
    error?: string
    transactionId?: string
    taxAmount?: number
    netAmount?: number
}

/**
 * Calculate applicable tax based on transaction type and world settings
 */
export async function calculateTax(
    amount: number,
    worldId: string,
    transactionType: string
): Promise<TaxCalculation> {
    const world = await prisma.world.findUnique({
        where: { id: worldId },
        select: { salesTaxRate: true, incomeTaxRate: true, propertyTaxRate: true },
    })

    if (!world) {
        return {
            grossAmount: amount,
            taxAmount: 0,
            netAmount: amount,
            taxRate: 0,
            taxType: 'NONE',
        }
    }

    let taxRate = 0
    let taxType = 'NONE'

    switch (transactionType) {
        case 'PAYMENT':
        case 'RESOURCE_EXTRACTION':
            taxRate = world.salesTaxRate
            taxType = 'SALES'
            break
        case 'SALARY':
            taxRate = world.incomeTaxRate
            taxType = 'INCOME'
            break
        case 'LAND_PURCHASE':
        case 'PERMIT_PURCHASE':
            taxRate = world.propertyTaxRate
            taxType = 'PROPERTY'
            break
        default:
            taxRate = 0
            taxType = 'NONE'
    }

    const taxAmount = amount * (taxRate / 100)
    const netAmount = amount - taxAmount

    return {
        grossAmount: amount,
        taxAmount,
        netAmount,
        taxRate,
        taxType,
    }
}

/**
 * Route tax amount to world treasury
 */
export async function routeToTreasury(
    worldId: string,
    amount: number,
    taxType: string
): Promise<{ success: boolean; newBalance?: number }> {
    if (amount <= 0) {
        return { success: true, newBalance: 0 }
    }

    try {
        const treasury = await prisma.treasury.update({
            where: { worldId },
            data: {
                balance: { increment: amount },
                totalTaxRevenue: { increment: amount },
            },
            select: { balance: true },
        })

        // Record the tax transaction
        await prisma.transaction.create({
            data: {
                amount,
                type: 'TAX',
                description: `${taxType} tax collection`,
                status: 'COMPLETED',
                worldId,
            },
        })

        return { success: true, newBalance: treasury.balance }
    } catch (error) {
        console.error('Treasury routing error:', error)
        return { success: false }
    }
}

/**
 * Execute a full transaction with tax calculation and treasury routing
 */
export async function executeTransaction(
    params: TransactionParams
): Promise<TransactionResult> {
    const {
        worldId,
        amount,
        type,
        description,
        senderType,
        senderId,
        receiverType,
        receiverId,
        applyTax = true,
    } = params

    // Validate amount
    if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' }
    }

    // Check sender balance
    const senderBalance = await getBalance(senderId, senderType)
    if (!senderBalance) {
        return { success: false, error: 'Sender not found' }
    }
    if (senderBalance.wallet < amount) {
        return { success: false, error: 'Insufficient balance' }
    }

    // Calculate tax if applicable
    let taxInfo: TaxCalculation = {
        grossAmount: amount,
        taxAmount: 0,
        netAmount: amount,
        taxRate: 0,
        taxType: 'NONE',
    }

    if (applyTax && receiverType !== 'TREASURY') {
        taxInfo = await calculateTax(amount, worldId, type)
    }

    try {
        // Execute in a transaction for atomicity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Deduct from sender
            if (senderType === 'CITIZEN') {
                await tx.citizen.update({
                    where: { id: senderId },
                    data: { walletBalance: { decrement: amount } },
                })
            } else if (senderType === 'BUSINESS') {
                await tx.business.update({
                    where: { id: senderId },
                    data: { walletBalance: { decrement: amount } },
                })
            } else if (senderType === 'TREASURY') {
                await tx.treasury.update({
                    where: { worldId: senderId },
                    data: { balance: { decrement: amount } },
                })
            }

            // 2. Add to receiver (net of tax)
            if (receiverType === 'CITIZEN') {
                await tx.citizen.update({
                    where: { id: receiverId },
                    data: { walletBalance: { increment: taxInfo.netAmount } },
                })
            } else if (receiverType === 'BUSINESS') {
                await tx.business.update({
                    where: { id: receiverId },
                    data: { walletBalance: { increment: taxInfo.netAmount } },
                })
            } else if (receiverType === 'TREASURY') {
                await tx.treasury.update({
                    where: { worldId: receiverId },
                    data: { balance: { increment: taxInfo.netAmount } },
                })
            }

            // 3. Route tax to treasury if applicable
            if (taxInfo.taxAmount > 0) {
                await tx.treasury.update({
                    where: { worldId },
                    data: {
                        balance: { increment: taxInfo.taxAmount },
                        totalTaxRevenue: { increment: taxInfo.taxAmount },
                    },
                })
            }

            // 4. Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    amount,
                    type: type as never,
                    description,
                    taxAmount: taxInfo.taxAmount,
                    status: 'COMPLETED',
                    worldId,
                    senderCitizenId: senderType === 'CITIZEN' ? senderId : null,
                    senderBusinessId: senderType === 'BUSINESS' ? senderId : null,
                    receiverCitizenId: receiverType === 'CITIZEN' ? receiverId : null,
                    receiverBusinessId: receiverType === 'BUSINESS' ? receiverId : null,
                },
            })

            return transaction
        })

        return {
            success: true,
            transactionId: result.id,
            taxAmount: taxInfo.taxAmount,
            netAmount: taxInfo.netAmount,
        }
    } catch (error) {
        console.error('Transaction execution error:', error)
        return { success: false, error: 'Transaction failed' }
    }
}

/**
 * Get transaction history for an entity
 */
export async function getTransactionHistory(
    entityId: string,
    entityType: EntityType,
    limit = 20
) {
    const whereClause =
        entityType === 'CITIZEN'
            ? {
                OR: [
                    { senderCitizenId: entityId },
                    { receiverCitizenId: entityId },
                ],
            }
            : {
                OR: [
                    { senderBusinessId: entityId },
                    { receiverBusinessId: entityId },
                ],
            }

    return prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            senderCitizen: { select: { id: true, displayName: true } },
            senderBusiness: { select: { id: true, name: true } },
            receiverCitizen: { select: { id: true, displayName: true } },
            receiverBusiness: { select: { id: true, name: true } },
        },
    })
}
