/**
 * Bot Invoice API
 * Create, pay, cancel, and list invoices.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'
import { createInvoice, payInvoice, cancelInvoice, getOverdueInvoices } from '@/lib/invoices'

// GET /api/bot/invoice — List invoices for a citizen
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const discordId = searchParams.get('discordId')
        const discordServerId = searchParams.get('discordServerId')
        const citizenId = searchParams.get('citizenId')
        const filter = searchParams.get('filter') // 'sent', 'received', 'overdue', or 'all'

        // Resolve citizen
        let targetCitizenId = citizenId
        if (!targetCitizenId && discordId && discordServerId) {
            const world = await prisma.world.findUnique({ where: { discordServerId }, select: { id: true } })
            if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })

            const citizen = await prisma.citizen.findFirst({
                where: { user: { discordId }, worldId: world.id },
                select: { id: true, worldId: true },
            })
            if (!citizen) return NextResponse.json({ success: false, error: 'Citizen not found' }, { status: 404 })
            targetCitizenId = citizen.id
        }

        if (!targetCitizenId) {
            // If no citizen, check for worldId to get overdue
            const worldId = searchParams.get('worldId')
            if (worldId && filter === 'overdue') {
                const overdue = await getOverdueInvoices(worldId)
                return NextResponse.json({ success: true, data: overdue })
            }
            return NextResponse.json({ success: false, error: 'citizenId or discordId required' }, { status: 400 })
        }

        const where: Record<string, unknown> = {}
        if (filter === 'sent') {
            where.senderCitizenId = targetCitizenId
        } else if (filter === 'received') {
            where.receiverCitizenId = targetCitizenId
        } else {
            where.OR = [
                { senderCitizenId: targetCitizenId },
                { receiverCitizenId: targetCitizenId },
            ]
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                senderCitizen: { select: { displayName: true } },
                senderBusiness: { select: { name: true } },
                receiverCitizen: { select: { displayName: true } },
                receiverBusiness: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        })

        return NextResponse.json({
            success: true,
            data: invoices.map(inv => ({
                id: inv.id,
                amount: inv.amount,
                description: inv.description,
                status: inv.status,
                dueDate: inv.dueDate?.toISOString(),
                createdAt: inv.createdAt.toISOString(),
                paidAt: inv.paidAt?.toISOString(),
                from: inv.senderCitizen?.displayName || inv.senderBusiness?.name || 'Unknown',
                to: inv.receiverCitizen?.displayName || inv.receiverBusiness?.name || 'Unknown',
            })),
        })
    } catch (error) {
        console.error('Error fetching invoices:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 })
    }
}

// POST /api/bot/invoice — Create, pay, or cancel an invoice
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { action } = body

        switch (action) {
            case 'create': {
                const { discordServerId, senderDiscordId, receiverDiscordId, amount, description, senderBusinessId, receiverBusinessId } = body

                if (!discordServerId || !amount || !description) {
                    return NextResponse.json({ success: false, error: 'discordServerId, amount, and description required' }, { status: 400 })
                }

                const world = await prisma.world.findUnique({ where: { discordServerId }, select: { id: true } })
                if (!world) return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })

                // Resolve sender
                let senderCitizenId: string | undefined
                if (senderDiscordId) {
                    const citizen = await prisma.citizen.findFirst({ where: { user: { discordId: senderDiscordId }, worldId: world.id }, select: { id: true } })
                    if (citizen) senderCitizenId = citizen.id
                }

                // Resolve receiver
                let receiverCitizenId: string | undefined
                if (receiverDiscordId) {
                    const citizen = await prisma.citizen.findFirst({ where: { user: { discordId: receiverDiscordId }, worldId: world.id }, select: { id: true } })
                    if (citizen) receiverCitizenId = citizen.id
                }

                const result = await createInvoice({
                    worldId: world.id,
                    amount,
                    description,
                    senderCitizenId,
                    senderBusinessId,
                    receiverCitizenId,
                    receiverBusinessId,
                })

                return NextResponse.json(result, { status: result.success ? 201 : 400 })
            }

            case 'pay': {
                const { invoiceId } = body
                if (!invoiceId) return NextResponse.json({ success: false, error: 'invoiceId required' }, { status: 400 })
                const result = await payInvoice(invoiceId)
                return NextResponse.json(result, { status: result.success ? 200 : 400 })
            }

            case 'cancel': {
                const { invoiceId } = body
                if (!invoiceId) return NextResponse.json({ success: false, error: 'invoiceId required' }, { status: 400 })
                const result = await cancelInvoice(invoiceId)
                return NextResponse.json(result, { status: result.success ? 200 : 400 })
            }

            default:
                return NextResponse.json({ success: false, error: 'action must be "create", "pay", or "cancel"' }, { status: 400 })
        }
    } catch (error) {
        console.error('Error processing invoice action:', error)
        return NextResponse.json({ success: false, error: 'Invoice action failed' }, { status: 500 })
    }
}
