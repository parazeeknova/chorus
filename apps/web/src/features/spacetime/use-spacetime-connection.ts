"use client";

import {
  ChorusConnectionManager,
  type ConnectionConfig,
} from "@chorus/spacetime";
import {
  getConnectionFactory,
  type RealConnectionHandle,
  registerConnectionFactory,
} from "@chorus/spacetime/connection/real";
import { useCallback, useEffect, useRef, useState } from "react";

export interface SpacetimeConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  identity: string | null;
}

const CONNECTION_CONFIG: ConnectionConfig = {
  databaseName: "chorus",
  token: undefined,
  uri: "wss://maincloud.spacetimedb.com",
};

let globalConnectionManager: InstanceType<
  typeof ChorusConnectionManager
> | null = null;
let globalConnection: unknown | null = null;
let globalIdentity: string | null = null;

export function useSpacetimeConnection() {
  const [state, setState] = useState<SpacetimeConnectionState>({
    connected: false,
    connecting: false,
    identity: null,
    error: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const connect = useCallback(() => {
    if (stateRef.current.connected || stateRef.current.connecting) {
      return;
    }

    const factory = getConnectionFactory();
    if (!factory) {
      setState((prev) => ({
        ...prev,
        error:
          "SpacetimeDB module not registered. Run `spacetime generate` and import the bindings.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, connecting: true, error: null }));

    const manager = new ChorusConnectionManager(CONNECTION_CONFIG, {
      onConnect: (identity: string) => {
        globalIdentity = identity;
        globalConnectionManager = manager;
        setState({
          connected: true,
          connecting: false,
          error: null,
          identity,
        });
      },
      onConnectError: (error: Error) => {
        setState({
          connected: false,
          connecting: false,
          error: error.message,
          identity: null,
        });
      },
      onDisconnect: () => {
        globalConnectionManager = null;
        globalConnection = null;
        globalIdentity = null;
        setState({
          connected: false,
          connecting: false,
          error: null,
          identity: null,
        });
      },
    });

    const handle: RealConnectionHandle = factory(CONNECTION_CONFIG, {
      onConnect: (identity: string, token: string) => {
        manager.setConnected(identity);
        localStorage.setItem("spacetimedb_token", token);
      },
      onConnectError: (error: Error) => {
        manager.handleDisconnect(error);
      },
      onDisconnect: (error?: Error) => {
        manager.handleDisconnect(error);
      },
    });

    globalConnection = handle.connection;
  }, []);

  const disconnect = useCallback(() => {
    globalConnectionManager?.handleDisconnect();
    globalConnection = null;
    globalConnectionManager = null;
    globalIdentity = null;
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("spacetimedb_token");
    if (savedToken) {
      CONNECTION_CONFIG.token = savedToken;
    }

    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    connection: globalConnection,
    connect,
    disconnect,
  };
}

export function getActiveConnection(): unknown | null {
  return globalConnection;
}

export function getActiveIdentity(): string | null {
  return globalIdentity;
}

export function registerSpacetimeFactory(
  factory: import("@chorus/spacetime/connection/real").ConnectionFactory
): void {
  registerConnectionFactory(factory);
}
