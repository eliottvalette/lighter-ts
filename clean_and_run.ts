#!/usr/bin/env ts-node
/**
 * Clean script: Cancel all orders before running the main script
 */

import { SignerClient } from './src/signer/wasm-signer-client';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env['BASE_URL'] || 'https://mainnet.zklighter.elliot.ai';
const API_KEY_PRIVATE_KEY = process.env['API_PRIVATE_KEY'];
const ACCOUNT_INDEX = parseInt(process.env['ACCOUNT_INDEX'] || '0', 10);
const API_KEY_INDEX = parseInt(process.env['API_KEY_INDEX'] || '0', 10);

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (!API_KEY_PRIVATE_KEY) {
    console.error('❌ API_PRIVATE_KEY required');
    process.exit(1);
  }

  const client = new SignerClient({
    url: BASE_URL,
    privateKey: API_KEY_PRIVATE_KEY,
    accountIndex: ACCOUNT_INDEX,
    apiKeyIndex: API_KEY_INDEX
  });

  await client.initialize();
  await (client as any).ensureWasmClient();

  console.log('\n🧹 CLEANING: Cancel all pending orders\n');

  const [, , cancelError] = await client.cancelAllOrders(
    SignerClient.CANCEL_ALL_TIF_IMMEDIATE,
    0
  );

  if (cancelError) {
    console.log(`⚠️  Cancel orders error: ${cancelError}`);
  } else {
    console.log('✅ All pending orders cancelled');
  }

  await sleep(2000);

  console.log('\n🔒 CLOSING: Close all positions\n');

  const [closedTransactions, , errors] = await client.closeAllPositions();

  console.log(`Positions closed: ${closedTransactions.length}`);
  console.log(`Errors: ${errors.length}\n`);

  if (errors.length > 0) {
    console.log('❌ Errors:');
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (closedTransactions.length > 0) {
    console.log('✅ Closed:');
    closedTransactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. Market ${tx.MarketIndex}: ${tx.IsAsk ? 'Sell' : 'Buy'} ${tx.BaseAmount} units`);
    });
  }

  if (closedTransactions.length === 0 && errors.length === 0) {
    console.log('ℹ️  No open positions');
  }

  await client.close();
  console.log('\n✅ Cleanup complete!\n');
}

if (require.main === module) {
  main().catch(console.error);
}

