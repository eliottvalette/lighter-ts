/**
 * WASM Signer Client for Lighter Protocol
 * 
 * This module provides a TypeScript wrapper for the Go WASM signer,
 * enabling cryptographic operations in the browser and Node.js environments.
 */

export interface WasmSignerConfig {
  wasmPath: string; // Path to the WASM binary
  wasmExecPath?: string; // Path to wasm_exec.js (optional, defaults to same directory)
}

export interface ApiKeyPair {
  privateKey: string;
  publicKey: string;
}

export interface CreateClientParams {
  url: string;
  privateKey: string;
  chainId: number;
  apiKeyIndex: number;
  accountIndex: number;
}

export interface CreateOrderParams {
  marketIndex: number;
  clientOrderIndex: number;
  baseAmount: number;
  price: number;
  isAsk: number;
  orderType: number;
  timeInForce: number;
  reduceOnly: number;
  triggerPrice: number;
  orderExpiry: number;
  nonce: number;
}

export interface CancelOrderParams {
  marketIndex: number;
  orderIndex: number;
  nonce: number;
}

export interface CancelAllOrdersParams {
  timeInForce: number;
  time: number;
  nonce: number;
}

export interface TransferParams {
  toAccountIndex: number;
  usdcAmount: number;
  fee: number;
  memo: string;
  nonce: number;
}

export interface UpdateLeverageParams {
  marketIndex: number;
  fraction: number;
  marginMode: number;
  nonce: number;
}

export interface WithdrawParams {
  usdcAmount: number;
  nonce: number;
}

export interface WasmSignerResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
}

export class WasmSignerClient {
  private wasmModule: any = null;
  private isInitialized = false;
  private config: WasmSignerConfig;

  constructor(config: WasmSignerConfig) {
    this.config = config;
  }

  /**
   * Initialize the WASM module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load the Go WASM runtime
      const wasmExecPath = this.config.wasmExecPath || this.config.wasmPath.replace('.wasm', '_exec.js');
      await this.loadScript(wasmExecPath);

      // Load the WASM binary
      const wasmBytes = await this.loadWasmBinary(this.config.wasmPath);
      
      // Initialize the Go runtime
      const go = new (window as any).Go();
      const result = await WebAssembly.instantiate(wasmBytes, go.importObject);
      go.run(result.instance);

      this.wasmModule = {
        generateAPIKey: (window as any).GenerateAPIKey || (window as any).generateAPIKey,
        getPublicKey: (window as any).GetPublicKey || (window as any).getPublicKey,
        createClient: (window as any).CreateClient || (window as any).createClient,
        signChangePubKey: (window as any).SignChangePubKey || (window as any).signChangePubKey,
        signCreateOrder: (window as any).SignCreateOrder || (window as any).signCreateOrder,
        signCancelOrder: (window as any).SignCancelOrder || (window as any).signCancelOrder,
        signCancelAllOrders: (window as any).SignCancelAllOrders || (window as any).signCancelAllOrders,
        signTransfer: (window as any).SignTransfer || (window as any).signTransfer,
        signWithdraw: (window as any).SignWithdraw || (window as any).signWithdraw,
        signUpdateLeverage: (window as any).SignUpdateLeverage || (window as any).signUpdateLeverage,
        createAuthToken: (window as any).CreateAuthToken || (window as any).createAuthToken,
      };

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize WASM signer: ${error}`);
    }
  }

  /**
   * Generate a new API key pair
   */
  async generateAPIKey(seed?: string): Promise<ApiKeyPair> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.generateAPIKey(seed);
    if (result.error) {
      throw new Error(`Failed to generate API key: ${result.error}`);
    }
    
    return {
      privateKey: result.privateKey,
      publicKey: result.publicKey,
    };
  }

  /**
   * Get public key from private key
   */
  async getPublicKey(privateKey: string): Promise<string> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.getPublicKey(privateKey);
    
    if (result.error) {
      throw new Error(`Failed to get public key: ${result.error}`);
    }
    
    return result.publicKey;
  }

  /**
   * Sign a ChangePubKey transaction
   */
  async signChangePubKey(params: {
    pubkey: string;
    l1Sig: string;
    newApiKeyIndex: number;
    nonce: number;
    expiredAt: number;
  }): Promise<{ txInfo: string; error?: string }> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.signChangePubKey(
      params.pubkey,
      params.l1Sig,
      params.newApiKeyIndex,
      params.nonce,
      params.expiredAt
    );
    
    if (result.error) {
      return { txInfo: '', error: result.error };
    }
    
    return { txInfo: result.txInfo };
  }

  /**
   * Create a client for signing transactions
   */
  async createClient(params: CreateClientParams): Promise<void> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.createClient(
      params.url,
      params.privateKey,
      params.chainId,
      params.apiKeyIndex,
      params.accountIndex
    );
    
    if (result.error) {
      throw new Error(`Failed to create client: ${result.error}`);
    }
  }

  /**
   * Sign a create order transaction
   */
  async signCreateOrder(params: CreateOrderParams): Promise<string> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.signCreateOrder(
      params.marketIndex,
      params.clientOrderIndex,
      params.baseAmount,
      params.price,
      params.isAsk,
      params.orderType,
      params.timeInForce,
      params.reduceOnly,
      params.triggerPrice,
      params.orderExpiry,
      params.nonce
    );
    
    if (result.error) {
      throw new Error(`Failed to sign create order: ${result.error}`);
    }
    
    return result.txInfo;
  }

  /**
   * Sign a cancel order transaction
   */
  async signCancelOrder(params: CancelOrderParams): Promise<string> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.signCancelOrder(
      params.marketIndex,
      params.orderIndex,
      params.nonce
    );
    
    if (result.error) {
      throw new Error(`Failed to sign cancel order: ${result.error}`);
    }
    
    return result.txInfo;
  }

  /**
   * Sign a cancel all orders transaction
   */
  async signCancelAllOrders(params: CancelAllOrdersParams): Promise<{ txInfo: string; error?: string }> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.signCancelAllOrders(
      params.timeInForce,
      params.time,
      params.nonce
    );
    
    if (result.error) {
      return { txInfo: '', error: result.error };
    }
    
    return { txInfo: result.txInfo };
  }

  /**
   * Sign a transfer transaction
   */
  async signTransfer(params: TransferParams): Promise<{ txInfo: string; error?: string }> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.signTransfer(
      params.toAccountIndex,
      params.usdcAmount,
      params.fee,
      params.memo,
      params.nonce
    );
    
    if (result.error) {
      return { txInfo: '', error: result.error };
    }
    
    return { txInfo: result.txInfo };
  }

  /**
   * Sign a withdraw transaction
   */
  async signWithdraw(params: WithdrawParams): Promise<{ txInfo: string; error?: string }> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.signWithdraw(
      params.usdcAmount,
      params.nonce
    );
    
    if (result.error) {
      return { txInfo: '', error: result.error };
    }
    
    return { txInfo: result.txInfo };
  }

  /**
   * Sign an update leverage transaction
   */
  async signUpdateLeverage(params: UpdateLeverageParams): Promise<{ txInfo: string; error?: string }> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.signUpdateLeverage(
      params.marketIndex,
      params.fraction,
      params.marginMode,
      params.nonce
    );
    
    if (result.error) {
      return { txInfo: '', error: result.error };
    }
    
    return { txInfo: result.txInfo };
  }

  /**
   * Create an authentication token
   */
  async createAuthToken(deadline?: number): Promise<string> {
    await this.ensureInitialized();
    
    const result = this.wasmModule.createAuthToken(deadline);
    
    if (result.error) {
      throw new Error(`Failed to create auth token: ${result.error}`);
    }
    
    return result.authToken;
  }

  /**
   * Ensure the WASM module is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Load a script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Load WASM binary
   */
  private async loadWasmBinary(path: string): Promise<ArrayBuffer> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load WASM binary: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }
}

/**
 * Create a WASM signer client instance
 */
export function createWasmSignerClient(config: WasmSignerConfig): WasmSignerClient {
  return new WasmSignerClient(config);
}

