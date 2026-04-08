/**
 * Bot Survival API
 * Bot-facing endpoints for querying and replenishing citizen survival needs.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'
import { getCitizenSurvivalStatus, replenishNeed, NeedType } from '@/lib/decay'

// GET /api/bot/survival — Get a citizen's survival needs
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const discordId = searchParams.get('discordId')
        const discordServerId = searchParams.get('discordServerId')
        const citizenId = searchParams.get('citizenId')

        let targetCitizenId = citizenId

        // Resolve citizen by Discord ID + server
        if (!targetCitizenId && discordId && discordServerId) {
            const world = await prisma.world.findUnique({
                where: { discordServerId },
                select: { id: true },
            })

            if (!world) {
                return NextResponse.json(
                    { success: false, error: 'World not found' },
                    { status: 404 }
                )
            }

            const citizen = await prisma.citizen.findFirst({
                where: { user: { discordId }, worldId: world.id },
                select: { id: true },
            })

            if (!citizen) {
                return NextResponse.json(
                    { success: false, error: 'Citizen not found' },
                    { status: 404 }
                )
            }

            targetCitizenId = citizen.id
        }

        if (!targetCitizenId) {
            return NextResponse.json(
                { success: false, error: 'citizenId or (discordId + discordServerId) required' },
                { status: 400 }
            )
        }

        const status = await getCitizenSurvivalStatus(targetCitizenId)

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'Citizen not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: status,
        })
    } catch (error) {
        console.error('Error fetching survival status:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch survival status' },
            { status: 500 }
        )
    }
}

// POST /api/bot/survival — Purchase food/water or rest (sleep)
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { discordId, discordServerId, citizenId, needType, amount } = body

        // Validate need type
        const validNeeds: NeedType[] = ['food', 'water', 'sleep']
        if (!needType || !validNeeds.includes(needType)) {
            return NextResponse.json(
                { success: false, error: 'needType must be food, water, or sleep' },
                { status: 400 }
            )
        }

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'amount must be a positive number' },
                { status: 400 }
            )
        }

        // Resolve citizen ID
        let targetCitizenId = citizenId

        if (!targetCitizenId && discordId && discordServerId) {
            const world = await prisma.world.findUnique({
                where: { discordServerId },
                select: { id: true },
            })

            if (!world) {
                return NextResponse.json(
                    { success: false, error: 'World not found' },
                    { status: 404 }
                )
            }

            const citizen = await prisma.citizen.findFirst({
                where: { user: { discordId }, worldId: world.id },
                select: { id: true },
            })

            if (!citizen) {
                return NextResponse.json(
                    { success: false, error: 'Citizen not found' },
                    { status: 404 }
                )
            }

            targetCitizenId = citizen.id
        }

        if (!targetCitizenId) {
            return NextResponse.json(
                { success: false, error: 'citizenId or (discordId + discordServerId) required' },
                { status: 400 }
            )
        }

        const result = await replenishNeed(targetCitizenId, needType, amount)

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                needType,
                newValue: result.newValue,
                cost: result.cost,
            },
            message: result.cost! > 0
                ? `Purchased ${amount} ${needType} for ${result.cost} currency`
                : `Rested — ${needType} restored to ${result.newValue}`,
        })
    } catch (error) {
        console.error('Error replenishing need:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to replenish need' },
            { status: 500 }
        )
    }
}
