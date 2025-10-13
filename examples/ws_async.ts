import { WsClient } from '../src/api/ws-client';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env['BASE_URL'] || 'https://mainnet.zklighter.elliot.ai';

// Unused functions - keeping for reference
// function onOrderBookUpdate(marketId: number, orderBook: any): void {
//   console.log(`Order book ${marketId}:`, JSON.stringify(orderBook, null, 2));
// }

// function onAccountUpdate(accountId: number, account: any): void {
//   console.log(`Account ${accountId}:`, JSON.stringify(account, null, 2));
// }

async function main() {
  const wsUrl = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  
  const client = new WsClient({
    url: wsUrl,
    onOpen: () => console.log('WebSocket connected'),
    onMessage: (message) => {
      console.log('Received message:', message);
      // Handle different message types here
    },
    onClose: () => console.log('WebSocket closed'),
    onError: (error) => console.error('WebSocket error:', error)
  });

  await client.connect();
  
  // Subscribe to order book updates
  client.subscribe({ channel: 'orderbook', params: { market_id: 0 } });
  client.subscribe({ channel: 'orderbook', params: { market_id: 1 } });
  
  // Subscribe to account updates
  client.subscribe({ channel: 'account', params: { account_index: 1 } });
  client.subscribe({ channel: 'account', params: { account_index: 2 } });
}

main().catch(console.error);
