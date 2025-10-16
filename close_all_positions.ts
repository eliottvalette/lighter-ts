#!/usr/bin/env ts-node
/**
 * Close all open positions
 * Usage: npx ts-node close_all_positions.ts
 */

import { SignerClient } from './src/signer/wasm-signer-client';
import { AccountApi } from './src/api/account-api';
import { ApiClient } from './src/api/api-client';
import { OrderApi } from './src/api/order-api';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env['BASE_URL'] || 'https://mainnet.zklighter.elliot.ai';
const API_KEY_PRIVATE_KEY = process.env['API_PRIVATE_KEY'];
const ACCOUNT_INDEX_STR = process.env['ACCOUNT_INDEX'] || '0';
const ACCOUNT_INDEX = parseInt(ACCOUNT_INDEX_STR, 10);
const API_KEY_INDEX = parseInt(process.env['API_KEY_INDEX'] || '0', 10);

async function main(): Promise<void> {
  if (!API_KEY_PRIVATE_KEY) {
    console.error('API_PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  console.log('\n🔍 Checking for open positions...\n');

  const apiClient = new ApiClient({ host: BASE_URL });
  const accountApi = new AccountApi(apiClient);
  const orderApi = new OrderApi(apiClient);

  // Get account positions
  const accountData = await accountApi.getAccount({ by: 'index', value: ACCOUNT_INDEX_STR });
  const account = (accountData as any).accounts?.[0] || accountData;
  const positions = account.positions || [];

  if (positions.length === 0) {
    console.log('✅ No open positions to close\n');
    await apiClient.close();
    return;
  }

  console.log(`Found ${positions.length} open position(s):\n`);

  // Initialize signer client
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
    await apiClient.close();
    process.exit(1);
  }

  // Close each position
  for (const position of positions) {
    const marketIndex = position.market_index;
    const baseAmount = Math.abs(parseInt(position.base_amount, 10));
    const isLong = parseInt(position.base_amount, 10) > 0;
    
    const marketName = `Market ${marketIndex}`;

    // Get current mid price
    let midPrice = 100000; // Default fallback
    try {
      const details = await orderApi.getOrderBookDetails({ market_id: marketIndex, depth: 1 }) as any;
      if (details.order_book_details && details.order_book_details.length > 0) {
        const marketInfo = details.order_book_details[0];
        if (marketInfo.last_trade_price) {
          midPrice = Math.floor(parseFloat(marketInfo.last_trade_price) * 100000);
        }
      }
    } catch (error) {
      // Use default if orderbook fetch fails
    }

    console.log(`📊 ${marketName}:`);
    console.log(`   Position: ${isLong ? 'LONG' : 'SHORT'} ${baseAmount} units`);
    console.log(`   Closing at market price...`);

    // Create market order to close position
    const [tx, txHash, error] = await client.createMarketOrder({
      marketIndex,
      clientOrderIndex: Date.now(),
      baseAmount,
      avgExecutionPrice: midPrice || 100000, // Fallback if no orderbook
      isAsk: isLong, // If long, we sell (ask) to close
      reduceOnly: true
    });

    if (error) {
      console.log(`   ❌ Failed to close: ${error}\n`);
      continue;
    }

    console.log(`   ✅ Close order sent: ${txHash}`);

    // Wait for confirmation
    if (txHash) {
      try {
        const confirmedTx = await client.waitForTransaction(txHash, 10000, 500);
        console.log(`   ✅ Position closed (Block: ${confirmedTx.block_height})\n`);
      } catch {
        console.log(`   ⏳ Confirmation pending...\n`);
      }
    }
  }

  console.log('✅ All positions processed\n');

  await client.close();
  await apiClient.close();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

