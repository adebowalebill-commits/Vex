/**
 * Bot Members Sync API
 * Batch-registers Discord server members as citizens in a world.
 * The bot sends the member list after world creation or on demand.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'

interface MemberInput {
    discordId: string
    username: string
    avatar?: string | null
}

interface SyncResult {
    discordId: string
    username: string
    status: 'created' | 'already_citizen' | 'user_created' | 'error'
    citizenId?: string
    error?: string
}

export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { discordServerId, members } = body as {
            discordServerId: string
            members: MemberInput[]
        }

        if (!discordServerId) {
            return NextResponse.json(
                { success: false, error: 'discordServerId is required' },
                { status: 400 }
            )
        }

        if (!members || !Array.isArray(members) || members.length === 0) {
            return NextResponse.json(
                { success: false, error: 'members array is required and must not be empty' },
                { status: 400 }
            )
        }

        if (members.length > 500) {
            return NextResponse.json(
                { success: false, error: 'Maximum 500 members per sync request' },
                { status: 400 }
            )
        }

        // Get the world
        const world = await prisma.world.findUnique({
            where: { discordServerId },
            select: { id: true, initialCitizenBalance: true, name: true },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found for this Discord server' },
                { status: 404 }
            )
        }

        // Get existing citizens for this world to avoid duplicates
        const existingCitizens = await prisma.citizen.findMany({
            where: { worldId: world.id },
            select: { userId: true },
        })
        const existingUserIds = new Set(existingCitizens.map(c => c.userId))

        const results: SyncResult[] = []

        for (const member of members) {
            if (!member.discordId || !member.username) {
                results.push({
                    discordId: member.discordId || 'unknown',
                    username: member.username || 'unknown',
                    status: 'error',
                    error: 'discordId and username are required',
                })
                continue
            }

            try {
                // Find or create the user
                let user = await prisma.user.findUnique({
                    where: { discordId: member.discordId },
                })

                let userCreated = false
                if (!user) {
                    // Create a placeholder user from Discord info
                    user = await prisma.user.create({
                        data: {
                            discordId: member.discordId,
                            name: member.username,
                            image: member.avatar
                                ? `https://cdn.discordapp.com/avatars/${member.discordId}/${member.avatar}.png`
                                : null,
                        },
                    })
                    userCreated = true
                }

                // Check if already a citizen
                if (existingUserIds.has(user.id)) {
                    results.push({
                        discordId: member.discordId,
                        username: member.username,
                        status: 'already_citizen',
                    })
                    continue
                }

                // Create citizen with initial balance and survival needs
                const citizen = await prisma.citizen.create({
                    data: {
                        displayName: member.username,
                        walletBalance: world.initialCitizenBalance,
                        userId: user.id,
                        worldId: world.id,
                        survivalNeeds: {
                            create: { food: 100, water: 100, sleep: 100 },
                        },
                    },
                })

                existingUserIds.add(user.id) // Prevent duplicates within same batch

                results.push({
                    discordId: member.discordId,
                    username: member.username,
                    status: userCreated ? 'user_created' : 'created',
                    citizenId: citizen.id,
                })
            } catch (error) {
                console.error(`Error syncing member ${member.discordId}:`, error)
                results.push({
                    discordId: member.discordId,
                    username: member.username,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                })
            }
        }

        const created = results.filter(r => r.status === 'created' || r.status === 'user_created').length
        const skipped = results.filter(r => r.status === 'already_citizen').length
        const errors = results.filter(r => r.status === 'error').length

        return NextResponse.json({
            success: true,
            data: {
                worldId: world.id,
                worldName: world.name,
                summary: { total: members.length, created, skipped, errors },
                results,
            },
            message: `Synced ${created} new citizens, ${skipped} already existed, ${errors} errors`,
        })
    } catch (error) {
        console.error('Error syncing members:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to sync members' },
            { status: 500 }
        )
    }
}
