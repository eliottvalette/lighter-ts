#!/usr/bin/env ts-node
/**
 * Lighter Trading Dashboard
 * Shows all account information, market prices, positions, and leverage
 * Usage: npx ts-node dashboard.ts [market_index]
 * Example: npx ts-node dashboard.ts 0
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

interface MarketData {
  marketIndex: number;
  bidPrice: number;
  askPrice: number;
  midPrice: number;
  spread: number;
  spreadBps: number;
}

async function getMarketData(orderApi: OrderApi, marketIndex: number): Promise<MarketData | null> {
  try {
    const orderbooks = await orderApi.getOrderBooks() as any;
    const book = orderbooks.order_books?.find((ob: any) => ob.market_index === marketIndex);

    if (book && book.bids && book.bids.length > 0 && book.asks && book.asks.length > 0) {
      const bestBid = book.bids[0];
      const bestAsk = book.asks[0];

      const bidPrice = parseFloat(bestBid.price) / 100000;
      const askPrice = parseFloat(bestAsk.price) / 100000;
      const midPrice = (bidPrice + askPrice) / 2;
      const spread = askPrice - bidPrice;
      const spreadBps = (spread / midPrice) * 10000;

      return {
        marketIndex,
        bidPrice,
        askPrice,
        midPrice,
        spread,
        spreadBps
      };
    }

    // Fallback to orderbook details
    const details = await orderApi.getOrderBookDetails({ market_id: marketIndex, depth: 1 }) as any;
    if (details.order_book_details && details.order_book_details.length > 0) {
      const marketInfo = details.order_book_details[0];
      if (marketInfo.last_trade_price) {
        const lastPrice = parseFloat(marketInfo.last_trade_price);
        return {
          marketIndex,
          bidPrice: lastPrice,
          askPrice: lastPrice,
          midPrice: lastPrice,
          spread: 0,
          spreadBps: 0
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const specificMarket = args.length > 0 && args[0] ? parseInt(args[0], 10) : null;

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║         LIGHTER TRADING DASHBOARD                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const apiClient = new ApiClient({ host: BASE_URL });
  const accountApi = new AccountApi(apiClient);
  const orderApi = new OrderApi(apiClient);

  console.log('📊 ACCOUNT INFORMATION');
  console.log('─'.repeat(60));
  console.log(`Account Index: ${ACCOUNT_INDEX}`);
  console.log(`API Key Index: ${API_KEY_INDEX}`);
  console.log(`Network: ${BASE_URL}\n`);

  // Get account data
  try {
    const accountData = await accountApi.getAccount({ by: 'index', value: ACCOUNT_INDEX_STR });
    const account = (accountData as any).accounts?.[0] || accountData;
    const positions = account.positions || [];

    console.log('💰 ACCOUNT BALANCE');
    console.log('─'.repeat(60));
    console.log(`Total Collateral:    ${account.collateral} USDC`);
    console.log(`Available Balance:   ${account.available_balance} USDC`);
    console.log(`Total Asset Value:   ${account.total_asset_value} USDC`);
    console.log(`Cross Asset Value:   ${account.cross_asset_value} USDC\n`);

    // Show market data
    const marketsToShow = specificMarket !== null ? [specificMarket] : [0, 1, 2]; // ETH, BTC, SOL by default
    
    console.log('📈 MARKET DATA');
    console.log('─'.repeat(60));
    
    const marketNames: { [key: number]: string } = {
      0: 'ETH/USDC',
      1: 'BTC/USDC',
      2: 'SOL/USDC',
      3: 'DOGE/USDC',
      4: '1000PEPE/USDC'
    };

    for (const marketIndex of marketsToShow) {
      const marketData = await getMarketData(orderApi, marketIndex);
      const marketName = marketNames[marketIndex] || `Market ${marketIndex}`;
      
      if (marketData) {
        console.log(`\n${marketName}:`);
        console.log(`  Bid:        $${marketData.bidPrice.toFixed(6)}`);
        console.log(`  Ask:        $${marketData.askPrice.toFixed(6)}`);
        console.log(`  Mid:        $${marketData.midPrice.toFixed(6)}`);
        console.log(`  Spread:     $${marketData.spread.toFixed(6)} (${marketData.spreadBps.toFixed(2)} bps)`);
        console.log(`  Raw Price:  ${Math.floor(marketData.midPrice * 100000)} units`);
      } else {
        console.log(`\n${marketName}: No data available`);
      }
    }

    console.log('\n');

    // Show positions
    console.log('📍 OPEN POSITIONS');
    console.log('─'.repeat(60));
    
    if (positions.length === 0) {
      console.log('No open positions\n');
    } else {
      console.log(`Found ${positions.length} position(s):\n`);
      
      for (const position of positions) {
        const marketIndex = position.market_index;
        const baseAmount = parseInt(position.base_amount, 10);
        const positionType = baseAmount > 0 ? 'LONG' : 'SHORT';
        const marketName = marketNames[marketIndex] || `Market ${marketIndex}`;
        
        console.log(`${marketName}:`);
        console.log(`  Type:           ${positionType}`);
        console.log(`  Size:           ${Math.abs(baseAmount)} units`);
        console.log(`  Entry Price:    $${position.entry_price ? (parseFloat(position.entry_price) / 100000).toFixed(6) : 'N/A'}`);
        console.log(`  Liq. Price:     $${position.liquidation_price ? (parseFloat(position.liquidation_price) / 100000).toFixed(6) : 'N/A'}`);
        console.log(`  Margin Mode:    ${position.margin_mode === 0 ? 'Cross' : 'Isolated'}`);
        
        if (position.margin_fraction) {
          const leverage = 1 / parseFloat(position.margin_fraction);
          console.log(`  Leverage:       ${leverage.toFixed(2)}x`);
        }
        
        // Get current market price for PnL calculation
        const marketData = await getMarketData(orderApi, marketIndex);
        if (marketData && position.entry_price) {
          const entryPrice = parseFloat(position.entry_price) / 100000;
          const currentPrice = marketData.midPrice;
          const pnlPercent = baseAmount > 0 
            ? ((currentPrice - entryPrice) / entryPrice) * 100
            : ((entryPrice - currentPrice) / entryPrice) * 100;
          
          console.log(`  Current Price:  $${currentPrice.toFixed(6)}`);
          console.log(`  Unrealized PnL: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`);
        }
        
        console.log();
      }
    }

    // Show active orders
    console.log('📝 ACTIVE ORDERS');
    console.log('─'.repeat(60));
    
    const totalOrderCount = account.total_order_count || 0;
    const pendingOrderCount = account.pending_order_count || 0;
    
    console.log(`Total Orders:    ${totalOrderCount}`);
    console.log(`Pending Orders:  ${pendingOrderCount}\n`);

    // Show quick actions
    console.log('⚡ QUICK ACTIONS');
    console.log('─'.repeat(60));
    console.log('Place limit order:');
    console.log('  npx ts-node place_limit_order.ts <market> <buy|sell> <size> <price>');
    console.log('  Example: npx ts-node place_limit_order.ts 2 buy 100 185\n');
    
    console.log('Get market price:');
    console.log('  npx ts-node get_market_mid.ts <market>');
    console.log('  Example: npx ts-node get_market_mid.ts 2\n');
    
    console.log('View leverage:');
    console.log('  npx ts-node get_leverage.ts [market]\n');
    
    console.log('Close all positions:');
    console.log('  npx ts-node close_all_positions.ts\n');

    // Test API key if provided
    if (API_KEY_PRIVATE_KEY) {
      console.log('🔑 API KEY STATUS');
      console.log('─'.repeat(60));
      try {
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
          console.log(`Status: ❌ Error - ${err}\n`);
        } else {
          console.log('Status: ✅ API Key Valid and Ready\n');
        }
        
        await client.close();
      } catch (error: any) {
        console.log(`Status: ❌ Error - ${error.message}\n`);
      }
    } else {
      console.log('🔑 API KEY STATUS');
      console.log('─'.repeat(60));
      console.log('Status: ⚠️  No API_PRIVATE_KEY set (read-only mode)\n');
    }

  } catch (error: any) {
    console.error('\n❌ Error fetching data:', error.message);
    console.error('Make sure your ACCOUNT_INDEX is set correctly in .env\n');
  }

  await apiClient.close();
  
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         Dashboard Complete                            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal Error:', error.message);
    process.exit(1);
  });
}

