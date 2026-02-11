import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';
const BOT_API_KEY = process.env.BOT_API_KEY || 'test-api-key';

async function testMemberSync() {
    console.log('👥 Testing Bot Members Sync Endpoint...\n');

    // 1. Test missing fields
    console.log('📋 Test 1: Missing discordServerId...');
    const res1 = await fetch(`${BASE_URL}/api/bot/members/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-API-Key': BOT_API_KEY,
        },
        body: JSON.stringify({ members: [] }),
    });
    const data1 = await res1.json();
    console.log(`   Status: ${res1.status} — ${data1.error || 'OK'}`);
    console.log(`   ${res1.status === 400 ? '✅ Correctly rejected' : '❌ Should have been 400'}\n`);

    // 2. Test empty members array
    console.log('📋 Test 2: Empty members array...');
    const res2 = await fetch(`${BASE_URL}/api/bot/members/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-API-Key': BOT_API_KEY,
        },
        body: JSON.stringify({
            discordServerId: 'test-server-123',
            members: [],
        }),
    });
    const data2 = await res2.json();
    console.log(`   Status: ${res2.status} — ${data2.error || 'OK'}`);
    console.log(`   ${res2.status === 400 ? '✅ Correctly rejected' : '❌ Should have been 400'}\n`);

    // 3. Test invalid server ID
    console.log('📋 Test 3: Non-existent server...');
    const res3 = await fetch(`${BASE_URL}/api/bot/members/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-API-Key': BOT_API_KEY,
        },
        body: JSON.stringify({
            discordServerId: 'does-not-exist-999',
            members: [{ discordId: '111', username: 'TestUser' }],
        }),
    });
    const data3 = await res3.json();
    console.log(`   Status: ${res3.status} — ${data3.error || 'OK'}`);
    console.log(`   ${res3.status === 404 ? '✅ Correctly rejected' : '❌ Should have been 404'}\n`);

    // 4. Test successful sync with a real server
    // First, we need to find a real world
    console.log('📋 Test 4: Syncing members to a real world...');

    // Use the PrismaClient to find a real world
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const world = await prisma.world.findFirst({
        select: { discordServerId: true, name: true, id: true },
    });

    if (!world || !world.discordServerId) {
        console.log('   ⚠️ No world found in DB, skipping sync test.');
        await prisma.$disconnect();
        return;
    }

    console.log(`   Using world: "${world.name}" (server: ${world.discordServerId})`);

    const testMembers = [
        { discordId: 'test-member-001', username: 'AliceTest' },
        { discordId: 'test-member-002', username: 'BobTest' },
        { discordId: 'test-member-003', username: 'CharlieTest' },
    ];

    const res4 = await fetch(`${BASE_URL}/api/bot/members/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-API-Key': BOT_API_KEY,
        },
        body: JSON.stringify({
            discordServerId: world.discordServerId,
            members: testMembers,
        }),
    });

    const data4 = await res4.json();
    console.log(`   Status: ${res4.status}`);
    console.log(`   Message: ${data4.message}`);
    console.log(`   Summary:`, JSON.stringify(data4.data?.summary, null, 2));

    if (data4.success && data4.data.summary.created === 3) {
        console.log('   ✅ All 3 members created!\n');
    } else if (data4.success) {
        console.log('   ✅ Sync completed (some may have already existed)\n');
    } else {
        console.log('   ❌ Sync failed\n');
    }

    // 5. Test idempotency — run the same sync again
    console.log('📋 Test 5: Idempotency — syncing same members again...');
    const res5 = await fetch(`${BASE_URL}/api/bot/members/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-API-Key': BOT_API_KEY,
        },
        body: JSON.stringify({
            discordServerId: world.discordServerId,
            members: testMembers,
        }),
    });

    const data5 = await res5.json();
    console.log(`   Status: ${res5.status}`);
    console.log(`   Summary:`, JSON.stringify(data5.data?.summary, null, 2));

    if (data5.success && data5.data.summary.skipped === 3 && data5.data.summary.created === 0) {
        console.log('   ✅ Idempotent! All 3 correctly skipped.\n');
    } else {
        console.log('   ❌ Idempotency issue\n');
    }

    // Cleanup: Remove test users and citizens
    console.log('🧹 Cleaning up test data...');
    for (const m of testMembers) {
        const user = await prisma.user.findUnique({ where: { discordId: m.discordId } });
        if (user) {
            await prisma.survivalNeeds.deleteMany({ where: { citizen: { userId: user.id } } });
            await prisma.citizen.deleteMany({ where: { userId: user.id } });
            await prisma.user.delete({ where: { id: user.id } });
        }
    }
    console.log('   ✅ Cleaned up.\n');

    await prisma.$disconnect();
    console.log('✅ All tests completed!');
}

testMemberSync().catch(console.error);
