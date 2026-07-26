import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

type ApiStatus = "connected" | "reconnecting" | "disconnected";

interface ApiStatusContextType {
  status: ApiStatus;
  lastHeartbeat: Date | null;
}

const ApiStatusContext = createContext<ApiStatusContextType | undefined>(
  undefined,
);

export function ApiStatusProvider({
  children,
  onNotification,
}: {
  children: React.ReactNode;
  onNotification?: (notification: any) => void;
}) {
  const [status, setStatus] = useState<ApiStatus>("reconnecting");
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const backoffRef = useRef(1000);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let mounted = true;

    const connect = () => {
      if (!mounted) return;

      const backendUrl = import.meta.env.VITE_API_URL || "";
      const eventSource = new EventSource(`${backendUrl}/api/events`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!mounted) return;
        setStatus("connected");
        backoffRef.current = 1000;
        setLastHeartbeat(new Date());
      };

      eventSource.onmessage = (event) => {
        if (!mounted) return;
        setLastHeartbeat(new Date());

        try {
          const data = JSON.parse(event.data);
          if (data.type === "connected") return;

          if ((data.title || data.message) && onNotification) {
            onNotification({
              id: data.id || Date.now().toString(),
              title: data.title || data.type || "Notification",
              message: data.message,
              type:
                data.type === "ALERT"
                  ? "error"
                  : data.type === "MILESTONE"
                    ? "success"
                    : data.type || "info",
              timestamp: data.timestamp || new Date().toISOString(),
              read: false,
            });
          }
        } catch (e) {
          console.error("SSE Error:", e);
        }
      };

      eventSource.onerror = () => {
        if (!mounted) return;
        eventSource.close();
        setStatus("reconnecting");

        // Secondary health check
        fetch(`${backendUrl}/api/health`)
          .then((res) => {
            if (res.ok && mounted) {
              setLastHeartbeat(new Date());
            }
          })
          .catch(() => {});

        // Schedule reconnect
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, 30000); // Max 30s

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    };

    connect();

    return () => {
      mounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [onNotification]);

  return (
    <ApiStatusContext.Provider value={{ status, lastHeartbeat }}>
      {children}
    </ApiStatusContext.Provider>
  );
}

export function useApiStatus() {
  const context = useContext(ApiStatusContext);
  if (context === undefined) {
    throw new Error("useApiStatus must be used within an ApiStatusProvider");
  }
  return context;
}
