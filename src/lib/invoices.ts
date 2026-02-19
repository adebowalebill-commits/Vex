/**
 * Invoice Engine
 * Create, pay, cancel, and query invoices.
 */

import prisma from '@/lib/prisma'

export interface InvoiceResult {
    success: boolean
    invoiceId?: string
    message?: string
    error?: string
}

/**
 * Create an invoice from one party to another
 */
export async function createInvoice(params: {
    worldId: string
    amount: number
    description: string
    dueDate?: Date
    senderCitizenId?: string
    senderBusinessId?: string
    receiverCitizenId?: string
    receiverBusinessId?: string
}): Promise<InvoiceResult> {
    try {
        const { worldId, amount, description, dueDate, senderCitizenId, senderBusinessId, receiverCitizenId, receiverBusinessId } = params

        if (!senderCitizenId && !senderBusinessId) {
            return { success: false, error: 'Sender (citizen or business) required' }
        }
        if (!receiverCitizenId && !receiverBusinessId) {
            return { success: false, error: 'Receiver (citizen or business) required' }
        }

        const invoice = await prisma.invoice.create({
            data: {
                amount,
                description,
                dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
                worldId,
                senderCitizenId,
                senderBusinessId,
                receiverCitizenId,
                receiverBusinessId,
            },
        })

        return { success: true, invoiceId: invoice.id, message: `Invoice created for ${amount}` }
    } catch (error) {
        console.error('Error creating invoice:', error)
        return { success: false, error: 'Failed to create invoice' }
    }
}

/**
 * Pay an invoice — transfer funds and update status
 */
export async function payInvoice(invoiceId: string): Promise<InvoiceResult> {
    try {
        const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
        if (!invoice) return { success: false, error: 'Invoice not found' }
        if (invoice.status === 'PAID') return { success: false, error: 'Invoice already paid' }
        if (invoice.status === 'CANCELLED') return { success: false, error: 'Invoice is cancelled' }

        await prisma.$transaction(async (tx) => {
            // Deduct from receiver (the one who pays)
            if (invoice.receiverCitizenId) {
                const citizen = await tx.citizen.findUnique({ where: { id: invoice.receiverCitizenId }, select: { walletBalance: true } })
                if (!citizen || citizen.walletBalance < invoice.amount) {
                    throw new Error(`Insufficient funds: need ${invoice.amount}, have ${citizen?.walletBalance ?? 0}`)
                }
                await tx.citizen.update({
                    where: { id: invoice.receiverCitizenId },
                    data: { walletBalance: { decrement: invoice.amount } },
                })
            } else if (invoice.receiverBusinessId) {
                const biz = await tx.business.findUnique({ where: { id: invoice.receiverBusinessId }, select: { walletBalance: true } })
                if (!biz || biz.walletBalance < invoice.amount) {
                    throw new Error(`Insufficient funds: need ${invoice.amount}, have ${biz?.walletBalance ?? 0}`)
                }
                await tx.business.update({
                    where: { id: invoice.receiverBusinessId },
                    data: { walletBalance: { decrement: invoice.amount } },
                })
            }

            // Credit sender (the one who invoiced)
            if (invoice.senderCitizenId) {
                await tx.citizen.update({
                    where: { id: invoice.senderCitizenId },
                    data: { walletBalance: { increment: invoice.amount } },
                })
            } else if (invoice.senderBusinessId) {
                await tx.business.update({
                    where: { id: invoice.senderBusinessId },
                    data: { walletBalance: { increment: invoice.amount } },
                })
            }

            // Record transaction
            await tx.transaction.create({
                data: {
                    amount: invoice.amount,
                    type: 'PAYMENT',
                    description: `Invoice payment: ${invoice.description}`,
                    status: 'COMPLETED',
                    worldId: invoice.worldId,
                    senderCitizenId: invoice.receiverCitizenId,
                    senderBusinessId: invoice.receiverBusinessId,
                    receiverCitizenId: invoice.senderCitizenId,
                    receiverBusinessId: invoice.senderBusinessId,
                    invoiceId: invoice.id,
                },
            })

            // Mark paid
            await tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'PAID', paidAt: new Date() },
            })
        })

        return { success: true, invoiceId, message: 'Invoice paid' }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Payment failed'
        return { success: false, error: msg }
    }
}

/**
 * Cancel an invoice
 */
export async function cancelInvoice(invoiceId: string): Promise<InvoiceResult> {
    try {
        const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
        if (!invoice) return { success: false, error: 'Invoice not found' }
        if (invoice.status === 'PAID') return { success: false, error: 'Cannot cancel a paid invoice' }

        await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'CANCELLED' },
        })

        return { success: true, invoiceId, message: 'Invoice cancelled' }
    } catch (error) {
        console.error('Error cancelling invoice:', error)
        return { success: false, error: 'Failed to cancel' }
    }
}

/**
 * Get overdue invoices for a world
 */
export async function getOverdueInvoices(worldId: string) {
    return prisma.invoice.findMany({
        where: {
            worldId,
            status: 'PENDING',
            dueDate: { lt: new Date() },
        },
        include: {
            senderCitizen: { select: { displayName: true } },
            senderBusiness: { select: { name: true } },
            receiverCitizen: { select: { displayName: true } },
            receiverBusiness: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
    })
}
