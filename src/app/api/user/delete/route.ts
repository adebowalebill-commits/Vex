import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const sessionUserId = session.user.id

        if (!sessionUserId) {
            return NextResponse.json({ error: "User ID not found" }, { status: 400 })
        }

        console.log(`[DELETE_ACCOUNT] Starting deletion for session user: ${sessionUserId}`)

        // Resolve the actual database user — handle Discord ID vs DB CUID
        let user = await prisma.user.findUnique({ where: { id: sessionUserId } })
        if (!user) {
            // Try by discordId
            user = await prisma.user.findUnique({ where: { discordId: sessionUserId } })
        }

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const userId = user.id
        console.log(`[DELETE_ACCOUNT] Resolved DB user: ${userId}`)

        // Find all worlds owned by the user
        const ownedWorlds = await prisma.world.findMany({
            where: { ownerId: userId },
            select: { id: true, name: true }
        })

        console.log(`[DELETE_ACCOUNT] User owns ${ownedWorlds.length} worlds: ${ownedWorlds.map(w => w.name).join(', ')}`)

        // Delete all owned worlds (cascade deletes citizens, businesses, etc.)
        if (ownedWorlds.length > 0) {
            await prisma.world.deleteMany({
                where: { ownerId: userId }
            })
            console.log(`[DELETE_ACCOUNT] Deleted ${ownedWorlds.length} worlds`)
        }

        // Delete the user (cascades to Account, Session, Citizen)
        await prisma.user.delete({
            where: { id: userId }
        })

        console.log(`[DELETE_ACCOUNT] User deleted successfully`)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[DELETE_ACCOUNT] Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
