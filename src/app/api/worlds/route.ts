import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper to get or create user in database
async function ensureUserExists(session: { user: { id: string; email?: string | null; name?: string | null; image?: string | null } }) {
    const sessionUserId = session.user.id
    const userEmail = session.user.email

    console.log('EnsureUserExists called for:', { sessionUserId, userEmail })

    // If we have a Discord ID (which sessionUserId usually is in our hybrid setup), use it
    if (sessionUserId) {
        try {
            // First try to find by discordId explicit field
            const existingUser = await prisma.user.findUnique({
                where: { discordId: sessionUserId }
            })

            if (existingUser) {
                console.log('Found user by discordId:', existingUser.id)
                return existingUser
            }
        } catch (e) {
            console.warn('Error fetching by discordId:', e)
        }
    }

    // If email exists, try to find by email to avoid unique constraint violation on creation
    if (userEmail) {
        try {
            const existingUserByEmail = await prisma.user.findUnique({
                where: { email: userEmail }
            })

            if (existingUserByEmail) {
                console.log('Found user by email:', existingUserByEmail.id)
                // Update discordId if missing
                if (!existingUserByEmail.discordId && sessionUserId) {
                    return await prisma.user.update({
                        where: { id: existingUserByEmail.id },
                        data: { discordId: sessionUserId }
                    })
                }
                return existingUserByEmail
            }
        } catch (e) {
            console.warn('Error fetching by email:', e)
        }
    }

    // If we get here, we need to create the user, but we must be careful about constraints.
    // The previous checks should have caught existing users.
    // We'll try to create, and if it fails, we'll try to fallback.

    console.log('Creating new user for:', sessionUserId)

    try {
        return await prisma.user.create({
            data: {
                discordId: sessionUserId,
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
            }
        })
    } catch (error) {
        console.error('Error creating user:', error)
        // One last desperate try - maybe they exist by ID?
        const fallback = await prisma.user.findUnique({ where: { id: sessionUserId } })
        if (fallback) return fallback

        throw error
    }
}

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

        // Ensure user exists using our robust helper
        const user = await ensureUserExists(session as any)
        const userId = user.id

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
            { error: 'Failed to fetch worlds', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

// POST - Create a new world
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            console.log('No session user id found')
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Ensure user exists and get their database ID
        let user
        try {
            user = await ensureUserExists(session as any)
        } catch (dbError) {
            console.error('Database connection/user creation error:', dbError)
            return NextResponse.json(
                {
                    error: 'Database connection failed. Please try again.',
                    details: dbError instanceof Error ? dbError.message : 'Unknown DB error'
                },
                { status: 503 }
            )
        }

        const userId = user.id

        console.log('Creating world for user:', { sessionId: session.user.id, dbId: userId })

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

        console.log('World created successfully:', world.id)

        return NextResponse.json({
            success: true,
            data: world
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating world:', error)
        return NextResponse.json(
            {
                error: 'Failed to create world',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
