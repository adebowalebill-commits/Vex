import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'

// GET - Get treasury data for a world
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { worldId } = await params

        // Get world with treasury
        const world = await prisma.world.findUnique({
            where: { id: worldId },
            include: {
                treasury: true,
                owner: {
                    select: { id: true }
                }
            }
        })

        if (!world) {
            return NextResponse.json(
                { error: 'World not found' },
                { status: 404 }
            )
        }

        // Get tax revenue (sum of TAX transactions)
        const taxRevenue = await prisma.transaction.aggregate({
            where: {
                worldId,
                type: 'TAX'
            },
            _sum: { amount: true }
        })

        // Get subsidies paid (sum of TREASURY_SUBSIDY transactions)
        const subsidiesPaid = await prisma.transaction.aggregate({
            where: {
                worldId,
                type: 'TREASURY_SUBSIDY'
            },
            _sum: { amount: true }
        })

        // Get recent tax transactions
        const recentTaxes = await prisma.transaction.findMany({
            where: {
                worldId,
                type: 'TAX'
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                senderCitizen: {
                    select: { displayName: true }
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                balance: world.treasury?.balance || 0,
                revenue: {
                    taxes: world.treasury?.totalTaxRevenue || 0,
                    permits: world.treasury?.totalPermitRevenue || 0,
                    land: world.treasury?.totalLandRevenue || 0,
                    total: (world.treasury?.totalTaxRevenue || 0) + (world.treasury?.totalPermitRevenue || 0) + (world.treasury?.totalLandRevenue || 0),
                },
                spending: {
                    subsidies: world.treasury?.totalSubsidies || 0,
                    loansIssued: world.treasury?.totalLoansIssued || 0,
                    total: (world.treasury?.totalSubsidies || 0) + (world.treasury?.totalLoansIssued || 0),
                },
                taxRevenue: taxRevenue._sum.amount || 0,
                subsidiesPaid: subsidiesPaid._sum.amount || 0,
                salesTaxRate: world.salesTaxRate,
                incomeTaxRate: world.incomeTaxRate,
                propertyTaxRate: world.propertyTaxRate,
                currencySymbol: world.currencySymbol,
                isOwner: world.ownerId === session.user.id,
                recentTaxes: recentTaxes.map(t => ({
                    id: t.id,
                    amount: t.amount,
                    senderName: t.senderCitizen?.displayName || 'Unknown',
                    createdAt: t.createdAt
                }))
            }
        })
    } catch (error) {
        console.error('Error fetching treasury:', error)
        return NextResponse.json(
            { error: 'Failed to fetch treasury data' },
            { status: 500 }
        )
    }
}

// POST - Issue subsidy from treasury
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { worldId } = await params
        const body = await request.json()
        const { recipientId, amount, description } = body

        if (!recipientId || !amount || amount <= 0) {
            return NextResponse.json(
                { error: 'Recipient and valid amount are required' },
                { status: 400 }
            )
        }

        // Permission check: only world owner can issue subsidies
        const permError = await requirePermission(session.user.id, worldId, 'ISSUE_SUBSIDY')
        if (permError) return permError

        const world = await prisma.world.findUnique({
            where: { id: worldId },
            include: { treasury: true }
        })

        if (!world) {
            return NextResponse.json(
                { error: 'World not found' },
                { status: 404 }
            )
        }

        if (!world.treasury || world.treasury.balance < amount) {
            return NextResponse.json(
                { error: 'Insufficient treasury balance' },
                { status: 400 }
            )
        }

        // Execute subsidy transaction atomically
        const result = await prisma.$transaction(async (tx) => {
            // Deduct from treasury
            await tx.treasury.update({
                where: { worldId },
                data: { balance: { decrement: amount } }
            })

            // Add to recipient wallet
            await tx.citizen.update({
                where: { id: recipientId },
                data: { walletBalance: { increment: amount } }
            })

            // Record transaction
            const transaction = await tx.transaction.create({
                data: {
                    amount,
                    type: 'TREASURY_SUBSIDY',
                    description: description || 'Treasury subsidy',
                    worldId,
                    receiverCitizenId: recipientId
                }
            })

            return transaction
        })

        return NextResponse.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error issuing subsidy:', error)
        return NextResponse.json(
            { error: 'Failed to issue subsidy' },
            { status: 500 }
        )
    }
}

// PATCH - Update tax rates
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { worldId } = await params
        const body = await request.json()
        const { salesTaxRate, incomeTaxRate, propertyTaxRate } = body

        // Permission check: only world owner can set tax rates
        const permError = await requirePermission(session.user.id, worldId, 'SET_TAX_RATES')
        if (permError) return permError

        const world = await prisma.world.findUnique({
            where: { id: worldId }
        })

        if (!world) {
            return NextResponse.json(
                { error: 'World not found' },
                { status: 404 }
            )
        }

        // Validate tax rates
        const rates: { salesTaxRate?: number; incomeTaxRate?: number; propertyTaxRate?: number } = {}

        if (salesTaxRate !== undefined) {
            if (salesTaxRate < 0 || salesTaxRate > 100) {
                return NextResponse.json(
                    { error: 'Sales tax rate must be between 0 and 100' },
                    { status: 400 }
                )
            }
            rates.salesTaxRate = salesTaxRate
        }

        if (incomeTaxRate !== undefined) {
            if (incomeTaxRate < 0 || incomeTaxRate > 100) {
                return NextResponse.json(
                    { error: 'Income tax rate must be between 0 and 100' },
                    { status: 400 }
                )
            }
            rates.incomeTaxRate = incomeTaxRate
        }

        if (propertyTaxRate !== undefined) {
            if (propertyTaxRate < 0 || propertyTaxRate > 100) {
                return NextResponse.json(
                    { error: 'Property tax rate must be between 0 and 100' },
                    { status: 400 }
                )
            }
            rates.propertyTaxRate = propertyTaxRate
        }

        const updated = await prisma.world.update({
            where: { id: worldId },
            data: rates
        })

        return NextResponse.json({
            success: true,
            data: {
                salesTaxRate: updated.salesTaxRate,
                incomeTaxRate: updated.incomeTaxRate,
                propertyTaxRate: updated.propertyTaxRate
            }
        })
    } catch (error) {
        console.error('Error updating tax rates:', error)
        return NextResponse.json(
            { error: 'Failed to update tax rates' },
            { status: 500 }
        )
    }
}
