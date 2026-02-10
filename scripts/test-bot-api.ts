
import dotenv from 'dotenv';
// import fetch from 'node-fetch'; // rely on global fetch
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';
const BOT_API_KEY = process.env.BOT_API_KEY || 'test-api-key';

async function testBotApi() {
    console.log('🤖 Testing Bot API...');

    // Get a valid user to be the owner
    const user = await prisma.user.findFirst({
        where: { discordId: { not: null } }
    });

    if (!user || !user.discordId) {
        console.error('❌ No user with Discord ID found in database. Cannot run test.');
        return;
    }

    console.log(`👤 Using User: ${user.name} (${user.discordId})`);
    console.log(`Using API Key: ${BOT_API_KEY.substring(0, 4)}...`);

    // 1. Create/Update World
    console.log('\n🌎 Testing POST /api/bot/world...');
    const worldRes = await fetch(`${BASE_URL}/api/bot/world`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-API-Key': BOT_API_KEY
        },
        body: JSON.stringify({
            discordServerId: 'test-server-123',
            name: 'Test World',
            description: 'A world for API testing',
            ownerDiscordId: user.discordId,
            currencyName: 'Credits',
            currencySymbol: 'CR',
            salesTaxRate: 5
        })
    });

    const worldData = await worldRes.json();
    console.log('Status:', worldRes.status);
    // console.log('Response:', JSON.stringify(worldData, null, 2));

    if (!worldData.success) {
        console.error('❌ World creation failed:', worldData.error);
        return;
    }

    const worldId = worldData.data.id;
    console.log('✅ World ID:', worldId);

    // 2. Get World Info
    console.log('\n🔍 Testing GET /api/bot/world...');
    const getWorldRes = await fetch(`${BASE_URL}/api/bot/world?discordServerId=test-server-123&includeCitizens=true&includeStats=true`, {
        headers: { 'X-Bot-API-Key': BOT_API_KEY }
    });
    const getWorldData = await getWorldRes.json();
    console.log('Status:', getWorldRes.status);
    console.log('Citizens count:', getWorldData.data?.citizens?.length);
    console.log('Stats:', getWorldData.data?.stats);

    // 3. Create Transaction Intent
    console.log('\n💸 Testing POST /api/bot/transaction...');

    // We need a receiver. For test, we can try to send to SAME user, assert failure, 
    // OR create a dummy business if possible, OR if there's another user.
    // Let's try to send to a non-existent user and expect 404, validating the endpoint logic.

    const txRes = await fetch(`${BASE_URL}/api/bot/transaction`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-API-Key': BOT_API_KEY
        },
        body: JSON.stringify({
            discordServerId: 'test-server-123',
            amount: 10,
            senderDiscordId: user.discordId,
            receiverDiscordId: '999999999', // Non-existent
            description: 'Test payment'
        })
    });

    const txData = await txRes.json();
    console.log('Status:', txRes.status);

    if (txRes.status === 404 && txData.error?.includes('Receiver')) {
        console.log('✅ Correctly rejected invalid receiver.');
    } else {
        console.log('Response:', txData);
    }

    // 4. Create Transaction Intent (Valid - To Treasury)
    console.log('\n💸 Testing POST /api/bot/transaction (To Treasury)...');
    const treasuryTxRes = await fetch(`${BASE_URL}/api/bot/transaction`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-API-Key': BOT_API_KEY
        },
        body: JSON.stringify({
            discordServerId: 'test-server-123',
            amount: 5,
            senderDiscordId: user.discordId,
            receiverType: 'TREASURY',
            receiverId: worldId, // Using world ID as receiver ID for Treasury
            description: 'Test tax payment'
        })
    });

    const treasuryTxData = await treasuryTxRes.json();
    console.log('Status:', treasuryTxRes.status);
    // console.log('Response:', JSON.stringify(treasuryTxData, null, 2));

    if (treasuryTxData.success && treasuryTxData.data.confirmUrl) {
        console.log('✅ Successfully created transaction intent!');
        console.log('🔗 Confirm URL:', treasuryTxData.data.confirmUrl);
    } else {
        console.error('❌ Failed to create transaction:', treasuryTxData.error);
    }

    console.log('\n✅ Bot API Test Completed');
}

testBotApi()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
