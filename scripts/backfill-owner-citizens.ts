import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfillOwnerCitizens() {
    console.log('🔍 Checking for worlds missing owner citizenship...');

    const worlds = await prisma.world.findMany({
        include: {
            owner: true,
            citizens: {
                select: { userId: true }
            }
        }
    });

    let fixed = 0;

    for (const world of worlds) {
        const ownerIsCitizen = world.citizens.some(c => c.userId === world.ownerId);

        if (!ownerIsCitizen) {
            console.log(`⚠️ World "${world.name}" (${world.id}): Owner ${world.owner.name} is NOT a citizen. Fixing...`);

            await prisma.citizen.create({
                data: {
                    userId: world.ownerId,
                    worldId: world.id,
                    displayName: world.owner.name || 'World Owner',
                    walletBalance: world.initialCitizenBalance,
                    isActive: true
                }
            });

            fixed++;
            console.log(`✅ Added ${world.owner.name} as citizen of "${world.name}" with balance ${world.initialCitizenBalance}`);
        } else {
            console.log(`✅ World "${world.name}": Owner is already a citizen.`);
        }
    }

    console.log(`\n🎉 Done! Fixed ${fixed} world(s).`);
    await prisma.$disconnect();
}

backfillOwnerCitizens().catch(console.error);
