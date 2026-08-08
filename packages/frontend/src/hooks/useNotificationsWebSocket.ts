import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export function useNotificationsWebSocket() {
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    // Connect to WebSocket using the appropriate protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // If we're in dev using Vite proxy, this goes to the same host/port.
    // However, fastify websocket might be on the backend port directly if vite proxy doesn't support WS.
    // Vite proxy usually supports WS via ws: true. Assuming /ws is proxied.
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

          // Map backend event to frontend notification
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
