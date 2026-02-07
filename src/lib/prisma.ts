import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization - only create client when actually accessed
// This avoids build-time errors when DATABASE_URL is missing
let _prisma: PrismaClient

function getPrismaClient() {
  if (!_prisma) {
    if (globalForPrisma.prisma) {
      _prisma = globalForPrisma.prisma
    } else {
      // Standard initialization handles Supabase connection strings correctly (including SSL)
      const client = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })

      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = client
      }
      _prisma = client
    }
  }
  return _prisma
}

// Export a robust Proxy that initializes on first access
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient()
    // Type assertion to access properties dynamically
    return (client as any)[prop]
  }
})

export default prisma
