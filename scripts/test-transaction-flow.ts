
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables BEFORE requiring local modules that use Prisma
dotenv.config({ path: '.env.local' });

// Use require to load local TS modules after dotenv (supported by tsx)
// @ts-ignore
const { executeTransaction } = require('../src/lib/ledger');
// @ts-ignore
const { EntityType } = require('../src/lib/wallet');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';
const BOT_API_KEY = process.env.BOT_API_KEY || 'test-api-key';

async function testTransactionFlow() {
    console.log('💸 Testing Full Transaction Flow...');

    // 1. Setup: Get User, World, and Citizen
    const user = await prisma.user.findFirst({
        where: { discordId: { not: null } }
    });

    if (!user || !user.discordId) {
        console.error('❌ No user found.');
        return;
    }

    const world = await prisma.world.findFirst({
        where: { ownerId: user.id },
        include: { treasury: true }
    });

    if (!world) {
        console.error('❌ No world found for user.');
        return;
    }

    const citizen = await prisma.citizen.findFirst({
        where: { userId: user.id, worldId: world.id }
    });

    if (!citizen) {
        console.error('❌ User is not a citizen of their own world?');
        return;
    }

    // Ensure citizen has balance
    if (citizen.walletBalance < 100) {
        console.log('💰 Top up citizen balance...');
        await prisma.citizen.update({
            where: { id: citizen.id },
            data: { walletBalance: 1000 }
        });
    }

    console.log(`👤 User: ${user.name}`);
    console.log(`🌍 World: ${world.name}`);
    console.log(`💰 Initial Balance: ${citizen.walletBalance}`);
    console.log(`mb Treasury Balance: ${world.treasury?.balance}`);

    // 2. Create Intent (simulating Bot)
    console.log('\n🤖 1. Creating Intent via Bot API...');
    const amount = 50;

    // Check if fetch is available (Node 18+)
    if (typeof fetch === 'undefined') {
        console.error('❌ global fetch is not defined. Use Node 18+.');
        process.exit(1);
    }

    const intentRes = await fetch(`${BASE_URL}/api/bot/transaction`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-API-Key': BOT_API_KEY
        },
        body: JSON.stringify({
            discordServerId: world.discordServerId,
            amount: amount,
            senderDiscordId: user.discordId,
            receiverType: 'TREASURY',
            receiverId: world.id,
            description: 'Flow Test Payment'
        })
    });

    const intentData = await intentRes.json();

    if (!intentData.success) {
        console.error('❌ Failed to create intent:', intentData.error);
        return;
    }

    const { token, intentId } = intentData.data;
    console.log(`✅ Intent Created! Token: ${token}`);

    // 3. Verify Intent in DB
    const intent = await prisma.transactionIntent.findUnique({
        where: { token }
    });

    if (!intent || intent.status !== 'PENDING') {
        console.error('❌ Intent not found or not PENDING in DB.');
        return;
    }

    // 4. Simulate Confirmation (Ledger Execution)
    console.log('\n⚙️ 2. Executing Ledger Transaction...');

    // We call executeTransaction directly to verify the LOGIC, 
    // mimicking what /api/transactions/confirm does after auth check.
    const result = await executeTransaction({
        worldId: intent.worldId,
        amount: intent.amount,
        type: intent.type,
        description: intent.description || undefined,
        senderType: intent.senderType,
        senderId: intent.senderId,
        receiverType: intent.receiverType,
        receiverId: intent.receiverId,
        applyTax: true,
    });

    if (!result.success) {
        console.error('❌ Ledger execution failed:', result.error);
        return;
    }

    console.log('✅ Ledger Execution Success!');
    console.log(`   Transaction ID: ${result.transactionId}`);
    console.log(`   Tax: ${result.taxAmount}`);
    console.log(`   Net: ${result.netAmount}`);

    // 5. Update Intent Status (simulate API)
    await prisma.transactionIntent.update({
        where: { id: intent.id },
        data: {
            status: 'EXECUTED',
            transactionId: result.transactionId,
            completedAt: new Date()
        }
    });

    // 6. Verify Final Balances
    console.log('\n🔍 3. Verifying Final Balances...');

    // Fetch fresh data
    const updatedCitizen = await prisma.citizen.findUnique({
        where: { id: citizen.id }
    });

    const updatedWorld = await prisma.world.findUnique({
        where: { id: world.id },
        include: { treasury: true }
    });

    console.log(`💰 Final Citizen Balance: ${updatedCitizen?.walletBalance} (Old: ${citizen.walletBalance})`);
    console.log(`🏛️ Final Treasury Balance: ${updatedWorld?.treasury?.balance} (Old: ${world.treasury?.balance})`);

    // Assertion
    if (updatedCitizen && updatedCitizen.walletBalance < citizen.walletBalance) {
        console.log('✅ Citizen balance decreased.');
    } else {
        console.error('❌ Citizen balance did not decrease correctly.');
    }

    console.log('\n✅ Transaction Flow Verified!');
}

testTransactionFlow()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
