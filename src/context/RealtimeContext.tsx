import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

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

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          if (subscribedShopIdRef.current) {
            ws.send(JSON.stringify({ type: "subscribe", shopId: subscribedShopIdRef.current }));
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
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.warn("WebSocket error:", err);
          ws.close();
        };
      } catch (err) {
        console.warn("WebSocket creation error:", err);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    // Heartbeat ping
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const subscribeShop = (shopId: string) => {
    subscribedShopIdRef.current = shopId;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", shopId }));
    }
  };

  const addListener = (listener: RealtimeListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  };

  return (
    <RealtimeContext.Provider value={{ isConnected, subscribeShop, addListener }}>
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

