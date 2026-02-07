import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
    req: Request,
    { params }: { params: { worldId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // @ts-ignore
        const userId = session.user.id
        const worldId = params.worldId
        const { recipientName, amount, description } = await req.json()

        if (!recipientName || !amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 })
        }

        // 1. Verify World Ownership using userId
        // We need to check if the user is the owner of the world
        const world = await prisma.world.findUnique({
            where: { id: worldId },
            include: { treasury: true }
        })

        if (!world) {
            return NextResponse.json({ error: "World not found" }, { status: 404 })
        }

        if (world.ownerId !== userId) {
            return NextResponse.json({ error: "Only the world owner can issue subsidies" }, { status: 403 })
        }

        if (!world.treasury) {
            return NextResponse.json({ error: "Treasury not initialized" }, { status: 500 })
        }

        if (world.treasury.balance < amount) {
            return NextResponse.json({ error: "Insufficient treasury funds" }, { status: 400 })
        }

        // 2. Find Recipient Citizen
        // We search by exact displayName match within this world
        const citizen = await prisma.citizen.findFirst({
            where: {
                worldId: worldId,
                displayName: recipientName
            }
        })

        if (!citizen) {
            return NextResponse.json({ error: `Citizen "${recipientName}" not found in this world` }, { status: 404 })
        }

        // 3. Execute Transaction (Atomic)
        await prisma.$transaction(async (tx) => {
            // Deduct from Treasury
            await tx.treasury.update({
                where: { worldId: worldId },
                data: {
                    balance: { decrement: amount },
                    totalSubsidies: { increment: amount }
                }
            })

            // Add to Citizen Wallet
            await tx.citizen.update({
                where: { id: citizen.id },
                data: {
                    walletBalance: { increment: amount }
                }
            })

            // Record Transaction
            await tx.transaction.create({
                data: {
                    amount: amount,
                    type: "TREASURY_SUBSIDY",
                    description: description || "Subsidy from World Treasury",
                    status: "COMPLETED",
                    worldId: worldId,
                    receiverCitizenId: citizen.id,
                    // No senderCitizenId for treasury transactions in this schema, 
                    // or we could use owner as sender but it triggers "senderCitizen" relation?
                    // The schema has "senderCitizenId" etc.
                    // For Treasury transactions, usually sender is null implies system/treasury?
                    // The schema has specific EntityType in Intent but Transaction model links to Citizen/Business.
                    // Let's leave sender null for Treasury.
                }
            })
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error issuing subsidy:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
