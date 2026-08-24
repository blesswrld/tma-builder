import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from "react";

export interface RealtimeEvent {
  type: string;
  shopId?: string;
  payload?: any;
}

type RealtimeListener = (event: RealtimeEvent) => void;

interface RealtimeContextType {
  isConnected: boolean;
  subscribeShop: (shopId: string) => void;
  addListener: (listener: RealtimeListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  subscribeShop: () => {},
  addListener: () => () => {},
});

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<RealtimeListener>>(new Set());
  const subscribedShopIdRef = useRef<string | null>(null);

  useEffect(() => {
    let reconnectTimeout: any = null;
    let retryCount = 0;

    const connect = () => {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          retryCount = 0;
          if (subscribedShopIdRef.current) {
            try {
              ws.send(JSON.stringify({ type: "subscribe", shopId: subscribedShopIdRef.current }));
            } catch {}
          }
        };

        ws.onmessage = (event) => {
          try {
            const data: RealtimeEvent = JSON.parse(event.data);
            listenersRef.current.forEach((listener) => {
              try {
                listener(data);
              } catch (e) {
                console.error("Realtime listener error:", e);
              }
            });
          } catch (e) {
            console.error("Failed to parse WS message:", e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;
          retryCount++;
          const delay = Math.min(3000 * Math.pow(1.5, Math.min(retryCount, 6)), 30000);
          reconnectTimeout = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          } catch {}
        };
      } catch (err) {
        retryCount++;
        const delay = Math.min(3000 * Math.pow(1.5, Math.min(retryCount, 6)), 30000);
        reconnectTimeout = setTimeout(connect, delay);
      }
    };

    connect();

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        } catch {}
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.close();
          } catch {}
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try {
              ws.close();
            } catch {}
          };
        }
      }
    };
  }, []);

  const subscribeShop = useCallback((shopId: string) => {
    subscribedShopIdRef.current = shopId;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", shopId }));
    }
  }, []);

  const addListener = useCallback((listener: RealtimeListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({ isConnected, subscribeShop, addListener }),
    [isConnected, subscribeShop, addListener]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);

export const useRealtimeEvent = (
  eventTypes: string | string[],
  callback: (event: RealtimeEvent) => void
) => {
  const { addListener } = useRealtime();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const remove = addListener((event) => {
      if (types.includes(event.type) || types.includes("*")) {
        callbackRef.current(event);
      }
    });
    return remove;
  }, [addListener, JSON.stringify(eventTypes)]);
};

