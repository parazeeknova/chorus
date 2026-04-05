import type { ConnectionCallbacks, ConnectionConfig } from "@chorus/spacetime";
import {
  type RealConnectionHandle,
  registerConnectionFactory,
} from "@chorus/spacetime/connection/real";

interface BuiltConnection {
  disconnect: () => void;
  identity?: { toHexString: () => string };
  subscriptionBuilder: () => {
    subscribe: (queries: string[]) => {
      isActive: () => boolean;
      isEnded: () => boolean;
      unsubscribe: () => void;
    };
    subscribeToAllTables: () => {
      isActive: () => boolean;
      isEnded: () => boolean;
      unsubscribe: () => void;
    };
  };
}

interface ModuleBuilder {
  build: () => BuiltConnection;
  onConnect: (
    cb: (
      _conn: BuiltConnection,
      identity: { toHexString: () => string },
      token: string
    ) => void
  ) => ModuleBuilder;
  onConnectError: (cb: (ctx: unknown, error: Error) => void) => ModuleBuilder;
  onDisconnect: (cb: (ctx: unknown, error?: Error) => void) => ModuleBuilder;
  withDatabaseName: (name: string) => ModuleBuilder;
  withToken: (token?: string) => ModuleBuilder;
  withUri: (uri: string | URL) => ModuleBuilder;
}

interface ModuleDbConnection {
  builder: () => ModuleBuilder;
}

export function registerSpacetimeModule({ builder }: ModuleDbConnection): void {
  registerConnectionFactory(
    (
      config: ConnectionConfig,
      callbacks: ConnectionCallbacks
    ): RealConnectionHandle => {
      const b: ModuleBuilder = builder()
        .withUri(config.uri)
        .withDatabaseName(config.databaseName);

      if (config.token) {
        b.withToken(config.token);
      }

      b.onConnect((_conn, identity, token) => {
        callbacks.onConnect?.(identity.toHexString(), token);
      });

      b.onConnectError((_ctx: unknown, err: Error) => {
        callbacks.onConnectError?.(err);
      });

      b.onDisconnect((_ctx: unknown, err?: Error) => {
        callbacks.onDisconnect?.(err);
      });

      const connection = b.build();

      return {
        connection,
        disconnect: () => {
          connection.disconnect();
        },
        get identity(): string | null {
          return connection.identity?.toHexString() ?? null;
        },
        get isActive(): boolean {
          return connection.identity !== null;
        },
        subscribe: (queries: string[]) => {
          const sub = connection.subscriptionBuilder().subscribe(queries);
          return {
            isActive: () => sub.isActive(),
            isEnded: () => sub.isEnded(),
            unsubscribe: () => sub.unsubscribe(),
          };
        },
        subscribeToAllTables: () => {
          const sub = connection.subscriptionBuilder().subscribeToAllTables();
          return {
            isActive: () => sub.isActive(),
            isEnded: () => sub.isEnded(),
            unsubscribe: () => sub.unsubscribe(),
          };
        },
      };
    }
  );
}

export type { DbConnection as SpacetimeDbConnection } from "@chorus/spacetime/generated";
