/**
 * Individual Citizen Detail API
 * Returns full citizen data: profile, financials, needs, businesses, employment, transactions
 * Accessible by: the citizen's user or the world owner
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface RouteParams {
    params: Promise<{ citizenId: string }>
}

// GET /api/citizens/[citizenId] — Fetch citizen detail
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        const { citizenId } = await params

        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const citizen = await prisma.citizen.findUnique({
            where: { id: citizenId },
            include: {
                user: { select: { id: true, name: true, image: true, discordId: true } },
                world: {
                    select: { id: true, name: true, ownerId: true, currencySymbol: true },
                },
                survivalNeeds: true,
                ownedBusinesses: {
                    where: { isActive: true },
                    select: {
                        id: true, name: true, type: true,
                        walletBalance: true, isOperating: true,
                        _count: { select: { employees: true } },
                    },
                },
                employments: {
                    where: { isActive: true },
                    include: {
                        business: { select: { id: true, name: true, type: true } },
                    },
                },
                inventory: {
                    include: {
                        resource: { select: { id: true, name: true, category: true, baseValue: true } },
                    },
                },
            },
        })

        if (!citizen) {
            return NextResponse.json({ success: false, error: 'Citizen not found' }, { status: 404 })
        }

        // Auth: must be the citizen's user or world owner
        const isWorldOwner = citizen.world.ownerId === session.user.id
        const isCitizenUser = citizen.user.id === session.user.id
        if (!isWorldOwner && !isCitizenUser) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        }

        // Fetch transactions (last 50)
        const transactions = await prisma.transaction.findMany({
            where: {
                worldId: citizen.worldId,
                OR: [
                    { senderCitizenId: citizenId },
                    { receiverCitizenId: citizenId },
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

        // Calculate income/spending (7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const incomeResult = await prisma.transaction.aggregate({
            where: {
                receiverCitizenId: citizenId,
                status: 'COMPLETED',
                createdAt: { gte: sevenDaysAgo },
            },
            _sum: { amount: true },
        })

        const spendingResult = await prisma.transaction.aggregate({
            where: {
                senderCitizenId: citizenId,
                status: 'COMPLETED',
                createdAt: { gte: sevenDaysAgo },
            },
            _sum: { amount: true },
        })

        const income7d = incomeResult._sum.amount || 0
        const spending7d = spendingResult._sum.amount || 0

        return NextResponse.json({
            success: true,
            data: {
                citizen: {
                    id: citizen.id,
                    displayName: citizen.displayName,
                    walletBalance: citizen.walletBalance,
                    bankBalance: citizen.bankBalance,
                    totalBalance: citizen.walletBalance + citizen.bankBalance,
                    hasPassport: citizen.hasPassport,
                    isActive: citizen.isActive,
                    createdAt: citizen.createdAt,
                    user: citizen.user,
                },
                world: citizen.world,
                survivalNeeds: citizen.survivalNeeds ? {
                    food: citizen.survivalNeeds.food,
                    water: citizen.survivalNeeds.water,
                    sleep: citizen.survivalNeeds.sleep,
                    lastDecayAt: citizen.survivalNeeds.lastDecayAt,
                } : null,
                businesses: citizen.ownedBusinesses.map(b => ({
                    id: b.id,
                    name: b.name,
                    type: b.type,
                    walletBalance: b.walletBalance,
                    isOperating: b.isOperating,
                    employeeCount: b._count.employees,
                })),
                employment: citizen.employments.map(emp => ({
                    id: emp.id,
                    businessId: emp.business.id,
                    businessName: emp.business.name,
                    businessType: emp.business.type,
                    position: emp.position,
                    hourlyWage: emp.hourlyWage,
                    hoursWorked: emp.hoursWorked,
                    hiredAt: emp.hiredAt,
                })),
                inventory: citizen.inventory.map(item => ({
                    resourceId: item.resourceId,
                    resourceName: item.resource.name,
                    category: item.resource.category,
                    quantity: item.quantity,
                    unitValue: item.resource.baseValue,
                    totalValue: item.quantity * item.resource.baseValue,
                })),
                financials: {
                    income7d,
                    spending7d,
                    net7d: income7d - spending7d,
                },
                transactions,
            },
        })
    } catch (error) {
        console.error('Error fetching citizen detail:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch citizen' }, { status: 500 })
    }
}
