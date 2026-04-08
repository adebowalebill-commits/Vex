/**
 * Individual Business Detail API
 * Returns full business data: financials, employees, inventory, transactions, P&L
 * Accessible by: business owner (citizen) or world owner
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface RouteParams {
    params: Promise<{ businessId: string }>
}

// GET /api/businesses/[businessId] — Fetch business detail
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        const { businessId } = await params

        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const business = await prisma.business.findUnique({
            where: { id: businessId },
            include: {
                owner: {
                    select: { id: true, displayName: true, userId: true },
                },
                region: { select: { id: true, name: true } },
                world: {
                    select: {
                        id: true, name: true, ownerId: true, currencySymbol: true,
                    },
                },
                employees: {
                    where: { isActive: true },
                    include: {
                        citizen: { select: { id: true, displayName: true } },
                    },
                    orderBy: { hiredAt: 'desc' },
                },
                inventory: {
                    include: {
                        resource: { select: { id: true, name: true, category: true, baseValue: true } },
                    },
                },
                productionInputs: {
                    include: {
                        resource: { select: { id: true, name: true, category: true } },
                    },
                },
                productionOutputs: {
                    include: {
                        resource: { select: { id: true, name: true, category: true } },
                    },
                },
            },
        })

        if (!business) {
            return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
        }

        // Auth: must be business owner or world owner
        const isWorldOwner = business.world.ownerId === session.user.id
        const isBusinessOwner = business.owner.userId === session.user.id
        if (!isWorldOwner && !isBusinessOwner) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        }

        // Fetch transactions (last 50)
        const transactions = await prisma.transaction.findMany({
            where: {
                worldId: business.worldId,
                OR: [
                    { senderBusinessId: businessId },
                    { receiverBusinessId: businessId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true, amount: true, type: true, description: true,
                taxAmount: true, status: true, createdAt: true,
                senderCitizen: { select: { displayName: true } },
                senderBusiness: { select: { name: true } },
                receiverCitizen: { select: { displayName: true } },
                receiverBusiness: { select: { name: true } },
            },
        })

        // Calculate P&L (7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const revenueResult = await prisma.transaction.aggregate({
            where: {
                receiverBusinessId: businessId,
                status: 'COMPLETED',
                createdAt: { gte: sevenDaysAgo },
            },
            _sum: { amount: true },
        })

        const expenseResult = await prisma.transaction.aggregate({
            where: {
                senderBusinessId: businessId,
                status: 'COMPLETED',
                createdAt: { gte: sevenDaysAgo },
            },
            _sum: { amount: true },
        })

        const revenue7d = revenueResult._sum.amount || 0
        const expenses7d = expenseResult._sum.amount || 0

        // Payroll calculation
        const payrollDue = business.employees.reduce((sum, emp) => sum + (emp.hourlyWage * 8), 0) // 8h/day estimate

        // Inventory value
        const inventoryValue = business.inventory.reduce((sum, item) =>
            sum + (item.quantity * item.resource.baseValue), 0
        )

        return NextResponse.json({
            success: true,
            data: {
                business: {
                    id: business.id,
                    name: business.name,
                    description: business.description,
                    type: business.type,
                    operatingCost: business.operatingCost,
                    productionCapacity: business.productionCapacity,
                    walletBalance: business.walletBalance,
                    isActive: business.isActive,
                    isOperating: business.isOperating,
                    createdAt: business.createdAt,
                    owner: business.owner,
                    region: business.region,
                },
                world: business.world,
                employees: business.employees.map(emp => ({
                    id: emp.id,
                    citizenId: emp.citizenId,
                    citizenName: emp.citizen.displayName,
                    position: emp.position,
                    hourlyWage: emp.hourlyWage,
                    hoursWorked: emp.hoursWorked,
                    hiredAt: emp.hiredAt,
                })),
                inventory: business.inventory.map(item => ({
                    resourceId: item.resourceId,
                    resourceName: item.resource.name,
                    category: item.resource.category,
                    quantity: item.quantity,
                    unitValue: item.resource.baseValue,
                    totalValue: item.quantity * item.resource.baseValue,
                })),
                production: {
                    inputs: business.productionInputs.map(i => ({
                        resourceName: i.resource.name,
                        category: i.resource.category,
                        quantityRequired: i.quantity,
                    })),
                    outputs: business.productionOutputs.map(o => ({
                        resourceName: o.resource.name,
                        category: o.resource.category,
                        quantityProduced: o.quantity,
                    })),
                    capacity: business.productionCapacity,
                },
                financials: {
                    revenue7d,
                    expenses7d,
                    profit7d: revenue7d - expenses7d,
                    payrollDue,
                    inventoryValue,
                    walletBalance: business.walletBalance,
                },
                transactions,
            },
        })
    } catch (error) {
        console.error('Error fetching business detail:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch business' }, { status: 500 })
    }
}
