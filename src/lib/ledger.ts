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

// ============================================
// TREASURY OPERATIONS
// ============================================

export interface LoanResult {
    success: boolean
    loanId?: string
    error?: string
}

/**
 * Issue a loan from the world treasury to a citizen.
 * Deducts from treasury balance, credits citizen, creates Loan record.
 */
export async function issueLoan(
    worldId: string,
    citizenId: string,
    amount: number,
    interestRate: number,
    termMonths: number
): Promise<LoanResult> {
    if (amount <= 0) return { success: false, error: 'Loan amount must be positive' }
    if (interestRate < 0) return { success: false, error: 'Interest rate cannot be negative' }
    if (termMonths <= 0) return { success: false, error: 'Term must be at least 1 month' }

    const treasury = await prisma.treasury.findUnique({
        where: { worldId },
        select: { balance: true },
    })

    if (!treasury) return { success: false, error: 'Treasury not found' }
    if (treasury.balance < amount) {
        return { success: false, error: `Insufficient treasury balance: ${treasury.balance} < ${amount}` }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Deduct from treasury
            await tx.treasury.update({
                where: { worldId },
                data: {
                    balance: { decrement: amount },
                    totalLoansIssued: { increment: amount },
                },
            })

            // Credit citizen
            await tx.citizen.update({
                where: { id: citizenId },
                data: { walletBalance: { increment: amount } },
            })

            // Create loan record
            const nextPaymentDue = new Date()
            nextPaymentDue.setDate(nextPaymentDue.getDate() + 30) // 30 days

            const loan = await tx.loan.create({
                data: {
                    principalAmount: amount,
                    interestRate,
                    termMonths,
                    nextPaymentDue,
                    status: 'ACTIVE',
                    worldId,
                    borrowerId: citizenId,
                },
            })

            // Record transaction
            await tx.transaction.create({
                data: {
                    amount,
                    type: 'LOAN_DISBURSEMENT',
                    description: `Treasury loan: ${amount} at ${interestRate}% for ${termMonths} months`,
                    status: 'COMPLETED',
                    worldId,
                    receiverCitizenId: citizenId,
                },
            })

            return loan
        })

        return { success: true, loanId: result.id }
    } catch (error) {
        console.error('Loan issuance error:', error)
        return { success: false, error: 'Failed to issue loan' }
    }
}

/**
 * Process a scheduled loan payment from a citizen back to the treasury.
 */
export async function processLoanPayment(
    loanId: string
): Promise<{ success: boolean; amountPaid?: number; error?: string }> {
    const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { borrower: true },
    })

    if (!loan) return { success: false, error: 'Loan not found' }
    if (loan.status !== 'ACTIVE') return { success: false, error: `Loan is ${loan.status}` }

    // Calculate monthly payment (simple amortization)
    const totalOwed = loan.principalAmount * (1 + loan.interestRate / 100)
    const monthlyPayment = totalOwed / loan.termMonths
    const remaining = totalOwed - loan.amountPaid
    const payment = Math.min(monthlyPayment, remaining)

    if (loan.borrower.walletBalance < payment) {
        return { success: false, error: `Borrower cannot afford payment: ${payment.toFixed(2)}` }
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Deduct from borrower
            await tx.citizen.update({
                where: { id: loan.borrowerId },
                data: { walletBalance: { decrement: payment } },
            })

            // Credit treasury
            await tx.treasury.update({
                where: { worldId: loan.worldId },
                data: { balance: { increment: payment } },
            })

            // Update loan
            const newAmountPaid = loan.amountPaid + payment
            const isPaidOff = newAmountPaid >= totalOwed - 0.01

            const nextPaymentDue = new Date()
            nextPaymentDue.setDate(nextPaymentDue.getDate() + 30)

            await tx.loan.update({
                where: { id: loanId },
                data: {
                    amountPaid: newAmountPaid,
                    status: isPaidOff ? 'PAID_OFF' : 'ACTIVE',
                    nextPaymentDue: isPaidOff ? null : nextPaymentDue,
                },
            })

            // Record transaction
            await tx.transaction.create({
                data: {
                    amount: payment,
                    type: 'LOAN_REPAYMENT',
                    description: `Loan repayment (${isPaidOff ? 'final' : 'monthly'})`,
                    status: 'COMPLETED',
                    worldId: loan.worldId,
                    senderCitizenId: loan.borrowerId,
                },
            })
        })

        return { success: true, amountPaid: payment }
    } catch (error) {
        console.error('Loan payment error:', error)
        return { success: false, error: 'Failed to process payment' }
    }
}

/**
 * Collect a permit fee from a citizen and route to treasury.
 */
export async function collectPermitFee(
    worldId: string,
    citizenId: string,
    amount: number,
    description?: string
): Promise<{ success: boolean; error?: string }> {
    return collectFee(worldId, citizenId, amount, 'PERMIT_PURCHASE', 'totalPermitRevenue', description || 'Permit purchase')
}

/**
 * Collect a land purchase fee from a citizen and route to treasury.
 */
export async function collectLandFee(
    worldId: string,
    citizenId: string,
    amount: number,
    description?: string
): Promise<{ success: boolean; error?: string }> {
    return collectFee(worldId, citizenId, amount, 'LAND_PURCHASE', 'totalLandRevenue', description || 'Land purchase')
}

/**
 * Generic fee collection helper.
 */
async function collectFee(
    worldId: string,
    citizenId: string,
    amount: number,
    transactionType: string,
    revenueField: 'totalPermitRevenue' | 'totalLandRevenue' | 'totalTaxRevenue',
    description: string
): Promise<{ success: boolean; error?: string }> {
    if (amount <= 0) return { success: false, error: 'Amount must be positive' }

    const citizen = await prisma.citizen.findUnique({
        where: { id: citizenId },
        select: { walletBalance: true },
    })

    if (!citizen) return { success: false, error: 'Citizen not found' }
    if (citizen.walletBalance < amount) {
        return { success: false, error: `Insufficient balance: ${citizen.walletBalance} < ${amount}` }
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.citizen.update({
                where: { id: citizenId },
                data: { walletBalance: { decrement: amount } },
            })

            await tx.treasury.update({
                where: { worldId },
                data: {
                    balance: { increment: amount },
                    [revenueField]: { increment: amount },
                },
            })

            await tx.transaction.create({
                data: {
                    amount,
                    type: transactionType as never,
                    description,
                    status: 'COMPLETED',
                    worldId,
                    senderCitizenId: citizenId,
                },
            })
        })

        return { success: true }
    } catch (error) {
        console.error('Fee collection error:', error)
        return { success: false, error: 'Failed to collect fee' }
    }
}

/**
 * Get a full treasury report for a world.
 */
export async function getTreasuryReport(worldId: string) {
    const treasury = await prisma.treasury.findUnique({
        where: { worldId },
    })

    if (!treasury) return null

    const activeLoans = await prisma.loan.findMany({
        where: { worldId, status: 'ACTIVE' },
        include: { borrower: { select: { displayName: true } } },
    })

    const recentTransactions = await prisma.transaction.findMany({
        where: {
            worldId,
            type: { in: ['TAX', 'TREASURY_SUBSIDY', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'PERMIT_PURCHASE', 'LAND_PURCHASE'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    })

    const totalLoanOutstanding = activeLoans.reduce((sum, loan) => {
        const totalOwed = loan.principalAmount * (1 + loan.interestRate / 100)
        return sum + (totalOwed - loan.amountPaid)
    }, 0)

    return {
        balance: treasury.balance,
        revenue: {
            taxes: treasury.totalTaxRevenue,
            permits: treasury.totalPermitRevenue,
            land: treasury.totalLandRevenue,
            total: treasury.totalTaxRevenue + treasury.totalPermitRevenue + treasury.totalLandRevenue,
        },
        spending: {
            subsidies: treasury.totalSubsidies,
            loansIssued: treasury.totalLoansIssued,
            total: treasury.totalSubsidies + treasury.totalLoansIssued,
        },
        loans: {
            active: activeLoans.length,
            totalOutstanding: totalLoanOutstanding,
            details: activeLoans.map(l => ({
                id: l.id,
                borrower: l.borrower.displayName,
                principal: l.principalAmount,
                interestRate: l.interestRate,
                amountPaid: l.amountPaid,
                status: l.status,
            })),
        },
        recentTransactions,
    }
}
