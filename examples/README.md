# Lighter TypeScript SDK Examples

This directory contains comprehensive examples demonstrating how to use the Lighter TypeScript SDK.

## Setup Instructions

### Testnet Setup
1. Go to https://testnet.app.lighter.xyz/ and connect a wallet to receive $500
2. Run `system_setup.ts` with the correct ETH Private key configured
   - Set an API key index which is not 0, so you won't override the one used by [app.lighter.xyz](https://app.lighter.xyz/)
   - This will require you to enter your Ethereum private key
   - The ETH private key will only be used in the TypeScript SDK to sign a message
   - The ETH private key is not required in order to trade on the platform
   - The ETH private key is not passed to the WASM binary
   - Copy the output of the script and post it into `create_cancel_order.ts`
   - The output should look like:
```
BASE_URL = 'https://testnet.zklighter.elliot.ai'
API_KEY_PRIVATE_KEY = '0x...' # Your generated API private key
ACCOUNT_INDEX = 595
API_KEY_INDEX = 1
```
3. Start trading using:
   - `create_cancel_order.ts` has an example which creates an order on testnet & cancels it
   - You'll need to set up both your account index, API key index & API Key private key

### Mainnet Setup
1. Deposit money on Lighter to create an account first
2. Change the URL to `mainnet.zklighter.elliot.ai`
3. Repeat setup steps

## Examples Overview

### Basic Trading Examples

#### [Create Market Order](create_market_order.ts)
Demonstrates how to create a market order using the WASM signer.

```bash
npx ts-node examples/create_market_order.ts
```

#### [Create Limit Orders](create_limit_order.ts)
Comprehensive example showing different types of limit orders including basic limit orders, IOC orders, and stop limit orders.

```bash
npx ts-node examples/create_limit_order.ts
```

#### [Create & Cancel Orders](create_cancel_order.ts)
Shows how to create limit orders and cancel them.

```bash
npx ts-node examples/create_cancel_order.ts
```

#### [Create Market Order with Max Slippage](create_market_order_max_slippage.ts)
Example of creating market orders with price protection.

```bash
npx ts-node examples/create_market_order_max_slippage.ts
```

#### [Create Stop Loss & Take Profit Orders](create_sl_tp.ts)
Demonstrates advanced order types with trigger prices.

```bash
npx ts-node examples/create_sl_tp.ts
```

### Account Management Examples

#### [System Setup](system_setup.ts)
Complete setup process for creating API keys and configuring accounts.

```bash
npx ts-node examples/system_setup.ts
```

#### [Transfer & Update Leverage](transfer_update_leverage.ts)
Shows how to transfer USDC between accounts and update leverage settings.

```bash
npx ts-node examples/transfer_update_leverage.ts
```

#### [Withdraw to Ethereum L1](withdraw.ts)
Demonstrates how to withdraw USDC from Lighter L2 to Ethereum L1 (takes ~2 hours).

```bash
npx ts-node examples/withdraw.ts
```

#### [Check Transaction Status](check_transaction_status.ts)
Demonstrates proper transaction status handling with detailed information about success/failure.

```bash
npx ts-node examples/check_transaction_status.ts
```

#### [Cancel All Orders](cancel_all_orders.ts)
Cancel all open orders immediately.

```bash
npx ts-node examples/cancel_all_orders.ts
```

#### [Cancel Specific Order](cancel_order.ts)
Cancel a specific order or the top order in a market. Supports canceling by order index or client order index.

```bash
# Cancel top order in market 0 (auto)
npx ts-node examples/cancel_order.ts

# Cancel specific order by index
MARKET_INDEX=0 ORDER_INDEX=0 npx ts-node examples/cancel_order.ts

# Cancel by client order index
MARKET_INDEX=0 CLIENT_ORDER_INDEX=123456789 npx ts-node examples/cancel_order.ts
```

#### [Close All Positions](close_all_positions.ts)
Close all open positions across all markets.

```bash
npx ts-node examples/close_all_positions.ts
```

#### [Close Specific Position](close_position.ts)
Close a specific position or the top position in a market.

```bash
# Close top position in market 0 (auto)
npx ts-node examples/close_position.ts

# Close specific position by index
MARKET_INDEX=0 POSITION_INDEX=0 npx ts-node examples/close_position.ts
```

#### [Create Orders with Multiple Keys](create_with_multiple_keys.ts)
Demonstrates using multiple API keys for trading.

```bash
npx ts-node examples/create_with_multiple_keys.ts
```

### API Information Examples

#### [Get Information](get_info.ts)
Comprehensive example showing all available API endpoints.

```bash
npx ts-node examples/get_info.ts
```

### WebSocket Examples

#### [WebSocket Sync](ws.ts)
Real-time order book and account synchronization.

```bash
npx ts-node examples/ws.ts
```

#### [WebSocket Async](ws_async.ts)
Asynchronous WebSocket connection handling.

```bash
npx ts-node examples/ws_async.ts
```

#### [WebSocket Send Transaction](ws_send_tx.ts)
Sending transactions through WebSocket connection.

```bash
npx ts-node examples/ws_send_tx.ts
```

#### [WebSocket Send Batch Transaction](ws_send_batch_tx.ts)
Sending multiple transactions in a batch via WebSocket.

```bash
npx ts-node examples/ws_send_batch_tx.ts
```

### Advanced Examples

#### [Send Transaction Batch](send_tx_batch.ts)
Batch transaction processing for improved efficiency.

```bash
npx ts-node examples/send_tx_batch.ts
```

## Environment Variables

Create a `.env` file in your project root:

```env
BASE_URL=https://mainnet.zklighter.elliot.ai
PRIVATE_KEY=your-api-key-private-key
ACCOUNT_INDEX=123
API_KEY_INDEX=0
ETH_PRIVATE_KEY=your-ethereum-private-key
```

## Running Examples

All examples can be run using:

```bash
npx ts-node examples/[example-name].ts
```

Make sure you have:
1. Installed dependencies: `npm install`
2. Set up your `.env` file with correct credentials
3. Built the WASM signer (if using signer examples)

## Security Best Practices

**⚠️ IMPORTANT SECURITY NOTES:**

1. **Never commit `.env` file** - It contains your private keys
2. **Never share console output** - May contain sensitive transaction data
3. **Use environment variables** - Never hardcode private keys in code
4. **Keep private keys secure** - Treat API private keys like passwords
5. **Testnet first** - Always test with testnet before using mainnet

## Error Handling

All examples include proper error handling and will display helpful error messages if something goes wrong. Common issues include:

- Invalid API credentials
- Insufficient balance
- Invalid order parameters
- Network connectivity issues

## Support

For questions about the examples or the SDK, please visit our [documentation](https://docs.lighter.xyz) or join our [Discord community](https://discord.gg/lighter).