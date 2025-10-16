#!/usr/bin/env ts-node
/**
 * Test manual close with EXACT same parameters as opening order
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
    console.error('❌ API_PRIVATE_KEY required');
    process.exit(1);
  }

  const apiClient = new ApiClient({ host: BASE_URL });
  const accountApi = new AccountApi(apiClient);
  const orderApi = new OrderApi(apiClient);

  const client = new SignerClient({
    url: BASE_URL,
    privateKey: API_KEY_PRIVATE_KEY,
    accountIndex: ACCOUNT_INDEX,
    apiKeyIndex: API_KEY_INDEX
  });

  await client.initialize();
  await (client as any).ensureWasmClient();

  console.log('\n🔍 Fetching position...\n');

  const accountData = await accountApi.getAccount({ by: 'index', value: ACCOUNT_INDEX_STR });
  const account = (accountData as any).accounts?.[0] || accountData;
  const positions = (account.positions || []).filter((p: any) => parseFloat(p.position) !== 0);

  if (positions.length === 0) {
    console.log('✅ No positions\n');
    await client.close();
    await apiClient.close();
    return;
  }

  const position = positions[0];
  console.log(`Position: ${position.symbol}`);
  console.log(`  Size: ${position.position}`);
  console.log(`  Entry: $${position.avg_entry_price}`);
  console.log(`  Sign: ${position.sign} (${position.sign > 0 ? 'LONG' : 'SHORT'})`);
  console.log();

  // Get current market price
  const details = await orderApi.getOrderBookDetails({ market_id: position.market_id, depth: 1 }) as any;
  const currentPrice = parseFloat(details.order_book_details[0].last_trade_price);
  const avgExecutionPriceUnits = Math.floor(currentPrice * 100000);

  console.log(`Current market price: $${currentPrice}`);
  console.log(`Price in units: ${avgExecutionPriceUnits}`);
  console.log();

  // Calculate baseAmount - position is in BTC decimals (e.g., 0.00055)
  const positionSize = Math.abs(parseFloat(position.position));
  const baseAmount = Math.floor(positionSize * 100000);

  console.log(`Position size: ${positionSize}`);
  console.log(`Base amount: ${baseAmount} units`);
  console.log();

  // Close with SELL order (opposite of the LONG position)
  const isLong = position.sign > 0;
  
  console.log(`Creating ${isLong ? 'SELL' : 'BUY'} market order to close ${isLong ? 'LONG' : 'SHORT'}...`);
  console.log(`  baseAmount: ${baseAmount}`);
  console.log(`  avgExecutionPrice: ${avgExecutionPriceUnits}`);
  console.log(`  isAsk: ${isLong}`);
  console.log(`  reduceOnly: true`);
  console.log();

  const [, closeHash, closeError] = await client.createMarketOrder({
    marketIndex: position.market_id,
    clientOrderIndex: Date.now(),
    baseAmount: baseAmount,
    avgExecutionPrice: avgExecutionPriceUnits,
    isAsk: isLong,
    reduceOnly: true
  });

  if (closeError) {
    console.error(`❌ Error: ${closeError}\n`);
  } else {
    console.log(`✅ Close order sent: ${closeHash}\n`);
    
    try {
      const confirmedTx = await client.waitForTransaction(closeHash, 30000, 1000);
      console.log(`✅ Confirmed! Block: ${confirmedTx.block_height}\n`);
    } catch {
      console.log(`⏳ Pending...\n`);
    }
  }

  await client.close();
  await apiClient.close();
}

if (require.main === module) {
  main().catch(console.error);
}

