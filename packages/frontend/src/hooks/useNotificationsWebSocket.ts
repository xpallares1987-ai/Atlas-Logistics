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
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (!isMounted) return;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isMounted) return;
          console.log("WebSocket connected for notifications");
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "CONNECTED") return;

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
          if (!isMounted) return;
          console.log("WebSocket disconnected, reconnecting in 5s...");
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = (err) => {
          if (!isMounted) return;
          console.warn("WebSocket notification connection notice:", err);
        };
      } catch (err) {
        if (!isMounted) return;
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (ws) {
        // Detach handlers to prevent error spam during React StrictMode unmount
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    };
  }, [addNotification]);
}
