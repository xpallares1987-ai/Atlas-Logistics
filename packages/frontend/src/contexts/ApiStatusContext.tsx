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
    let consecutiveFailures = 0;
    const MAX_SILENT_FAILURES = 3;

    const backendUrl = import.meta.env.VITE_API_URL || "";

    const scheduleReconnect = () => {
      if (!mounted) return;
      consecutiveFailures += 1;
      if (consecutiveFailures >= MAX_SILENT_FAILURES) {
        setStatus("disconnected");
        return; // Circuit breaker: stop polling until window regains focus or network returns
      }
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, 30000);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    const connect = async () => {
      if (!mounted) return;

      // Quiet preflight check so we never open EventSource against an offline server
      try {
        const healthRes = await fetch(`${backendUrl}/api/health`);
        if (!healthRes.ok) {
          scheduleReconnect();
          return;
        }
        if (!mounted) return;
        setLastHeartbeat(new Date());
      } catch {
        scheduleReconnect();
        return;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`${backendUrl}/api/events`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!mounted) return;
        consecutiveFailures = 0;
        setStatus("connected");
        backoffRef.current = 2000;
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
        scheduleReconnect();
      };
    };

    const handleResume = () => {
      if (!mounted) return;
      if (consecutiveFailures >= MAX_SILENT_FAILURES) {
        consecutiveFailures = 0;
        backoffRef.current = 2000;
        connect();
      }
    };

    window.addEventListener("focus", handleResume);
    window.addEventListener("online", handleResume);
    connect();

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("online", handleResume);
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
