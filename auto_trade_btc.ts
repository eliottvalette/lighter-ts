#!/usr/bin/env ts-node
/**
 * Automated BTC Trading Script
 * 1. Set leverage to 10x on BTC market
 * 2. Open a long BTC position with limit order at best bid + 0.5%
 * 3. Wait 20 seconds
 * 4. Fetch positions
 * 5. Close all positions with reduce-only
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

const BTC_MARKET_INDEX = 1;
const TARGET_LEVERAGE = 10;
const WAIT_TIME_MS = 20000; // 20 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (!API_KEY_PRIVATE_KEY) {
    console.error('❌ API_PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║         AUTOMATED BTC TRADING SCRIPT                 ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

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

  const err = client.checkClient();
  if (err) {
    console.error('❌ Client error:', err);
    process.exit(1);
  }

  // Wait a bit for nonce cache to initialize
  await sleep(2000);

  // Step 1: Set leverage to 10x
  console.log('📊 STEP 1: Setting leverage');
  console.log('─'.repeat(60));
  console.log(`Target: ${TARGET_LEVERAGE}x leverage on BTC market`);

  // For 10x leverage: fraction = 1/10 = 0.1, scaled by 10,000 = 1,000
  const MARGIN_FRACTION_SCALE = 10000;
  const initialMarginFraction = Math.floor((1 / TARGET_LEVERAGE) * MARGIN_FRACTION_SCALE);
  const [, leverageTransactionHash, leverageError] = await client.updateLeverage(
    BTC_MARKET_INDEX, 
    SignerClient.CROSS_MARGIN_MODE, 
    initialMarginFraction
  );

  if (leverageError) {
    console.error(`❌ Failed to set leverage: ${leverageError}`);
    console.log(`⚠️  Continuing with current leverage settings...\n`);
  } else {
    console.log('✅ Leverage updated successfully!');
    console.log(`   TX Hash: ${leverageTransactionHash}`);
    
    // Wait for leverage update confirmation
    if (leverageTransactionHash) {
      try {
        const confirmedTx = await client.waitForTransaction(leverageTransactionHash, 30000, 1000);
        console.log('✅ Leverage update confirmed!');
        console.log(`   Block: ${confirmedTx.block_height}`);
        console.log(`   Status: ${confirmedTx.status}\n`);
      } catch {
        console.log('⏳ Leverage update confirmation pending...\n');
      }
    } else {
      console.log();
    }
  }

  // Step 2: Get BTC market price and open long position
  console.log('📈 STEP 2: Opening BTC long position');
  console.log('─'.repeat(60));

  try {
    const details = await orderApi.getOrderBookDetails({ market_id: BTC_MARKET_INDEX, depth: 1 }) as any;
    
    if (!details.order_book_details || details.order_book_details.length === 0) {
      console.error('❌ No BTC market data available');
      await client.close();
      await apiClient.close();
      process.exit(1);
    }

    const marketInfo = details.order_book_details[0];
    const currentPrice = parseFloat(marketInfo.last_trade_price);
    const avgExecutionPriceUnits = Math.floor(currentPrice * 100000);

    console.log(`Current Price: $${currentPrice.toFixed(2)}`);
    console.log(`Order Type: MARKET`);
    console.log(`Order Size: 100 units\n`);

    // Place market buy order
    const [, orderHash, orderError] = await client.createMarketOrder({
      marketIndex: BTC_MARKET_INDEX,
      clientOrderIndex: Date.now(),
      baseAmount: 100,
      avgExecutionPrice: avgExecutionPriceUnits,
      isAsk: false,
      reduceOnly: false
    });

    if (orderError) {
      console.error(`❌ Order failed: ${orderError}`);
      await client.close();
      await apiClient.close();
      process.exit(1);
    }

    console.log('✅ BTC long order placed successfully!');
    console.log(`   TX Hash: ${orderHash}\n`);

    // Wait for confirmation
    if (orderHash) {
      try {
        const confirmedTx = await client.waitForTransaction(orderHash, 30000, 1000);
        console.log('✅ Order confirmed!');
        console.log(`   Block: ${confirmedTx.block_height}`);
        console.log(`   Status: ${confirmedTx.status}\n`);
      } catch {
        console.log('⏳ Order confirmation pending...\n');
      }
    }

  } catch (error: any) {
    console.error(`❌ Error placing order: ${error.message}`);
    await client.close();
    await apiClient.close();
    process.exit(1);
  }

  // Step 3: Wait 20 seconds
  console.log('⏰ STEP 3: Waiting 20 seconds');
  console.log('─'.repeat(60));
  console.log(`Waiting ${WAIT_TIME_MS / 1000} seconds before closing positions...`);

  await sleep(WAIT_TIME_MS);
  console.log('✅ Wait complete\n');

  // Step 4: Fetch positions
  console.log('📍 STEP 4: Fetching current positions');
  console.log('─'.repeat(60));

  const accountData = await accountApi.getAccount({ by: 'index', value: ACCOUNT_INDEX_STR });
  const account = (accountData as any).accounts?.[0] || accountData;
  const allPositions = account.positions || [];
  
  // Filter only valid positions - use correct field names!
  const positions = allPositions.filter((p: any) => 
    p.market_id !== undefined && 
    p.position !== undefined && 
    parseFloat(p.position) !== 0
  );

  console.log(`Found ${positions.length} valid position(s):\n`);

  if (positions.length === 0) {
    console.log('No positions to close\n');
    await client.close();
    await apiClient.close();
    return;
  }

  for (const position of positions) {
    const marketId = position.market_id;
    const positionSize = parseFloat(position.position);
    const positionSign = position.sign || 1;
    const positionType = positionSign > 0 ? 'LONG' : 'SHORT';
    const marketName = marketId === BTC_MARKET_INDEX ? 'BTC/USDC' : marketId === 0 ? 'ETH/USDC' : marketId === 2 ? 'SOL/USDC' : `Market ${marketId}`;
    
    console.log(`${marketName} (${position.symbol || 'N/A'}):`);
    console.log(`  Type: ${positionType}`);
    console.log(`  Size: ${Math.abs(positionSize)}`);
    console.log(`  Entry: $${position.avg_entry_price || 'N/A'}`);
    console.log(`  Value: $${position.position_value || 'N/A'}`);
    console.log(`  Unrealized PnL: $${position.unrealized_pnl || 'N/A'}`);
    console.log();
  }

  // Step 5: Close all positions using built-in method
  console.log('🔒 STEP 5: Closing all positions');
  console.log('─'.repeat(60));

  const [closedTransactions, , errors] = await client.closeAllPositions();

  console.log(`Positions closed: ${closedTransactions.length}`);
  console.log(`Errors: ${errors.length}\n`);

  if (errors.length > 0) {
    console.log('❌ Errors encountered:');
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
    console.log();
  }

  if (closedTransactions.length > 0) {
    console.log('✅ Successfully closed positions:');
    closedTransactions.forEach((tx, index) => {
      const marketName = tx.MarketIndex === BTC_MARKET_INDEX ? 'BTC/USDC' : tx.MarketIndex === 0 ? 'ETH/USDC' : tx.MarketIndex === 2 ? 'SOL/USDC' : `Market ${tx.MarketIndex}`;
      console.log(`   ${index + 1}. ${marketName}: ${tx.IsAsk ? 'Sell' : 'Buy'} ${tx.BaseAmount} units`);
    });
    console.log();
  }

  if (closedTransactions.length === 0 && errors.length === 0) {
    console.log('ℹ️  No open positions found to close.\n');
  }

  // Step 6: Fetch account trades
  console.log('📊 STEP 6: Fetching account trades');
  console.log('─'.repeat(60));

  try {
    // Create auth token for trades endpoint
    const authToken = await client.createAuthTokenWithExpiry();
    
    // Set auth header
    apiClient.setDefaultHeader('authorization', authToken);
    apiClient.setDefaultHeader('Authorization', authToken);

    // Fetch recent trades (last 20)
    const tradesResponse = await orderApi.getAccountTrades({
      account_index: ACCOUNT_INDEX,
      auth: authToken,
      sort_by: 'timestamp',
      sort_dir: 'desc',
      limit: 20,
      market_id: BTC_MARKET_INDEX
    });

    if (tradesResponse.trades && tradesResponse.trades.length > 0) {
      console.log(`Found ${tradesResponse.trades.length} recent BTC trades:\n`);

      tradesResponse.trades.forEach((trade, index) => {
        // Determine if this account was buyer or seller
        const isBuyer = trade.bid_account_id === ACCOUNT_INDEX;
        const side = isBuyer ? 'BUY' : 'SELL';
        const role = (isBuyer && !trade.is_maker_ask) || (!isBuyer && trade.is_maker_ask) ? 'MAKER' : 'TAKER';
        
        const date = new Date(trade.timestamp);
        const timeStr = date.toLocaleString();

        console.log(`Trade ${index + 1}:`);
        console.log(`  Time: ${timeStr}`);
        console.log(`  Side: ${side} (${role})`);
        console.log(`  Size: ${trade.size} BTC`);
        console.log(`  Price: $${parseFloat(trade.price).toFixed(2)}`);
        console.log(`  Value: $${parseFloat(trade.usd_amount).toFixed(2)}`);
        console.log(`  TX: ${trade.tx_hash.substring(0, 16)}...`);
        console.log();
      });

      if (tradesResponse.next_cursor) {
        console.log('More trades available (use cursor for pagination)\n');
      }
    } else {
      console.log('No BTC trades found for this account\n');
    }

  } catch (error: any) {
    console.error(`❌ Failed to fetch trades: ${error.message}\n`);
  }

  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         Automated Trading Complete                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  await client.close();
  await apiClient.close();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal Error:', error.message);
    process.exit(1);
  });
}

