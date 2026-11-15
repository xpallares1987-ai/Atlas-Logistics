import { useAppStore } from "../store/useAppStore";
import { useAppWebSocket } from "./useAppWebSocket";

export function useNotificationsWebSocket() {
  const addNotification = useAppStore((state) => state.addNotification);

  useAppWebSocket("/ws/notifications", {
    onOpen: () => {
      console.info("WebSocket connected for notifications");
    },
    onMessage: (raw) => {
      if (!raw || typeof raw !== "object") return;
      const data = raw as { type?: string; message?: string };
      addNotification({
        id: crypto.randomUUID(),
        title:
          data.type === "VESSEL_LOCATION_UPDATE"
            ? "Tracking Update"
            : data.type || "System Alert",
        message: data.message || "Notification received",
        type:
          data.type === "ALERT"
            ? "error"
            : data.type === "MILESTONE"
              ? "success"
              : "info",
        timestamp: new Date().toISOString(),
        read: false,
      });
    },
  });
}
