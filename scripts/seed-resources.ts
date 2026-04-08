/**
 * Seed Resources & Production Chains
 * Seeds the default resources and defines production chain mappings
 * for each business type.
 *
 * Usage: npx tsx scripts/seed-resources.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient, ResourceCategory, BusinessType } from '@prisma/client'
const prisma = new PrismaClient()

// ============================================
// RESOURCE DEFINITIONS
// ============================================

const RESOURCES = [
    // Raw Materials
    { name: 'Oil', category: ResourceCategory.RAW_MATERIAL, baseValue: 15 },
    { name: 'Wood', category: ResourceCategory.RAW_MATERIAL, baseValue: 8 },
    { name: 'Metal', category: ResourceCategory.RAW_MATERIAL, baseValue: 20 },
    { name: 'Gold', category: ResourceCategory.RAW_MATERIAL, baseValue: 50 },
    { name: 'Crops', category: ResourceCategory.RAW_MATERIAL, baseValue: 5 },
    { name: 'Raw Water', category: ResourceCategory.RAW_MATERIAL, baseValue: 3 },

    // Processed
    { name: 'Fuel', category: ResourceCategory.PROCESSED, baseValue: 30 },
    { name: 'Lumber', category: ResourceCategory.PROCESSED, baseValue: 18 },
    { name: 'Steel', category: ResourceCategory.PROCESSED, baseValue: 40 },
    { name: 'Clean Water', category: ResourceCategory.CONSUMABLE, baseValue: 8 },
    { name: 'Food', category: ResourceCategory.CONSUMABLE, baseValue: 12 },

    // Manufactured
    { name: 'Machinery', category: ResourceCategory.MANUFACTURED, baseValue: 80 },
    { name: 'Vehicles', category: ResourceCategory.MANUFACTURED, baseValue: 120 },

    // Services
    { name: 'Transport', category: ResourceCategory.SERVICE, baseValue: 25 },
]

// ============================================
// PRODUCTION CHAIN DEFINITIONS
// Maps BusinessType → { inputs, outputs }
// ============================================

interface ChainDef {
    inputs: { resource: string; quantity: number }[]
    outputs: { resource: string; quantity: number }[]
    operatingCost: number
}

const PRODUCTION_CHAINS: Record<string, ChainDef> = {
    // Extraction (no inputs, pull from deposits)
    [BusinessType.OIL_DRILLING]: {
        inputs: [],
        outputs: [],  // Outputs come from ResourceDeposit extraction
        operatingCost: 50,
    },
    [BusinessType.MINING]: {
        inputs: [],
        outputs: [],
        operatingCost: 60,
    },
    [BusinessType.LOGGING]: {
        inputs: [],
        outputs: [],
        operatingCost: 30,
    },

    // Processing
    [BusinessType.OIL_REFINERY]: {
        inputs: [{ resource: 'Oil', quantity: 10 }],
        outputs: [{ resource: 'Fuel', quantity: 8 }],
        operatingCost: 40,
    },
    [BusinessType.STEEL_MILL]: {
        inputs: [{ resource: 'Metal', quantity: 10 }],
        outputs: [{ resource: 'Steel', quantity: 6 }],
        operatingCost: 55,
    },
    [BusinessType.FOOD_PROCESSING]: {
        inputs: [{ resource: 'Crops', quantity: 15 }],
        outputs: [{ resource: 'Food', quantity: 10 }],
        operatingCost: 25,
    },
    [BusinessType.WATER_PURIFICATION]: {
        inputs: [{ resource: 'Raw Water', quantity: 20 }],
        outputs: [{ resource: 'Clean Water', quantity: 15 }],
        operatingCost: 20,
    },

    // Manufacturing
    [BusinessType.MACHINERY_MANUFACTURING]: {
        inputs: [
            { resource: 'Steel', quantity: 5 },
            { resource: 'Fuel', quantity: 2 },
        ],
        outputs: [{ resource: 'Machinery', quantity: 2 }],
        operatingCost: 70,
    },

    // Retail & Logistics
    [BusinessType.FARM]: {
        inputs: [{ resource: 'Clean Water', quantity: 5 }],
        outputs: [{ resource: 'Crops', quantity: 15 }],
        operatingCost: 15,
    },
    [BusinessType.GROCERY_STORE]: {
        inputs: [{ resource: 'Food', quantity: 10 }],
        outputs: [],  // Sells directly to citizens
        operatingCost: 20,
    },
    [BusinessType.TRUCKING_COMPANY]: {
        inputs: [{ resource: 'Fuel', quantity: 5 }],
        outputs: [{ resource: 'Transport', quantity: 10 }],
        operatingCost: 35,
    },
    [BusinessType.VEHICLE_DEALERSHIP]: {
        inputs: [{ resource: 'Vehicles', quantity: 1 }],
        outputs: [],  // Sells directly
        operatingCost: 30,
    },
    [BusinessType.GAS_STATION]: {
        inputs: [{ resource: 'Fuel', quantity: 20 }],
        outputs: [],  // Sells directly
        operatingCost: 15,
    },

    // Infrastructure
    [BusinessType.BUSINESS_CONSTRUCTION]: {
        inputs: [
            { resource: 'Lumber', quantity: 10 },
            { resource: 'Steel', quantity: 5 },
        ],
        outputs: [],  // Builds businesses
        operatingCost: 80,
    },
    [BusinessType.REAL_ESTATE_CONSTRUCTION]: {
        inputs: [
            { resource: 'Lumber', quantity: 15 },
            { resource: 'Steel', quantity: 8 },
        ],
        outputs: [],  // Builds housing
        operatingCost: 90,
    },
}

// ============================================
// SEED FUNCTION
// ============================================

async function seedResources() {
    console.log('🌱 Seeding resources...\n')

    for (const res of RESOURCES) {
        const existing = await prisma.resource.findUnique({
            where: { name: res.name },
        })

        if (existing) {
            console.log(`  ✓ ${res.name} already exists`)
            continue
        }

        await prisma.resource.create({
            data: {
                name: res.name,
                category: res.category,
                baseValue: res.baseValue,
                description: `${res.category} resource`,
            },
        })
        console.log(`  + Created ${res.name} (${res.category}, base value: ${res.baseValue})`)
    }

    console.log('\n✅ Resources seeded!')
    console.log('\n📋 Production chain definitions (reference):')
    console.log('─'.repeat(60))

    for (const [bizType, chain] of Object.entries(PRODUCTION_CHAINS)) {
        const inputs = chain.inputs.length
            ? chain.inputs.map(i => `${i.quantity}x ${i.resource}`).join(' + ')
            : '(extraction from deposits)'
        const outputs = chain.outputs.length
            ? chain.outputs.map(o => `${o.quantity}x ${o.resource}`).join(' + ')
            : '(direct sale / service)'

        console.log(`  ${bizType}:`)
        console.log(`    Inputs:  ${inputs}`)
        console.log(`    Outputs: ${outputs}`)
        console.log(`    OpCost:  ${chain.operatingCost}/cycle`)
    }

    await prisma.$disconnect()
}

seedResources().catch(console.error)

// Export for use by production engine
export { PRODUCTION_CHAINS }
