#!/usr/bin/env ts-node
import { AccountApi } from './src/api/account-api';
import { ApiClient } from './src/api/api-client';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env['BASE_URL'] || 'https://mainnet.zklighter.elliot.ai';
const ACCOUNT_INDEX_STR = process.env['ACCOUNT_INDEX'] || '0';

async function main(): Promise<void> {
  const apiClient = new ApiClient({ host: BASE_URL });
  const accountApi = new AccountApi(apiClient);

  const accountData = await accountApi.getAccount({ by: 'index', value: ACCOUNT_INDEX_STR });
  const account = (accountData as any).accounts?.[0] || accountData;
  const positions = (account.positions || []).filter((p: any) => parseFloat(p.position) !== 0);

  if (positions.length === 0) {
    console.log('✅ NO OPEN POSITIONS\n');
  } else {
    console.log(`❌ STILL ${positions.length} OPEN POSITION(S):\n`);
    positions.forEach((p: any) => {
      console.log(`${p.symbol}: ${p.position} BTC @ $${p.avg_entry_price}`);
    });
    console.log();
  }

  await apiClient.close();
}

if (require.main === module) {
  main().catch(console.error);
}

