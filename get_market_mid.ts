#!/usr/bin/env ts-node
/**
 * Get current mid price for a market
 * Usage: npx ts-node get_market_mid.ts <market_index>
 * Example: npx ts-node get_market_mid.ts 0
 */

import { ApiClient } from './src/api/api-client';
import { OrderApi } from './src/api/order-api';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env['BASE_URL'] || 'https://mainnet.zklighter.elliot.ai';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length < 1 || !args[0]) {
    console.error('Usage: npx ts-node get_market_mid.ts <market_index>');
    console.error('Example: npx ts-node get_market_mid.ts 0');
    console.error('');
    console.error('Common market indices:');
    console.error('  0 - ETH/USDC');
    console.error('  1 - BTC/USDC');
    console.error('  2 - SOL/USDC');
    console.error('  3 - DOGE/USDC');
    console.error('  4 - 1000PEPE/USDC');
    process.exit(1);
  }

  const marketIndex = parseInt(args[0]!, 10);

  if (isNaN(marketIndex) || marketIndex < 0) {
    console.error('Invalid market index');
    process.exit(1);
  }

  const apiClient = new ApiClient({ host: BASE_URL });
  const orderApi = new OrderApi(apiClient);

  try {
    // Get orderbook details
    const details = await orderApi.getOrderBookDetails({ market_id: marketIndex, depth: 1 }) as any;
    
    if (!details.order_book_details || details.order_book_details.length === 0) {
      console.log('\n⚠️  No orderbook data available for this market');
      await apiClient.close();
      return;
    }

    const marketInfo = details.order_book_details[0];
    const marketName = `Market ${marketIndex}`;

    console.log(`\n📊 ${marketName}`);

    // Get full orderbook for bid/ask
    const orderbooks = await orderApi.getOrderBooks() as any;
    const book = orderbooks.order_books?.find((ob: any) => ob.market_index === marketIndex);

    if (book && book.bids && book.bids.length > 0 && book.asks && book.asks.length > 0) {
      // Best bid and ask from full orderbook
      const bestBid = book.bids[0];
      const bestAsk = book.asks[0];

      const bidPrice = parseFloat(bestBid.price) / 100000;
      const askPrice = parseFloat(bestAsk.price) / 100000;
      const midPrice = (bidPrice + askPrice) / 2;
      const spread = askPrice - bidPrice;
      const spreadBps = (spread / midPrice) * 10000;

      console.log(`\n💰 Current Prices:`);
      console.log(`   Best Bid: $${bidPrice.toFixed(6)} (${bestBid.size} units)`);
      console.log(`   Best Ask: $${askPrice.toFixed(6)} (${bestAsk.size} units)`);
      console.log(`   Mid Price: $${midPrice.toFixed(6)}`);
      console.log(`   Spread: $${spread.toFixed(6)} (${spreadBps.toFixed(2)} bps)`);
      console.log(`\n   Raw Mid (for orders): ${Math.floor(midPrice * 100000)} units`);
    } else if (marketInfo.last_trade_price) {
      // Fallback to last trade price
      const lastPrice = parseFloat(marketInfo.last_trade_price);
      console.log(`\n💰 Last Trade Price: $${lastPrice.toFixed(6)}`);
      console.log(`   Raw Price (for orders): ${Math.floor(lastPrice * 100000)} units`);
    } else {
      console.log('\n⚠️  No price data available');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }

  await apiClient.close();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

