/**
 * Bot Auth API
 * Links Discord users to web accounts and provides user lookup
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

// GET /api/bot/auth - Get user info by Discord ID
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const discordId = searchParams.get('discordId')
        const worldId = searchParams.get('worldId')
        const discordServerId = searchParams.get('discordServerId')

        if (!discordId) {
            return NextResponse.json(
                { success: false, error: 'discordId is required' },
                { status: 400 }
            )
        }

        // Get user by Discord ID
        const user = await prisma.user.findUnique({
            where: { discordId },
            select: {
                id: true,
                name: true,
                discordId: true,
                globalReputation: true,
                image: true,
            },
        })

        if (!user) {
            return NextResponse.json({
                success: true,
                data: null,
                message: 'User not registered',
            })
        }

        // If worldId or discordServerId provided, get citizen info too
        let citizen = null
        if (worldId || discordServerId) {
            const whereClause: Record<string, unknown> = { userId: user.id }

            if (worldId) {
                whereClause.worldId = worldId
            } else if (discordServerId) {
                whereClause.world = { discordServerId }
            }

            citizen = await prisma.citizen.findFirst({
                where: whereClause,
                select: {
                    id: true,
                    displayName: true,
                    walletBalance: true,
                    bankBalance: true,
                    isActive: true,
                    worldId: true,
                    survivalNeeds: {
                        select: { food: true, water: true, sleep: true },
                    },
                },
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                user,
                citizen,
            },
        })
    } catch (error) {
        console.error('Error fetching user:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user' },
            { status: 500 }
        )
    }
}

// POST /api/bot/auth - Register a citizen in a world
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { discordId, discordServerId, displayName } = body

        if (!discordId || !discordServerId) {
            return NextResponse.json(
                { success: false, error: 'discordId and discordServerId are required' },
                { status: 400 }
            )
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { discordId },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User must first sign in via the website' },
                { status: 404 }
            )
        }

        // Get world
        const world = await prisma.world.findUnique({
            where: { discordServerId },
            select: { id: true, initialCitizenBalance: true },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found for this Discord server' },
                { status: 404 }
            )
        }

        // Check if already a citizen
        const existingCitizen = await prisma.citizen.findUnique({
            where: {
                userId_worldId: {
                    userId: user.id,
                    worldId: world.id,
                },
            },
        })

        if (existingCitizen) {
            return NextResponse.json({
                success: true,
                data: existingCitizen,
                message: 'Already a citizen',
            })
        }

        // Create citizen with initial balance
        const citizen = await prisma.citizen.create({
            data: {
                displayName: displayName || user.name || 'Anonymous',
                walletBalance: world.initialCitizenBalance,
                userId: user.id,
                worldId: world.id,
                survivalNeeds: {
                    create: {
                        food: 100,
                        water: 100,
                        sleep: 100,
                    },
                },
            },
            include: {
                survivalNeeds: true,
            },
        })

        return NextResponse.json({
            success: true,
            data: citizen,
            message: 'Citizen registered successfully',
        })
    } catch (error) {
        console.error('Error registering citizen:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to register citizen' },
            { status: 500 }
        )
    }
}
