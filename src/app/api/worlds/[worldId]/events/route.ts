/**
 * SSE Real-time Updates Endpoint
 * Streams world events (transactions, business changes) to the dashboard in real time.
 * GET /api/worlds/[worldId]/events
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Per-world subscriber sets
const subscribers = new Map<string, Set<ReadableStreamDefaultController>>()

/**
 * Push an event to all subscribers of a world.
 * Call this from other API routes after mutations.
 */
export function pushWorldEvent(worldId: string, event: string, data: unknown) {
    const subs = subscribers.get(worldId)
    if (!subs || subs.size === 0) return

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(payload)

    for (const controller of subs) {
        try {
            controller.enqueue(encoded)
        } catch {
            subs.delete(controller)
        }
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 })
    }

    const { worldId } = await params

    // Verify user has access
    const world = await prisma.world.findFirst({
        where: {
            id: worldId,
            OR: [
                { ownerId: session.user.id },
                { citizens: { some: { userId: session.user.id } } },
            ],
        },
        select: { id: true },
    })

    if (!world) {
        return new Response('World not found', { status: 404 })
    }

    const stream = new ReadableStream({
        start(controller) {
            // Register subscriber
            if (!subscribers.has(worldId)) {
                subscribers.set(worldId, new Set())
            }
            subscribers.get(worldId)!.add(controller)

            // Send initial keepalive
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode(`event: connected\ndata: {"worldId":"${worldId}"}\n\n`))

            // Keepalive every 30 seconds
            const keepalive = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: keepalive\n\n`))
                } catch {
                    clearInterval(keepalive)
                }
            }, 30_000)

            // Cleanup on close
            request.signal.addEventListener('abort', () => {
                clearInterval(keepalive)
                subscribers.get(worldId)?.delete(controller)
                try { controller.close() } catch { /* already closed */ }
            })
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    })
}
