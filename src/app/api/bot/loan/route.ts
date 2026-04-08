import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireBotAuth } from '@/lib/bot-auth'
import { issueLoan } from '@/lib/ledger'

// POST /api/bot/loan - Issue a treasury loan to a citizen
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const {
            discordServerId,
            citizenDiscordId,
            amount,
            interestRate = 5,
            termMonths = 1,
        } = body

        if (!discordServerId || !citizenDiscordId || !amount) {
            return NextResponse.json(
                { success: false, error: 'discordServerId, citizenDiscordId, and amount are required' },
                { status: 400 }
            )
        }

        if (amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Amount must be positive' },
                { status: 400 }
            )
        }

        // Get world
        const world = await prisma.world.findUnique({
            where: { discordServerId },
            select: { id: true, treasury: true },
        })

        if (!world) {
            return NextResponse.json(
                { success: false, error: 'World not found' },
                { status: 404 }
            )
        }

        // Get citizen
        const citizen = await prisma.citizen.findFirst({
            where: {
                worldId: world.id,
                user: { discordId: citizenDiscordId }
            },
            select: { id: true }
        })

        if (!citizen) {
            return NextResponse.json(
                { success: false, error: 'Citizen not found in this world' },
                { status: 404 }
            )
        }

        // Issue loan
        const result = await issueLoan(
            world.id,
            citizen.id,
            amount,
            interestRate,
            termMonths
        )

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || 'Failed to issue loan' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                loanId: result.loanId,
                amount,
                interestRate,
                termMonths
            },
            message: 'Loan successfully issued',
        })
    } catch (error) {
        console.error('Error issuing loan:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
