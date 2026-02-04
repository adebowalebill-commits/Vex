import { User, World, Citizen, Business, Region, Transaction } from '@prisma/client'

// Extend NextAuth types
declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            name?: string | null
            email?: string | null
            image?: string | null
        }
    }
}

// API Response types
export interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

// Dashboard stat card
export interface StatCardData {
    label: string
    value: string | number
    change?: number
    changeLabel?: string
    icon?: string
    trend?: 'up' | 'down' | 'neutral'
}

// World with owner
export interface WorldWithOwner extends World {
    owner: Pick<User, 'id' | 'name' | 'image'>
    _count?: {
        citizens: number
        businesses: number
        regions: number
    }
}

// Citizen with relations
export interface CitizenWithRelations extends Citizen {
    user: Pick<User, 'id' | 'name' | 'image' | 'discordId'>
    world: Pick<World, 'id' | 'name' | 'currencySymbol'>
    survivalNeeds?: {
        food: number
        water: number
        sleep: number
        lastDecayAt: Date
    }
    ownedBusinesses?: Pick<Business, 'id' | 'name' | 'type'>[]
}

// Business with relations
export interface BusinessWithRelations extends Business {
    owner: Pick<Citizen, 'id' | 'displayName'>
    region: Pick<Region, 'id' | 'name'>
    employees?: {
        citizen: Pick<Citizen, 'id' | 'displayName'>
        position: string
        hourlyWage: number
    }[]
    _count?: {
        employees: number
        inventory: number
    }
}

// Transaction with relations
export interface TransactionWithRelations extends Transaction {
    senderCitizen?: Pick<Citizen, 'id' | 'displayName'>
    senderBusiness?: Pick<Business, 'id' | 'name'>
    receiverCitizen?: Pick<Citizen, 'id' | 'displayName'>
    receiverBusiness?: Pick<Business, 'id' | 'name'>
}

// Dashboard data types
export interface EconomyDashboardData {
    totalMoneySupply: number
    totalCitizens: number
    totalBusinesses: number
    treasuryBalance: number
    taxRevenue24h: number
    activeTransactions24h: number
    resourceUtilization: {
        resourceName: string
        totalCapacity: number
        remaining: number
        extractionRate: number
    }[]
    recentTransactions: TransactionWithRelations[]
}

export interface RegionDashboardData {
    region: Region
    output: number
    extractionRate: number
    businessCount: number
    citizenCount: number
    treasuryBalance: number
    topBusinesses: Pick<Business, 'id' | 'name' | 'type' | 'walletBalance'>[]
}

export interface BusinessDashboardData {
    business: BusinessWithRelations
    inventory: {
        resourceName: string
        quantity: number
        value: number
    }[]
    revenue7d: number
    expenses7d: number
    profit7d: number
    payrollDue: number
    recentTransactions: TransactionWithRelations[]
}

export interface CitizenDashboardData {
    citizen: CitizenWithRelations
    totalBalance: number
    income7d: number
    spending7d: number
    recentTransactions: TransactionWithRelations[]
}

// Form types
export interface CreateWorldInput {
    name: string
    description?: string
    discordServerId: string
    currencyName?: string
    currencySymbol?: string
    salesTaxRate?: number
    incomeTaxRate?: number
    propertyTaxRate?: number
    initialCitizenBalance?: number
}

export interface CreateBusinessInput {
    name: string
    description?: string
    type: string
    regionId: string
}

export interface CreateRegionInput {
    name: string
    description?: string
    worldId: string
    permitPrice?: number
    landPrice?: number
}
