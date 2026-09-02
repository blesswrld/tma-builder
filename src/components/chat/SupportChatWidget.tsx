import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRealtime, useRealtimeEvent } from "../../context/RealtimeContext";
import AdminDevChatTab from "../admin/AdminDevChatTab";

interface SupportChatWidgetProps {
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function SupportChatWidget({ forceOpen, onOpenChange }: SupportChatWidgetProps) {
  const { user, token } = useAuth();
  const { sendEvent } = useRealtime();

  const [isOpen, setIsOpen] = useState(false);
  const [hasEverOpened, setHasEverOpened] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [devOnline, setDevOnline] = useState<boolean>(true);
  const [showTeaser, setShowTeaser] = useState(false);

  // Sync with forceOpen if controlled
  useEffect(() => {
    if (typeof forceOpen === "boolean") {
      setIsOpen(forceOpen);
      if (forceOpen) {
        setHasEverOpened(true);
      }
    }
  }, [forceOpen]);

  const handleSetOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setHasEverOpened(true);
      setUnreadCount(0);
    }
    setShowTeaser(false);
    onOpenChange?.(open);
  };

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch("/api/chat/unread-count", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Teaser tooltip on initial load after 3 seconds if unread or new
  useEffect(() => {
    const hasSeenTeaser = sessionStorage.getItem("support_chat_teaser_dismissed");
    if (!hasSeenTeaser && !isOpen) {
      const timer = setTimeout(() => {
        setShowTeaser(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Realtime events
  useRealtimeEvent(["CHAT_MESSAGE_CREATED", "CHAT_MESSAGES_READ"], () => {
    if (!isOpen) {
      fetchUnreadCount();
    }
  });

  useRealtimeEvent(["PRESENCE_STATE", "PRESENCE_CHANGED"], (event) => {
    if (typeof event.payload?.devOnline === "boolean") {
      setDevOnline(event.payload.devOnline);
    }
  });

  // Check presence initially
  useEffect(() => {
    if (token) {
      sendEvent({ type: "get_presence" });
    }
  }, [token, sendEvent]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleSetOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!user) return null;

  return (
    <>
      {/* ========================================================= */}
      {/* FLOATING TRIGGER BUTTON & TEASER (BOTTOM RIGHT) */}
      {/* ========================================================= */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Floating Teaser Balloon */}
        <AnimatePresence>
          {showTeaser && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative max-w-xs bg-app-card border border-app-border text-app-primary p-3 rounded-2xl shadow-xl backdrop-blur-md text-xs space-y-1.5 cursor-pointer"
              onClick={() => handleSetOpen(true)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTeaser(false);
                  sessionStorage.setItem("support_chat_teaser_dismissed", "1");
                }}
                className="absolute top-2 right-2 text-app-muted hover:text-app-primary p-0.5 rounded-full hover:bg-app-hover transition"
              >
                <X size={12} />
              </button>

              <div className="flex items-center gap-1.5 text-emerald-500 font-semibold text-[11px]">
                <Sparkles size={13} />
                <span>Поддержка 24/7</span>
              </div>
              <p className="text-app-muted text-[11px] leading-relaxed pr-3">
                Есть вопрос или предложение? Напишите напрямую разработчику платформы!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Button */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleSetOpen(!isOpen)}
          className={`relative flex items-center gap-2.5 px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-full shadow-xl transition-all cursor-pointer select-none border ${
            isOpen
              ? "bg-app-card text-app-primary border-app-border hover:bg-app-hover shadow-lg"
              : "bg-app-accent text-app-accent-fg border-app-border/20 shadow-lg hover:opacity-95"
          }`}
          title="Онлайн-чат поддержка 24/7"
        >
          {/* Main Icon */}
          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <X size={20} className="stroke-[2.2]" />
            ) : (
              <MessageSquare size={20} className="stroke-[2.2]" />
            )}

            {/* Live Online Dot */}
            {!isOpen && (
              <span
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-app-card ${
                  devOnline ? "bg-emerald-400 animate-pulse" : "bg-app-muted"
                }`}
                title={devOnline ? "Разработчик онлайн" : "Поддержка 24/7"}
              />
            )}
          </div>

          {/* Label (Desktop / Tablet) */}
          <div className="hidden sm:flex flex-col text-left leading-tight">
            <span className="text-xs font-bold tracking-wide">
              {isOpen ? "Свернуть" : "Поддержка 24/7"}
            </span>
            {!isOpen && (
              <span className="text-[10px] opacity-90 flex items-center gap-1 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${devOnline ? "bg-emerald-400 animate-pulse" : "bg-app-muted"}`} />
                {devOnline ? "В сети онлайн" : "На связи 24/7"}
              </span>
            )}
          </div>

          {/* Unread Messages Badge */}
          {unreadCount > 0 && !isOpen && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow-md border-2 border-app-card"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* ========================================================= */}
      {/* FLOATING CHAT WINDOW MODAL (PERSISTENT & ULTRA FAST) */}
      {/* ========================================================= */}
      {hasEverOpened && (
        <>
          {/* Mobile Backdrop */}
          <div
            onClick={() => handleSetOpen(false)}
            className={`sm:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-200 ${
              isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          />

          {/* Floating Chat Container */}
          <div
            className={`fixed inset-x-2 bottom-20 top-16 sm:inset-auto sm:bottom-22 sm:right-6 sm:w-[460px] sm:h-[640px] sm:max-h-[85vh] z-50 bg-app-card border border-app-border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ease-out origin-bottom-right ${
              isOpen
                ? "opacity-100 scale-100 pointer-events-auto translate-y-0"
                : "opacity-0 scale-95 pointer-events-none translate-y-3"
            }`}
          >
            <AdminDevChatTab isFloatingMode={true} onClose={() => handleSetOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
