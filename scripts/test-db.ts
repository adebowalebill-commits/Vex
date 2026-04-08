
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Testing database connection...')

    try {
        // Try to connect
        await prisma.$connect()
        console.log('✅ Connected to database successfully')

        // Try a simple query
        const userCount = await prisma.user.count()
        console.log(`✅ Database query successful. User count: ${userCount}`)

        // Check world count
        const worldCount = await prisma.world.count()
        console.log(`✅ World count: ${worldCount}`)

    } catch (error) {
        console.error('❌ Database connection failed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
