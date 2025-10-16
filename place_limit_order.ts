#!/usr/bin/env ts-node
/**
 * Place a limit order
 * Usage: npx ts-node place_limit_order.ts <market_index> <side> <size> <price>
 * Example: npx ts-node place_limit_order.ts 0 buy 100 0.22
 */

import { SignerClient } from './src/signer/wasm-signer-client';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env['BASE_URL'] || 'https://mainnet.zklighter.elliot.ai';
const API_KEY_PRIVATE_KEY = process.env['API_PRIVATE_KEY'];
const ACCOUNT_INDEX = parseInt(process.env['ACCOUNT_INDEX'] || '0', 10);
const API_KEY_INDEX = parseInt(process.env['API_KEY_INDEX'] || '0', 10);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.error('Usage: npx ts-node place_limit_order.ts <market_index> <side> <size> <price>');
    console.error('Example: npx ts-node place_limit_order.ts 2 buy 100 185');
    console.error('');
    console.error('Arguments:');
    console.error('  market_index: Market index (0=ETH, 1=BTC, 2=SOL, etc.)');
    console.error('  side: buy or sell');
    console.error('  size: Order size in base units');
    console.error('  price: Limit price in USD');
    console.error('');
    console.error('Common markets:');
    console.error('  0 - ETH/USDC');
    console.error('  1 - BTC/USDC');
    console.error('  2 - SOL/USDC');
    process.exit(1);
  }

  if (!API_KEY_PRIVATE_KEY) {
    console.error('API_PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  const marketIndexArg = args[0];
  const sideArg = args[1];
  const baseAmountArg = args[2];
  const priceUsdArg = args[3];

  if (!marketIndexArg || !sideArg || !baseAmountArg || !priceUsdArg) {
    console.error('All arguments are required');
    process.exit(1);
  }

  const marketIndex = parseInt(marketIndexArg, 10);
  const side = sideArg.toLowerCase();
  const baseAmount = parseInt(baseAmountArg, 10);
  const priceUsd = parseFloat(priceUsdArg);

  if (side !== 'buy' && side !== 'sell') {
    console.error('Side must be "buy" or "sell"');
    process.exit(1);
  }

  const isAsk = side === 'sell';
  const price = Math.floor(priceUsd * 100000); // Convert to price units

  console.log('\n📊 Placing Limit Order:');
  console.log(`   Market: ${marketIndex}`);
  console.log(`   Side: ${side.toUpperCase()}`);
  console.log(`   Size: ${baseAmount} units`);
  console.log(`   Price: $${priceUsd} (${price} units)`);

  const client = new SignerClient({
    url: BASE_URL,
    privateKey: API_KEY_PRIVATE_KEY,
    accountIndex: ACCOUNT_INDEX,
    apiKeyIndex: API_KEY_INDEX
  });

  await client.initialize();
  await (client as any).ensureWasmClient();

  const err = client.checkClient();
  if (err) {
    console.error('Client error:', err);
    process.exit(1);
  }

  const oneHourFromNow = Date.now() + (60 * 60 * 1000);

  const [tx, txHash, error] = await client.createOrder({
    marketIndex,
    clientOrderIndex: Date.now(),
    baseAmount,
    price,
    isAsk,
    orderType: SignerClient.ORDER_TYPE_LIMIT,
    timeInForce: SignerClient.ORDER_TIME_IN_FORCE_GOOD_TILL_TIME,
    reduceOnly: false,
    triggerPrice: 0,
    orderExpiry: oneHourFromNow,
  });

  if (error) {
    console.error('\n❌ Order failed:', error);
    process.exit(1);
  }

  console.log('\n✅ Order placed successfully!');
  console.log(`   TX Hash: ${txHash}`);
  console.log(`   Client Order Index: ${tx.ClientOrderIndex}`);

  if (txHash) {
    console.log('\n⏳ Waiting for confirmation...');
    try {
      const confirmedTx = await client.waitForTransaction(txHash, 30000, 1000);
      console.log('✅ Order confirmed!');
      console.log(`   Block: ${confirmedTx.block_height}`);
      console.log(`   Status: ${confirmedTx.status}`);
    } catch (waitError) {
      console.log('⚠️  Confirmation timeout (order may still be processing)');
    }
  }

  await client.close();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

