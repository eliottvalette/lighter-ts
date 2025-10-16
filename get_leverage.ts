#!/usr/bin/env ts-node
/**
 * Get current leverage settings for all markets
 * Usage: npx ts-node get_leverage.ts [market_index]
 * Example: npx ts-node get_leverage.ts      (all markets)
 *          npx ts-node get_leverage.ts 0     (specific market)
 */

import { AccountApi } from './src/api/account-api';
import { ApiClient } from './src/api/api-client';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env['BASE_URL'] || 'https://mainnet.zklighter.elliot.ai';
const ACCOUNT_INDEX_STR = process.env['ACCOUNT_INDEX'] || '0';
const ACCOUNT_INDEX = parseInt(ACCOUNT_INDEX_STR, 10);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const specificMarket = args.length > 0 && args[0] ? parseInt(args[0], 10) : null;

  const apiClient = new ApiClient({ host: BASE_URL });
  const accountApi = new AccountApi(apiClient);

  console.log(`\n📊 Leverage Settings for Account ${ACCOUNT_INDEX}\n`);

  // Get account data
  const accountData = await accountApi.getAccount({ by: 'index', value: ACCOUNT_INDEX_STR });
  const account = (accountData as any).accounts?.[0] || accountData;

  // Get positions
  const positions = account.positions || [];

  console.log(`Total Collateral: ${account.collateral} USDC`);
  console.log(`Available Balance: ${account.available_balance} USDC`);
  console.log(`Total Asset Value: ${account.total_asset_value} USDC\n`);

  if (specificMarket !== null) {
    // Show specific market position
    const position = positions.find((p: any) => p.market_index === specificMarket);

    console.log(`Market ${specificMarket}:`);
    
    if (position) {
      const baseAmount = parseInt(position.base_amount, 10);
      const positionType = baseAmount > 0 ? 'LONG' : baseAmount < 0 ? 'SHORT' : 'NONE';
      console.log(`   Position: ${positionType} ${Math.abs(baseAmount)} units`);
      console.log(`   Entry Price: ${position.entry_price ? (parseFloat(position.entry_price) / 100000).toFixed(6) : 'N/A'}`);
      console.log(`   Liquidation Price: ${position.liquidation_price ? (parseFloat(position.liquidation_price) / 100000).toFixed(6) : 'N/A'}`);
      console.log(`   Margin Mode: ${position.margin_mode === 0 ? 'Cross' : 'Isolated'}`);
      console.log(`   Margin Fraction: ${position.margin_fraction || 'N/A'}`);
      
      if (position.margin_fraction) {
        const leverage = 1 / parseFloat(position.margin_fraction);
        console.log(`   Effective Leverage: ${leverage.toFixed(2)}x`);
      }
    } else {
      console.log(`   No open position`);
    }
    console.log();

  } else {
    // Show all positions
    console.log('Open Positions:\n');
    
    if (positions.length === 0) {
      console.log('  No open positions\n');
    } else {
      for (const position of positions) {
        const baseAmount = parseInt(position.base_amount, 10);
        const positionType = baseAmount > 0 ? 'LONG' : 'SHORT';
        
        console.log(`  Market ${position.market_index}:`);
        console.log(`    Position: ${positionType} ${Math.abs(baseAmount)} units`);
        console.log(`    Entry: $${position.entry_price ? (parseFloat(position.entry_price) / 100000).toFixed(6) : 'N/A'}`);
        console.log(`    Liquidation: $${position.liquidation_price ? (parseFloat(position.liquidation_price) / 100000).toFixed(6) : 'N/A'}`);
        console.log(`    Margin Mode: ${position.margin_mode === 0 ? 'Cross' : 'Isolated'}`);
        console.log(`    Margin Fraction: ${position.margin_fraction || 'N/A'}`);
        
        if (position.margin_fraction) {
          const leverage = 1 / parseFloat(position.margin_fraction);
          console.log(`    Effective Leverage: ${leverage.toFixed(2)}x`);
        }
        console.log();
      }
    }
  }

  await apiClient.close();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

