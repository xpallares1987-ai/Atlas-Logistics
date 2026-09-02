import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export function useNotificationsWebSocket() {
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    // Derive the websocket endpoint from the active deployment mode.
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Prefer the configured API origin when present so the hook works with
    // both local Vite proxying and direct backend deployments.
    const wsUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("http", "ws") + "/ws/notifications"
      : `${protocol}//${window.location.host}/ws/notifications`;

    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected for notifications");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "CONNECTED") {
            return; // Initial ping
          }

          // Normalize backend event payloads into the toast shape used by the UI.
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

      ws.onclose = () => {
        console.log("WebSocket disconnected, reconnecting in 5s...");
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
    };
  }, [addNotification]);
}
