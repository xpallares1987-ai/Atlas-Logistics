import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export function useNotificationsWebSocket() {
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    let isMounted = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("http", "ws") + "/ws/notifications"
      : `${protocol}//${window.location.host}/ws/notifications`;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectAttempts = 0;

    const cleanupSocket = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          try {
            ws.close();
          } catch {
            // Safe cleanup
          }
        }
        ws = null;
      }
    };

    const scheduleReconnect = () => {
      if (!isMounted || reconnectTimer) return;
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (!isMounted) return;

      // Always close previous dangling or connecting sockets before opening a new one
      cleanupSocket();

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isMounted) return;
          reconnectAttempts = 0;
          console.log("WebSocket connected for notifications");

          // Keep connection alive across Vite proxy / network timeouts
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          heartbeatTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "PING" }));
              } catch {
                // Heartbeat send failed, let onclose handle it
              }
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            // Ignore system protocol control frames
            if (
              data.type === "CONNECTED" ||
              data.type === "HEARTBEAT" ||
              data.type === "PONG"
            ) {
              return;
            }

            addNotification({
              id: crypto.randomUUID(),
              title:
                data.type === "VESSEL_LOCATION_UPDATE"
                  ? "Tracking Update"
                  : data.type || "System Alert",
              message: data.message,
              type:
                data.type === "ALERT"
                  ? "error"
                  : data.type === "MILESTONE"
                    ? "success"
                    : "info",
              timestamp: new Date().toISOString(),
              read: false,
            });
          } catch (e) {
            console.error("Failed to parse websocket message", e);
          }
        };

        ws.onclose = (event) => {
          if (!isMounted) return;
          console.debug(
            `WebSocket closed (code: ${event.code}), scheduling reconnect...`,
          );
          scheduleReconnect();
        };

        ws.onerror = (err) => {
          if (!isMounted) return;
          // Silent/debug log to prevent noisy devtools console warnings during restarts/reconnects
          console.debug("WebSocket transient notice:", err);
        };
      } catch (err) {
        if (!isMounted) return;
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      cleanupSocket();
    };
  }, [addNotification]);
}
