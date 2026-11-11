import { useEffect, useRef, useCallback } from "react";

export interface AppWebSocketOptions {
  onMessage?: (data: any, rawEvent: MessageEvent) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  autoReconnect?: boolean;
  heartbeatIntervalMs?: number;
  heartbeatMessage?: string | object;
  enabled?: boolean;
}

export function resolveWebSocketUrl(
  path: string,
  apiUrl?: string,
  windowLocation?: { protocol: string; host: string },
): string {
  if (path.startsWith("ws://") || path.startsWith("wss://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (apiUrl) {
    return apiUrl.replace(/^http/, "ws") + cleanPath;
  }
  const protocol = windowLocation?.protocol === "https:" ? "wss:" : "ws:";
  const host = windowLocation?.host || "localhost:3000";
  return `${protocol}//${host}${cleanPath}`;
}

export function useAppWebSocket(
  path: string,
  options: AppWebSocketOptions = {},
) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    autoReconnect = true,
    heartbeatIntervalMs = 25000,
    heartbeatMessage = { type: "PING" },
    enabled = true,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Store latest handlers in ref (escape-hatch pattern) so effect never tears down
  // when component props/callbacks change
  const handlersRef = useRef({ onMessage, onOpen, onClose, onError });
  handlersRef.current = { onMessage, onOpen, onClose, onError };

  const getWsUrl = useCallback((relativeOrAbsolute: string) => {
    const loc = typeof window !== "undefined" ? window.location : undefined;
    const apiUrl =
      typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env.VITE_API_URL
        : undefined;
    return resolveWebSocketUrl(relativeOrAbsolute, apiUrl, loc);
  }, []);

  const cleanupSocket = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      const socket = wsRef.current;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;

      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.close(1000, "Clean cleanup");
        } catch {
          // Ignore clean close errors
        }
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.onopen = () => {
          try {
            socket.close(1000, "Clean unmount");
          } catch {
            // Ignore
          }
        };
      }
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((msg: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const payload = typeof msg === "string" ? msg : JSON.stringify(msg);
        wsRef.current.send(payload);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    isMountedRef.current = true;
    const url = getWsUrl(path);

    const scheduleReconnect = () => {
      if (!isMountedRef.current || !autoReconnect || reconnectTimerRef.current)
        return;
      reconnectAttemptsRef.current++;
      if (reconnectAttemptsRef.current > 4) {
        return; // Circuit breaker: avoid unbounded reconnect loops
      }

      const delay = Math.min(
        2000 * Math.pow(1.6, reconnectAttemptsRef.current - 1),
        15000,
      );
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (isMountedRef.current) {
          connect();
        }
      }, delay);
    };

    const connect = () => {
      if (!isMountedRef.current) return;
      cleanupSocket();

      try {
        const socket = new WebSocket(url);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isMountedRef.current) return;
          reconnectAttemptsRef.current = 0;
          handlersRef.current.onOpen?.();

          // Heartbeat keep-alive
          if (heartbeatIntervalMs > 0) {
            heartbeatTimerRef.current = setInterval(() => {
              if (
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN
              ) {
                try {
                  const pingPayload =
                    typeof heartbeatMessage === "string"
                      ? heartbeatMessage
                      : JSON.stringify(heartbeatMessage);
                  wsRef.current.send(pingPayload);
                } catch {
                  // Heartbeat failed
                }
              }
            }, heartbeatIntervalMs);
          }
        };

        socket.onmessage = (event: MessageEvent) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            if (
              data.type === "CONNECTED" ||
              data.type === "HEARTBEAT" ||
              data.type === "PONG"
            ) {
              return;
            }
            handlersRef.current.onMessage?.(data, event);
          } catch {
            handlersRef.current.onMessage?.(event.data, event);
          }
        };

        socket.onclose = (event: CloseEvent) => {
          if (!isMountedRef.current) return;
          handlersRef.current.onClose?.(event);
          scheduleReconnect();
        };

        socket.onerror = (err: Event) => {
          if (!isMountedRef.current) return;
          handlersRef.current.onError?.(err);
        };
      } catch {
        scheduleReconnect();
      }
    };

    // Stagger connect on idle / microtask to not block the main-thread initial render
    let initTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      initTimer = null;
      if (isMountedRef.current) {
        connect();
      }
    }, 40);

    return () => {
      isMountedRef.current = false;
      if (initTimer) {
        clearTimeout(initTimer);
        initTimer = null;
      }
      cleanupSocket();
    };
  }, [
    path,
    enabled,
    autoReconnect,
    heartbeatIntervalMs,
    getWsUrl,
    cleanupSocket,
  ]);

  return { sendMessage, wsRef };
}
