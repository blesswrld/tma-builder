import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Loader2,
  Trash2,
  Check,
  CheckCheck,
  User,
  Store,
  RefreshCw,
  Sparkles,
  Clock,
  ChevronLeft,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeEvent } from "../../context/RealtimeContext";
import { Shop } from "../../types";

interface PeerMessage {
  id: string;
  shopId: string;
  buyerId: string;
  senderId: string;
  senderRole: "BUYER" | "SELLER";
  senderName?: string | null;
  text?: string | null;
  mediaUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface Conversation {
  buyerId: string;
  lastMessage: PeerMessage;
  unreadCount: number;
  messagesCount: number;
  buyer: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
    telegramHandle?: string | null;
  };
}

interface AdminShopChatTabProps {
  selectedShop: Shop | null;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

const QUICK_REPLIES = [
  "Здравствуйте! Рады приветствовать вас. Чем можем помочь? 😊",
  "Ваш заказ уже принят и передан на кухню / в сборку! 🍳",
  "Курьер уже выехал с вашим заказом! 🛵",
  "Заказ готов к выдаче! Ждем вас 🛍️",
  "Спасибо за заказ! Будем рады видеть вас снова ⭐"
];

export const AdminShopChatTab: React.FC<AdminShopChatTabProps> = ({
  selectedShop,
  showToast
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeBuyerId, setActiveBuyerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PeerMessage[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConversation = conversations.find(c => c.buyerId === activeBuyerId);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  // 1. Fetch conversations for the shop
  const fetchConversations = useCallback(async (quiet = false) => {
    if (!selectedShop?.id) return;
    if (!quiet) setLoadingConvos(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/chat/peer/conversations?shopId=${selectedShop.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        
        // If there's an active buyer, or pick the first if none selected on desktop
        if (!activeBuyerId && data.conversations && data.conversations.length > 0) {
          if (window.innerWidth >= 768) {
            setActiveBuyerId(data.conversations[0].buyerId);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    } finally {
      if (!quiet) setLoadingConvos(false);
    }
  }, [selectedShop?.id, activeBuyerId]);

  // 2. Fetch messages for active conversation
  const fetchMessages = useCallback(async (buyerId: string, quiet = false) => {
    if (!selectedShop?.id || !buyerId) return;
    if (!quiet) setLoadingMessages(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/chat/peer/messages?shopId=${selectedShop.id}&buyerId=${buyerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        
        // Mark as read
        fetch(`/api/chat/peer/read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ shopId: selectedShop.id, buyerId })
        }).catch(() => {});

        // Local unread count clear
        setConversations(prev =>
          prev.map(c => c.buyerId === buyerId ? { ...c, unreadCount: 0 } : c)
        );
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }, [selectedShop?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeBuyerId) {
      fetchMessages(activeBuyerId);
    } else {
      setMessages([]);
    }
  }, [activeBuyerId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Realtime event handlers
  useRealtimeEvent("PEER_CHAT_MESSAGE_CREATED", (event) => {
    if (event.shopId === selectedShop?.id) {
      const msg: PeerMessage = event.payload;
      if (!msg) return;

      // Update conversations
      setConversations(prev => {
        const exists = prev.find(c => c.buyerId === msg.buyerId);
        if (exists) {
          return prev.map(c => {
            if (c.buyerId === msg.buyerId) {
              return {
                ...c,
                lastMessage: msg,
                messagesCount: c.messagesCount + 1,
                unreadCount: (activeBuyerId === msg.buyerId || msg.senderRole === "SELLER")
                  ? c.unreadCount
                  : c.unreadCount + 1
              };
            }
            return c;
          });
        } else {
          // New conversation
          fetchConversations(true);
          return prev;
        }
      });

      // If viewing active chat, append message
      if (activeBuyerId === msg.buyerId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        
        // Auto mark as read if seller is currently viewing
        if (msg.senderRole === "BUYER") {
          const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
          fetch(`/api/chat/peer/read`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ shopId: selectedShop.id, buyerId: msg.buyerId })
          }).catch(() => {});
        }
      }
    }
  });

  useRealtimeEvent("PEER_CHAT_MESSAGES_READ", (event) => {
    if (event.shopId === selectedShop?.id && event.payload) {
      const { buyerId, readerRole } = event.payload;
      if (readerRole === "BUYER" && activeBuyerId === buyerId) {
        setMessages(prev =>
          prev.map(m => m.senderRole === "SELLER" ? { ...m, isRead: true } : m)
        );
      }
    }
  });

  useRealtimeEvent("PEER_CHAT_MESSAGE_DELETED", (event) => {
    if (event.shopId === selectedShop?.id && event.payload) {
      const { messageId, buyerId } = event.payload;
      if (activeBuyerId === buyerId) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
      fetchConversations(true);
    }
  });

  // 4. Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeBuyerId || !selectedShop?.id || sending) return;

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
          shopId: selectedShop.id,
          buyerId: activeBuyerId,
          text
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось отправить сообщение");
      }

      setMessages(prev => [...prev.filter(m => m.id !== data.message.id), data.message]);
      setInputText("");
      inputRef.current?.focus();

      // Update conversations list
      setConversations(prev =>
        prev.map(c => c.buyerId === activeBuyerId ? { ...c, lastMessage: data.message } : c)
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка отправки сообщения");
      showToast?.(err.message || "Ошибка отправки", "error");
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
        setMessages(prev => prev.filter(m => m.id !== messageId));
        showToast?.("Сообщение удалено", "info");
      }
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (c.buyer?.name || "").toLowerCase();
    const email = (c.buyer?.email || "").toLowerCase();
    const tg = (c.buyer?.telegramHandle || "").toLowerCase();
    const last = (c.lastMessage?.text || "").toLowerCase();
    return name.includes(q) || email.includes(q) || tg.includes(q) || last.includes(q);
  });

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!selectedShop) {
    return (
      <div className="p-8 text-center text-app-muted bg-app-surface border border-app-border rounded-3xl">
        <Store className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-mono text-sm">Выберите заведение для просмотра чатов с клиентами</p>
      </div>
    );
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-3xl overflow-hidden shadow-sm flex flex-col h-[750px] max-h-[85vh]">
      {/* Top Header Bar */}
      <div className="px-5 py-4 border-b border-app-border flex items-center justify-between bg-app-card/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-app-accent text-app-accent-fg flex items-center justify-center font-bold shadow-sm shrink-0">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono text-app-primary">
                Чат заведения «{selectedShop.name}»
              </h3>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-mono font-bold animate-pulse">
                  +{totalUnreadCount} новых
                </span>
              )}
            </div>
            <p className="text-[11px] text-app-muted font-sans mt-0.5">
              Прямая переписка с клиентами и покупателями в режиме реального времени
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchConversations();
            if (activeBuyerId) fetchMessages(activeBuyerId);
          }}
          className="p-2 text-app-muted hover:text-app-primary bg-app-card hover:bg-app-surface border border-app-border rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          title="Обновить диалоги"
        >
          <RefreshCw size={14} className={loadingConvos ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      {/* Main Split Body: Sidebar Convos List + Chat Thread */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Conversations List */}
        <div
          className={`w-full md:w-80 border-r border-app-border flex flex-col bg-app-card/20 shrink-0 ${
            activeBuyerId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-app-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск по клиентам..."
                className="w-full pl-8 pr-3 py-2 bg-app-card border border-app-border rounded-xl text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-accent font-sans"
              />
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-app-border/40 p-1.5 space-y-1">
            {loadingConvos && conversations.length === 0 ? (
              <div className="p-8 text-center text-app-muted flex flex-col items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin text-app-accent" />
                <span className="text-xs font-mono">Загрузка диалогов...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-app-muted">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-mono">
                  {searchQuery ? "Ничего не найдено" : "Пока нет диалогов с клиентами"}
                </p>
                <p className="text-[10px] mt-1 text-app-muted">
                  Когда покупатель напишет со страницы заведения, сообщение появится здесь.
                </p>
              </div>
            ) : (
              filteredConversations.map(c => {
                const isActive = c.buyerId === activeBuyerId;
                const buyerName = c.buyer?.name || "Покупатель";
                const isSellerLast = c.lastMessage?.senderRole === "SELLER";
                const date = new Date(c.lastMessage?.createdAt || Date.now());
                const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

                return (
                  <button
                    key={c.buyerId}
                    type="button"
                    onClick={() => setActiveBuyerId(c.buyerId)}
                    className={`w-full p-3 rounded-2xl text-left transition-all flex items-start gap-3 cursor-pointer ${
                      isActive
                        ? "bg-app-accent/15 border border-app-accent/30 text-app-primary shadow-xs"
                        : "hover:bg-app-card/80 border border-transparent text-app-muted hover:text-app-primary"
                    }`}
                  >
                    {/* Buyer Avatar */}
                    {c.buyer?.avatarUrl ? (
                      <img
                        src={c.buyer.avatarUrl}
                        alt={buyerName}
                        className="w-10 h-10 rounded-xl object-cover border border-app-border shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-primary font-mono font-bold text-sm shrink-0">
                        {buyerName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold font-mono text-app-primary truncate">
                          {buyerName}
                        </span>
                        <span className="text-[10px] font-mono text-app-muted shrink-0">
                          {timeStr}
                        </span>
                      </div>

                      <p className="text-xs font-sans text-app-muted truncate line-clamp-1">
                        {isSellerLast && <span className="text-app-accent font-semibold">Вы: </span>}
                        {c.lastMessage?.text || "Вложение..."}
                      </p>

                      {c.buyer?.telegramHandle && (
                        <div className="text-[10px] font-mono text-sky-400 mt-1 flex items-center gap-1">
                          <span>@{c.buyer.telegramHandle.replace(/^@/, "")}</span>
                        </div>
                      )}
                    </div>

                    {c.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-mono font-bold shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat View */}
        <div
          className={`flex-1 flex flex-col bg-app-surface overflow-hidden ${
            !activeBuyerId ? "hidden md:flex items-center justify-center" : "flex"
          }`}
        >
          {!activeBuyerId ? (
            <div className="p-8 text-center text-app-muted max-w-sm">
              <div className="w-16 h-16 rounded-3xl bg-app-card border border-app-border flex items-center justify-center mx-auto mb-4 text-app-primary">
                <MessageSquare size={28} />
              </div>
              <h4 className="text-sm font-bold font-mono text-app-primary mb-1">
                Выберите диалог с клиентом
              </h4>
              <p className="text-xs text-app-muted font-sans">
                Здесь будут отображаться сообщения от покупателей. Вы сможете оперативно отвечать на вопросы о заказах и меню.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-5 py-3.5 border-b border-app-border flex items-center justify-between bg-app-card/30">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setActiveBuyerId(null)}
                    className="md:hidden p-1.5 -ml-1 text-app-muted hover:text-app-primary rounded-xl cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {activeConversation?.buyer?.avatarUrl ? (
                    <img
                      src={activeConversation.buyer.avatarUrl}
                      alt={activeConversation.buyer.name || "Buyer"}
                      className="w-9 h-9 rounded-xl object-cover border border-app-border shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-primary font-mono font-bold text-xs shrink-0">
                      {(activeConversation?.buyer?.name || "П").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-app-primary">
                        {activeConversation?.buyer?.name || "Покупатель"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">
                        Клиент
                      </span>
                    </div>
                    <div className="text-[10px] text-app-muted font-mono flex items-center gap-2">
                      {activeConversation?.buyer?.email && (
                        <span>{activeConversation.buyer.email}</span>
                      )}
                      {activeConversation?.buyer?.telegramHandle && (
                        <span className="text-sky-400">
                          @{activeConversation.buyer.telegramHandle.replace(/^@/, "")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-app-muted flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Онлайн</span>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-app-surface/50">
                {loadingMessages && messages.length === 0 ? (
                  <div className="py-12 text-center text-app-muted flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-app-accent" />
                    <span className="text-xs font-mono">Загрузка переписки...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-app-muted">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-app-accent" />
                    <p className="text-xs font-mono text-app-primary">Начните диалог с клиентом</p>
                    <p className="text-[11px] text-app-muted mt-1 max-w-xs mx-auto">
                      Вы можете отправить приветствие или ответить на вопросы клиента.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSeller = m.senderRole === "SELLER";
                    const time = new Date(m.createdAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col group ${isSeller ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[75%]">
                          {isSeller && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(m.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-app-muted hover:text-rose-400 transition-opacity cursor-pointer"
                              title="Удалить сообщение"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}

                          <div
                            className={`p-3.5 rounded-2xl text-xs font-sans leading-relaxed shadow-xs ${
                              isSeller
                                ? "bg-app-accent text-app-accent-fg rounded-br-xs font-medium"
                                : "bg-app-card border border-app-border text-app-primary rounded-bl-xs"
                            }`}
                          >
                            {!isSeller && (
                              <div className="text-[10px] font-mono text-app-muted mb-1 font-semibold">
                                {m.senderName || "Покупатель"}
                              </div>
                            )}

                            <p className="whitespace-pre-wrap break-words">{m.text}</p>

                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-mono ${
                                isSeller ? "text-app-accent-fg/70" : "text-app-muted"
                              }`}
                            >
                              <span>{time}</span>
                              {isSeller && (
                                <span>
                                  {m.isRead ? (
                                    <CheckCheck size={11} className="text-app-accent-fg inline" />
                                  ) : (
                                    <Check size={11} className="inline opacity-70" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Presets */}
              <div className="px-4 py-2 border-t border-app-border/60 bg-app-card/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-mono text-app-muted shrink-0 flex items-center gap-1">
                  <Sparkles size={10} className="text-app-accent" />
                  <span>Быстрый ответ:</span>
                </span>
                {QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(reply)}
                    disabled={sending}
                    className="px-2.5 py-1 bg-app-surface hover:bg-app-card border border-app-border rounded-lg text-[10px] font-sans text-app-primary hover:border-app-accent transition-all shrink-0 cursor-pointer truncate max-w-[220px]"
                    title={reply}
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Error Message if any */}
              {errorMsg && (
                <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 sm:p-4 border-t border-app-border bg-app-card/60 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Напишите ответ клиенту..."
                  className="flex-1 bg-app-surface border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-accent font-sans"
                  disabled={sending}
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="px-4 py-2.5 bg-app-accent text-app-accent-fg rounded-xl font-mono text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm shrink-0"
                >
                  {sending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={13} />
                      <span className="hidden sm:inline">Отправить</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
