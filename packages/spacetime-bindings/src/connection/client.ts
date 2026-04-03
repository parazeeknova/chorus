export interface ConnectionConfig {
  databaseName: string;
  token?: string;
  uri: string;
}

export interface ConnectionCallbacks {
  onConnect?: (identity: string, token: string) => void;
  onConnectError?: (error: Error) => void;
  onDisconnect?: (error?: Error) => void;
}

export interface SubscriptionHandle {
  isActive: () => boolean;
  isEnded: () => boolean;
  unsubscribe: () => void;
}

export interface ConnectionHandle {
  disconnect: () => void;
  identity: string | null;
  isActive: boolean;
  subscribe: (queries: string[]) => SubscriptionHandle;
  subscribeToAllTables: () => SubscriptionHandle;
}

export class ChorusConnectionManager {
  #identity: string | null = null;
  #connected = false;
  readonly #config: ConnectionConfig;
  readonly #callbacks: ConnectionCallbacks;

  constructor(config: ConnectionConfig, callbacks: ConnectionCallbacks = {}) {
    this.#config = config;
    this.#callbacks = callbacks;
  }

  setConnected(identity: string): void {
    this.#identity = identity;
    this.#connected = true;
  }

  handleDisconnect(error?: Error): void {
    this.#connected = false;
    this.#identity = null;
    this.#callbacks.onDisconnect?.(error);
  }

  get identity(): string | null {
    return this.#identity;
  }

  get isConnected(): boolean {
    return this.#connected;
  }

  get config(): ConnectionConfig {
    return this.#config;
  }
}

export function createSubscriptionHandle(handle: {
  isActive: () => boolean;
  isEnded: () => boolean;
  unsubscribe: () => void;
}): SubscriptionHandle {
  return {
    isActive: () => handle.isActive(),
    isEnded: () => handle.isEnded(),
    unsubscribe: () => handle.unsubscribe(),
  };
}

export function buildConnectionOptions(config: ConnectionConfig): {
  uri: string;
  databaseName: string;
  token?: string;
} {
  return {
    uri: config.uri,
    databaseName: config.databaseName,
    token: config.token,
  };
}
