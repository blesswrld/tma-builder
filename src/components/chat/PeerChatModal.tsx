import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Trash2,
  Store,
  User,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeEvent } from "../../context/RealtimeContext";
import { PeerMessage } from "../../types";

interface PeerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId?: string;
  receiverName?: string;
  shopId?: string;
  shopName?: string;
}

export const PeerChatModal: React.FC<PeerChatModalProps> = ({
  isOpen,
  onClose,
  receiverId,
  receiverName,
  shopId,
  shopName
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PeerMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const effectiveShopId = shopId || receiverId;

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const markAsRead = useCallback(async () => {
    if (!effectiveShopId) return;
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      await fetch("/api/chat/peer/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ shopId: effectiveShopId })
      });
    } catch {}
  }, [effectiveShopId]);

  const fetchMessages = useCallback(async (quiet = false) => {
    if (!effectiveShopId) return;
    if (!quiet) setLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/chat/peer/messages?shopId=${effectiveShopId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        markAsRead();
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [effectiveShopId, markAsRead]);

  useEffect(() => {
    if (isOpen && effectiveShopId) {
      fetchMessages();
      const interval = setInterval(() => fetchMessages(true), 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen, effectiveShopId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time events
  useRealtimeEvent("PEER_CHAT_MESSAGE_CREATED", (event) => {
    if (isOpen && effectiveShopId && event.shopId === effectiveShopId && event.payload) {
      const msg: PeerMessage = event.payload;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.senderRole === "SELLER") {
        markAsRead();
      }
    }
  });

  useRealtimeEvent("PEER_CHAT_MESSAGES_READ", (event) => {
    if (isOpen && effectiveShopId && event.shopId === effectiveShopId && event.payload) {
      const { readerRole } = event.payload;
      if (readerRole === "SELLER") {
        setMessages((prev) =>
          prev.map((m) => (m.senderRole === "BUYER" ? { ...m, isRead: true } : m))
        );
      }
    }
  });

  useRealtimeEvent("PEER_CHAT_MESSAGE_DELETED", (event) => {
    if (isOpen && effectiveShopId && event.shopId === effectiveShopId && event.payload) {
      const { messageId } = event.payload;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  });

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !effectiveShopId || sending) return;

    setSending(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/chat/peer/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          shopId: effectiveShopId,
          text: text.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось отправить сообщение");
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setText("");
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/chat/peer/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        // Notification inbox sync dispatched
        window.dispatchEvent(new CustomEvent("chat_message_deleted", { detail: { messageId } }));
      }
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-lg h-[92vh] sm:h-[600px] bg-app-surface border border-app-border rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="p-4 border-b border-app-border flex items-center justify-between bg-app-card/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-app-card border border-app-border flex items-center justify-center text-app-primary">
              <MessageSquare size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-app-primary flex items-center gap-1.5">
                <span>{receiverName || shopName || "Продавец"}</span>
                {shopName && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-app-surface rounded border border-app-border font-mono text-app-muted">
                    {shopName}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-app-muted font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-app-primary animate-pulse" />
                <span>Чат защищен антифродом</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-app-muted hover:text-app-primary rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-app-bg/50">
          {loading ? (
            <div className="h-full flex items-center justify-center text-app-muted text-xs font-mono">
              <Loader2 size={20} className="animate-spin text-app-primary mr-2" />
              <span>Загрузка диалога...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-app-muted">
              <MessageSquare size={36} className="text-app-border" />
              <p className="text-xs font-semibold text-app-primary">
                Начните диалог с {receiverName || shopName || "продавцом"}
              </p>
              <p className="text-[11px] max-w-xs">
                Уточните детали заказа, условия доставки или задайте интересующие вопросы.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 group ${isMine ? "justify-end" : "justify-start"}`}
                >
                  {isMine && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-app-muted hover:text-rose-500 transition-opacity cursor-pointer"
                      title="Удалить сообщение"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <div
                    className={`max-w-[78%] p-3 rounded-2xl text-xs space-y-1 ${
                      isMine
                        ? "bg-app-accent text-app-accent-fg rounded-br-xs shadow-xs"
                        : "bg-app-card text-app-primary border border-app-border rounded-bl-xs shadow-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.text}</p>
                    <div
                      className={`text-[9px] font-mono flex items-center justify-end gap-1 ${
                        isMine ? "text-app-accent-fg/80" : "text-app-muted"
                      }`}
                    >
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      {isMine && (
                        <span>
                          {msg.isRead ? <CheckCheck size={11} /> : <Check size={11} />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="px-4 py-2 bg-rose-500/15 border-t border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert size={14} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-app-border bg-app-surface flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1 bg-app-card border border-app-border rounded-2xl px-4 py-2.5 text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-border-focus"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="w-10 h-10 rounded-2xl bg-app-accent hover:opacity-90 text-app-accent-fg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};
