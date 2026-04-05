import type {
  ConnectionCallbacks,
  ConnectionConfig,
  ConnectionHandle,
  SubscriptionHandle,
} from "./client";

export interface SpacetimeModuleBindings {
  DbConnection: {
    builder: () => unknown;
  };
}

export interface RealConnectionHandle extends ConnectionHandle {
  connection: unknown;
}

export type ConnectionFactory = (
  config: ConnectionConfig,
  callbacks: ConnectionCallbacks
) => RealConnectionHandle;

let _factory: ConnectionFactory | null = null;

export function registerConnectionFactory(factory: ConnectionFactory): void {
  _factory = factory;
}

export function getConnectionFactory(): ConnectionFactory | null {
  return _factory;
}

export function createRealConnection(
  config: ConnectionConfig,
  callbacks: ConnectionCallbacks = {}
): RealConnectionHandle {
  if (!_factory) {
    throw new Error(
      "No SpacetimeDB connection factory registered. " +
        "Run `spacetime generate` to produce module bindings, then import " +
        "registerSpacetimeModule from the generated output before connecting."
    );
  }
  return _factory(config, callbacks);
}

export function wrapSubscription(sub: {
  isActive: () => boolean;
  isEnded: () => boolean;
  unsubscribe: () => void;
}): SubscriptionHandle {
  return {
    isActive: () => sub.isActive(),
    isEnded: () => sub.isEnded(),
    unsubscribe: () => sub.unsubscribe(),
  };
}
