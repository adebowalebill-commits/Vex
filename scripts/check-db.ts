import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, discordId: true }
    });
    console.log('=== USERS ===');
    console.log(JSON.stringify(users, null, 2));

    const worlds = await prisma.world.findMany({
        select: { id: true, name: true, ownerId: true, discordServerId: true }
    });
    console.log('\n=== WORLDS ===');
    console.log(JSON.stringify(worlds, null, 2));

    const citizens = await prisma.citizen.findMany({
        select: { id: true, displayName: true, userId: true, worldId: true, walletBalance: true, isActive: true }
    });
    console.log('\n=== CITIZENS ===');
    console.log(JSON.stringify(citizens, null, 2));

    // Cross reference: which users have citizenships?
    for (const u of users) {
        const count = citizens.filter(c => c.userId === u.id).length;
        console.log(`\nUser "${u.name}" (${u.id}): ${count} citizenships`);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
