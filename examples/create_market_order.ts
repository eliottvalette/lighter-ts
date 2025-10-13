import { SignerClient } from '../src/signer/wasm-signer-client';
import { ApiClient } from '../src/api/api-client';
import { waitAndCheckTransaction, printTransactionResult } from '../src/utils/transaction-helper';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env['BASE_URL'] || 'https://mainnet.zklighter.elliot.ai';
const API_KEY_PRIVATE_KEY = process.env['API_PRIVATE_KEY'];
const ACCOUNT_INDEX = parseInt(process.env['ACCOUNT_INDEX'] || '0', 10);
const API_KEY_INDEX = parseInt(process.env['API_KEY_INDEX'] || '0', 10);

async function main(): Promise<void> {
  if (!API_KEY_PRIVATE_KEY) {
    console.error('API_PRIVATE_KEY environment variable is required');
    return;
  }

  const client = new SignerClient({
    url: BASE_URL,
    privateKey: API_KEY_PRIVATE_KEY,
    accountIndex: ACCOUNT_INDEX,
    apiKeyIndex: API_KEY_INDEX,
  });

  await client.initialize();
  await (client as any).ensureWasmClient();

  const [tx, txHash, err] = await client.createMarketOrder({
    marketIndex: 0,
    clientOrderIndex: Date.now(),
    baseAmount: 10,
    avgExecutionPrice: 4500, 
    isAsk: true,
  });

  console.log('Create Market Order:', { tx, txHash, err });
  if (err) {
    console.error('❌ Market order failed:', err);
  } else {
    console.log('✅ Market order created successfully!');
    console.log('📋 Order Details:');
    console.log(`   Market Index: ${tx.MarketIndex}`);
    console.log(`   Client Order Index: ${tx.ClientOrderIndex}`);
    console.log(`   Base Amount: ${tx.BaseAmount}`);
    console.log(`   Price: ${tx.Price}`);
    console.log(`   Is Ask: ${tx.IsAsk ? 'Yes (Sell)' : 'No (Buy)'}`);
    console.log(`   Order Type: ${tx.Type === 0 ? 'Limit' : 'Market'}`);
    console.log(`   Nonce: ${tx.Nonce}`);

    // Wait for transaction confirmation with proper error handling
    if (txHash) {
      console.log('');
      const apiClient = new ApiClient({ host: BASE_URL });
      const result = await waitAndCheckTransaction(apiClient, txHash);
      printTransactionResult('Market Order', txHash, result);
      await apiClient.close();
    } else {
      console.log('⚠️ No transaction hash available');
    }
  }

  await client.close();
}

if (require.main === module) {
  main().catch(console.error);
}
