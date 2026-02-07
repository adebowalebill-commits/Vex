import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // @ts-ignore - session.user.id is added in auth options
        const userId = session.user.id

        if (!userId) {
            return NextResponse.json({ error: "User ID not found" }, { status: 400 })
        }

        console.log(`[DELETE_ACCOUNT] Starting deletion for user: ${userId}`)

        // 1. Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // 2. Find all worlds owned by the user
        const ownedWorlds = await prisma.world.findMany({
            where: { ownerId: userId },
            select: { id: true, name: true }
        })

        console.log(`[DELETE_ACCOUNT] User owns ${ownedWorlds.length} worlds: ${ownedWorlds.map(w => w.name).join(', ')}`)

        // 3. Delete all owned worlds
        // Note: We delete them one by one or via deleteMany. 
        // Since World -> Region/Citizen/etc has onDelete: Cascade in schema, 
        // deleting the world should clean up its children.
        if (ownedWorlds.length > 0) {
            await prisma.world.deleteMany({
                where: { ownerId: userId }
            })
            console.log(`[DELETE_ACCOUNT] Deleted ${ownedWorlds.length} worlds`)
        }

        // 4. Delete the user
        // This will cascade to Account, Session, Citizen (orphaned if logic allows, 
        // but Citizen has onDelete: Cascade for user relation)
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
