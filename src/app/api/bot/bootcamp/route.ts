/**
 * Bot Bootcamp API
 * Check bootcamp status and progress for a world.
 * GET /api/bot/bootcamp?discordServerId=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBotAuth } from '@/lib/bot-auth'
import prisma from '@/lib/prisma'
import { getBootcampProgress } from '@/lib/bootcamp'

export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const discordServerId = searchParams.get('discordServerId')

    if (!discordServerId) {
        return NextResponse.json({ success: false, error: 'discordServerId is required' }, { status: 400 })
    }

    const world = await prisma.world.findUnique({
        where: { discordServerId },
        select: { id: true },
    })

    if (!world) {
        return NextResponse.json({ success: false, error: 'World not found' }, { status: 404 })
    }

    const progress = await getBootcampProgress(world.id)

    if (!progress) {
        return NextResponse.json({ success: false, error: 'Could not get progress' }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        data: progress,
        message: progress.isComplete
            ? '🎓 Economy has graduated! All essential businesses are operational.'
            : `📋 Bootcamp: ${progress.filledCount}/${progress.totalRequired} essential businesses filled (${progress.progress}%)`,
    })
}
