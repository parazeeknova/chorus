import { useEffect, useRef, useState } from "react";
import type { LspConnectionConfig } from "../types";

interface UseLspState {
  connected: boolean;
  error: string | null;
}

export function useLsp(config?: LspConnectionConfig) {
  const [state, setState] = useState<UseLspState>({
    connected: false,
    error: null,
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!config?.wsUrl) {
      return;
    }

    const ws = new WebSocket(config.wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setState({ connected: true, error: null });
    };

    ws.onclose = () => {
      setState({ connected: false, error: null });
    };

    ws.onerror = () => {
      setState({
        connected: false,
        error: `Failed to connect to LSP server at ${config.wsUrl}`,
      });
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [config?.wsUrl]);

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setState({ connected: false, error: null });
  };

  return {
    connected: state.connected,
    error: state.error,
    disconnect,
    socket: wsRef.current,
  };
}
