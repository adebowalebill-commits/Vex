/**
 * Bot Resource Extraction API
 * POST /api/bot/extract — Workers perform RNG extraction at resource businesses
 * GET  /api/bot/extract — Get loot tables for reference
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBotAuth } from '@/lib/bot-auth'
import { performExtraction, EXTRACTION_LOOT_TABLES } from '@/lib/extraction'

// GET /api/bot/extract — Returns loot table definitions
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    // Format loot tables for bot reference
    const tables = Object.entries(EXTRACTION_LOOT_TABLES).map(([type, table]) => ({
        businessType: type,
        maxDropsPerExtraction: table.maxDrops,
        cooldownMs: table.cooldownMs,
        drops: table.drops.map(d => ({
            resource: d.resource,
            minQty: d.minQty,
            maxQty: d.maxQty,
            rarity: d.rarity,
            dropChance: `${((d.weight / table.drops.reduce((s, x) => s + x.weight, 0)) * 100).toFixed(1)}%`,
        })),
    }))

    return NextResponse.json({ success: true, data: tables })
}

// POST /api/bot/extract — Perform an extraction
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { discordId, discordServerId, businessId } = body

        if (!discordId || !discordServerId || !businessId) {
            return NextResponse.json(
                { success: false, error: 'discordId, discordServerId, and businessId are required' },
                { status: 400 }
            )
        }

        const result = await performExtraction(businessId, discordId, discordServerId)

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            data: result.data,
            message: formatExtractionMessage(result.data!),
        })
    } catch (error) {
        console.error('Error performing extraction:', error)
        const message = error instanceof Error ? error.message : 'Extraction failed'
        return NextResponse.json(
            { success: false, error: `Extraction failed: ${message}` },
            { status: 500 }
        )
    }
}

// Format a nice message for the bot to display
function formatExtractionMessage(data: NonNullable<Awaited<ReturnType<typeof performExtraction>>['data']>): string {
    const lines = [`⛏️ ${data.workerName} extracted resources at ${data.businessName}:`]

    for (const ext of data.extractions) {
        const rarityEmoji =
            ext.rarity === 'LEGENDARY' ? '💎' :
            ext.rarity === 'RARE' ? '✨' :
            ext.rarity === 'UNCOMMON' ? '🔹' : '▪️'
        
        lines.push(`  ${rarityEmoji} ${ext.quantity}x ${ext.resource} (${ext.rarity}) — value: ${ext.value}`)
    }

    lines.push(`\n💰 Total value: ${data.totalValue}`)

    return lines.join('\n')
}
