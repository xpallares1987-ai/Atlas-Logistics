import { useState, useEffect } from 'react';

interface LiveStatus {
  activeShipments: number;
  pendingReceptions: number;
  alerts: number;
  lastUpdated: string;
}

export function useLiveUpdates() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect in browser environment
    if (typeof window === 'undefined') return;

    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let isComponentMounted = true;

    const connect = () => {
      if (!isComponentMounted) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const isGitHubPages = window.location.hostname.includes('github.io');
      const wsUrl = isGitHubPages
        ? '' // No WS on GitHub Pages
        : process.env.NODE_ENV === 'production'
        ? `${wsProtocol}//${window.location.host}/ws/updates`
        : 'ws://localhost:3000/ws/updates';

      if (!wsUrl) {
        console.warn('WebSocket disabled in GitHub Pages deployment');
        return; // skip connection
      }

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isComponentMounted) return;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'LOGISTICS_UPDATE' && data.payload) {
            setStatus({
              ...data.payload,
              lastUpdated: data.timestamp,
            });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      ws.onclose = () => {
        if (!isComponentMounted) return;
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };
    };

    connect();

    return () => {
      isComponentMounted = false;
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return { status, isConnected };
}
