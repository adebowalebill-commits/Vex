import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - List worlds user owns or is citizen of
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = session.user.id

        // Get worlds owned by user
        const ownedWorlds = await prisma.world.findMany({
            where: { ownerId: userId },
            include: {
                _count: {
                    select: {
                        citizens: true,
                        businesses: true,
                        transactions: true
                    }
                },
                treasury: {
                    select: { balance: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Get worlds where user is a citizen (but not owner)
        const citizenWorlds = await prisma.world.findMany({
            where: {
                citizens: {
                    some: { userId }
                },
                NOT: { ownerId: userId }
            },
            include: {
                _count: {
                    select: {
                        citizens: true,
                        businesses: true
                    }
                },
                citizens: {
                    where: { userId },
                    select: {
                        walletBalance: true,
                        bankBalance: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            success: true,
            data: {
                owned: ownedWorlds.map(w => ({
                    id: w.id,
                    name: w.name,
                    description: w.description,
                    discordServerId: w.discordServerId,
                    currencyName: w.currencyName,
                    currencySymbol: w.currencySymbol,
                    citizenCount: w._count.citizens,
                    businessCount: w._count.businesses,
                    transactionCount: w._count.transactions,
                    treasuryBalance: w.treasury?.balance || 0,
                    isOwner: true,
                    createdAt: w.createdAt
                })),
                member: citizenWorlds.map(w => ({
                    id: w.id,
                    name: w.name,
                    description: w.description,
                    currencySymbol: w.currencySymbol,
                    citizenCount: w._count.citizens,
                    businessCount: w._count.businesses,
                    myBalance: w.citizens[0] ?
                        w.citizens[0].walletBalance + w.citizens[0].bankBalance : 0,
                    isOwner: false,
                    createdAt: w.createdAt
                }))
            }
        })
    } catch (error) {
        console.error('Error fetching worlds:', error)
        return NextResponse.json(
            { error: 'Failed to fetch worlds' },
            { status: 500 }
        )
    }
}

// POST - Create a new world
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = session.user.id
        const body = await request.json()

        const {
            name,
            description,
            discordServerId,
            currencyName = 'Credits',
            currencySymbol = '©',
            salesTaxRate = 5,
            incomeTaxRate = 10,
            propertyTaxRate = 2,
            initialCitizenBalance = 1000
        } = body

        // Validate required fields
        if (!name || !discordServerId) {
            return NextResponse.json(
                { error: 'Name and Discord Server ID are required' },
                { status: 400 }
            )
        }

        // Check if world with this Discord server already exists
        const existingWorld = await prisma.world.findUnique({
            where: { discordServerId }
        })

        if (existingWorld) {
            return NextResponse.json(
                { error: 'A world already exists for this Discord server' },
                { status: 409 }
            )
        }

        // Create world with treasury
        const world = await prisma.world.create({
            data: {
                name,
                description,
                discordServerId,
                currencyName,
                currencySymbol,
                salesTaxRate,
                incomeTaxRate,
                propertyTaxRate,
                initialCitizenBalance,
                ownerId: userId,
                treasury: {
                    create: {
                        balance: 0
                    }
                }
            },
            include: {
                treasury: true
            }
        })

        return NextResponse.json({
            success: true,
            data: world
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating world:', error)
        return NextResponse.json(
            { error: 'Failed to create world' },
            { status: 500 }
        )
    }
}
