#!/usr/bin/env ts-node
import { OrderApi } from './src/api/order-api';
import { ApiClient } from './src/api/api-client';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env['BASE_URL'] || 'https://mainnet.zklighter.elliot.ai';

async function main(): Promise<void> {
  const apiClient = new ApiClient({ host: BASE_URL });
  const orderApi = new OrderApi(apiClient);

  const details = await orderApi.getOrderBookDetails({ market_id: 1, depth: 1 }) as any;
  const marketInfo = details.order_book_details[0];
  
  console.log('\nRAW API Response:');
  console.log(`last_trade_price: ${marketInfo.last_trade_price} (type: ${typeof marketInfo.last_trade_price})`);
  console.log();
  
  const parsed = parseFloat(marketInfo.last_trade_price);
  console.log(`Parsed: ${parsed}`);
  console.log(`* 100000: ${parsed * 100000}`);
  console.log(`Already scaled?: ${parsed > 100000 ? 'YES' : 'NO'}`);
  console.log();

  await apiClient.close();
}

if (require.main === module) {
  main().catch(console.error);
}

