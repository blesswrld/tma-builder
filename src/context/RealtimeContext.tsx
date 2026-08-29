import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from "react";

export interface RealtimeEvent {
  type: string;
  shopId?: string;
  userId?: string;
  payload?: any;
}

type RealtimeListener = (event: RealtimeEvent) => void;

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
  subscribeShop: (shopId: string) => void;
  subscribeShops: (shopIds: string[]) => void;
  unsubscribeShop: (shopId: string) => void;
  addListener: (listener: RealtimeListener) => () => void;
  sendEvent: (data: any) => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  lastEvent: null,
  subscribeShop: () => {},
  subscribeShops: () => {},
  unsubscribeShop: () => {},
  addListener: () => () => {},
  sendEvent: () => {},
});

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<RealtimeListener>>(new Set());
  const subscribedShopsRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<any>(null);
  const isManuallyClosedRef = useRef(false);

  const sendEvent = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(typeof data === "string" ? data : JSON.stringify(data));
      } catch (e) {
        console.error("Failed to send WS message:", e);
      }
    }
  }, []);

  const authenticateWS = useCallback(() => {
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      if (token && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "auth", token }));
      }
    } catch {}
  }, []);

  const resubscribeAll = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      authenticateWS();
      const shopIds = Array.from(subscribedShopsRef.current);
      if (shopIds.length > 0) {
        try {
          wsRef.current.send(JSON.stringify({ type: "subscribe", shopIds }));
        } catch {}
      }
    }
  }, [authenticateWS]);

  useEffect(() => {
    let retryCount = 0;
    isManuallyClosedRef.current = false;

    const connect = () => {
      if (isManuallyClosedRef.current) return;
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
          resubscribeAll();

          // Dispatch reconnect event for state reconciliation
          const reconnectedEvent: RealtimeEvent = { type: "REALTIME_RECONNECTED", payload: { timestamp: Date.now() } };
          listenersRef.current.forEach((listener) => {
            try {
              listener(reconnectedEvent);
            } catch (e) {
              console.error("Realtime listener error:", e);
            }
          });
        };

        ws.onmessage = (event) => {
          try {
            const data: RealtimeEvent = JSON.parse(event.data);
            if (data.type !== "pong" && data.type !== "connected" && data.type !== "AUTH_SUCCESS") {
              setLastEvent(data);
            }
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
          if (!isManuallyClosedRef.current) {
            retryCount++;
            const delay = Math.min(1000 * Math.pow(1.3, Math.min(retryCount, 7)), 12000);
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
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
        const delay = Math.min(1000 * Math.pow(1.3, Math.min(retryCount, 7)), 12000);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    connect();

    // Heartbeat ping
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        } catch {}
      }
    }, 25000);

    // Also listen to storage events if token changes (e.g. login in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_token" || e.key === "token") {
        authenticateWS();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      isManuallyClosedRef.current = true;
      clearInterval(pingInterval);
      window.removeEventListener("storage", handleStorageChange);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        } catch {}
      }
    };
  }, [resubscribeAll, authenticateWS]);

  const subscribeShop = useCallback((shopId: string) => {
    if (!shopId) return;
    subscribedShopsRef.current.add(shopId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "subscribe", shopId }));
      } catch {}
    }
  }, []);

  const subscribeShops = useCallback((shopIds: string[]) => {
    if (!Array.isArray(shopIds) || shopIds.length === 0) return;
    shopIds.forEach(id => { if (id) subscribedShopsRef.current.add(id); });
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "subscribe", shopIds }));
      } catch {}
    }
  }, []);

  const unsubscribeShop = useCallback((shopId: string) => {
    if (!shopId) return;
    subscribedShopsRef.current.delete(shopId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "unsubscribe", shopId }));
      } catch {}
    }
  }, []);

  const addListener = useCallback((listener: RealtimeListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({
      isConnected,
      lastEvent,
      subscribeShop,
      subscribeShops,
      unsubscribeShop,
      addListener,
      sendEvent
    }),
    [isConnected, lastEvent, subscribeShop, subscribeShops, unsubscribeShop, addListener, sendEvent]
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


