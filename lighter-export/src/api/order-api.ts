import { ApiClient } from './api-client';
import { OrderBookParams, TradeParams, CreateOrderParams, CancelOrderParams, PaginationParams, AccountTradeParams } from '../types';

export interface OrderBook {
  market_id: number;
  bids: PriceLevel[];
  asks: PriceLevel[];
  last_update_id: string;
}

export interface PriceLevel {
  price: string;
  size: string;
}

export interface OrderBookDetail {
  market_id: number;
  depth: number;
  bids: PriceLevel[];
  asks: PriceLevel[];
  last_update_id: string;
}

export interface OrderBookOrders {
  market_id: number;
  orders: Order[];
}

export interface Order {
  id: string;
  market_id: number;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  size: string;
  price: string;
  filled_size: string;
  remaining_size: string;
  status: 'open' | 'filled' | 'cancelled' | 'rejected';
  created_at: string;
  updated_at: string;
  client_order_id?: string;
}

export interface Trade {
  id: string;
  market_id: number;
  side: 'buy' | 'sell';
  size: string;
  price: string;
  fee: string;
  timestamp: string;
  order_id: string;
  taker_order_id: string;
  maker_order_id: string;
}

export interface AccountTrade {
  trade_id: string;
  tx_hash: string;
  type: string;
  market_id: number;
  size: string;
  price: string;
  usd_amount: string;
  ask_id: string;
  bid_id: string;
  ask_account_id: number;
  bid_account_id: number;
  is_maker_ask: boolean;
  block_height: string;
  timestamp: number;
  taker_fee?: string;
  taker_position_size_before?: string;
  taker_entry_quote_before?: string;
  taker_initial_margin_fraction_before?: number;
  taker_position_sign_changed?: boolean;
  maker_fee?: string;
  maker_position_size_before?: string;
  maker_entry_quote_before?: string;
  maker_initial_margin_fraction_before?: number;
  maker_position_sign_changed?: boolean;
}

export interface AccountTradesResponse {
  code: number;
  message?: string;
  next_cursor?: string;
  trades: AccountTrade[];
}

export interface ExchangeStats {
  total_volume_24h: string;
  total_trades_24h: number;
  total_orders_24h: number;
  active_markets: number;
}

export class OrderApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  public async getExchangeStats(): Promise<ExchangeStats> {
    const response = await this.client.get<ExchangeStats>('/api/v1/exchangeStats');
    return response.data;
  }

  public async getOrderBooks(): Promise<OrderBook[]> {
    const response = await this.client.get<OrderBook[]>('/api/v1/orderBooks');
    return response.data;
  }

  public async getOrderBookDetails(params: OrderBookParams): Promise<OrderBookDetail> {
    const response = await this.client.get<OrderBookDetail>('/api/v1/orderBookDetails', {
      market_id: params.market_id,
      depth: params.depth,
    });
    return response.data;
  }

  public async getOrderBookOrders(params: OrderBookParams): Promise<OrderBookOrders> {
    const response = await this.client.get<OrderBookOrders>('/api/v1/orderBookOrders', {
      market_id: params.market_id,
      depth: params.depth,
    });
    return response.data;
  }

  public async getRecentTrades(params: TradeParams): Promise<Trade[]> {
    const response = await this.client.get<Trade[]>('/api/v1/recentTrades', {
      market_id: params.market_id,
      limit: params.limit,
    });
    return response.data;
  }

  public async getTrades(params: TradeParams & PaginationParams): Promise<Trade[]> {
    const response = await this.client.get<Trade[]>('/api/v1/trades', {
      market_id: params.market_id,
      limit: params.limit,
      index: params.index,
      sort: params.sort,
    });
    return response.data;
  }

  public async getAccountActiveOrders(accountIndex: number, params?: PaginationParams): Promise<Order[]> {
    const response = await this.client.get<Order[]>('/api/v1/accountActiveOrders', {
      account_index: accountIndex,
      ...params,
    });
    return response.data;
  }

  public async getAccountInactiveOrders(accountIndex: number, params?: PaginationParams): Promise<Order[]> {
    const response = await this.client.get<Order[]>('/api/v1/accountInactiveOrders', {
      account_index: accountIndex,
      ...params,
    });
    return response.data;
  }

  public async getAccountOrders(accountIndex: number, params?: PaginationParams): Promise<Order[]> {
    const response = await this.client.get<Order[]>('/api/v1/accountOrders', {
      account_index: accountIndex,
      ...params,
    });
    return response.data;
  }

  public async createOrder(params: CreateOrderParams): Promise<Order> {
    const response = await this.client.post<Order>('/api/v1/orders', {
      market_id: params.market_id,
      side: params.side,
      type: params.type,
      size: params.size,
      price: params.price,
      reduce_only: params.reduce_only,
      post_only: params.post_only,
      time_in_force: params.time_in_force,
      client_order_id: params.client_order_id,
    });
    return response.data;
  }

  public async cancelOrder(params: CancelOrderParams): Promise<{ success: boolean }> {
    const response = await this.client.delete<{ success: boolean }>('/api/v1/orders', {
      params: {
        market_id: params.market_id,
        order_id: params.order_id,
      },
    });
    return response.data;
  }

  public async cancelAllOrders(marketId?: number): Promise<{ success: boolean }> {
    const params: any = {};
    if (marketId !== undefined) {
      params.market_id = marketId;
    }
    
    const response = await this.client.delete<{ success: boolean }>('/api/v1/orders/all', {
      params,
    });
    return response.data;
  }

  public async getAccountTrades(params: AccountTradeParams): Promise<AccountTradesResponse> {
    const queryParams: any = {
      account_index: params.account_index,
      auth: params.auth,
      sort_by: params.sort_by,
      limit: params.limit,
    };

    if (params.sort_dir !== undefined) {
      queryParams.sort_dir = params.sort_dir;
    }
    if (params.market_id !== undefined) {
      queryParams.market_id = params.market_id;
    }
    if (params.cursor !== undefined) {
      queryParams.cursor = params.cursor;
    }
    if (params.from !== undefined) {
      queryParams.from = params.from;
    }
    if (params.ask_filter !== undefined) {
      queryParams.ask_filter = params.ask_filter;
    }

    const response = await this.client.get<AccountTradesResponse>('/api/v1/trades', queryParams);
    return response.data;
  }
}