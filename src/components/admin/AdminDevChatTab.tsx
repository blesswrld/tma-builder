import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Video,
  X,
  RefreshCw,
  Search,
  Check,
  CheckCheck,
  ShieldCheck,
  User,
  Store,
  Crown,
  AlertCircle,
  Clock,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Radio,
  FileQuestion,
  HelpCircle,
  ExternalLink,
  Trash2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeEvent } from "../../context/RealtimeContext";
import { resilientFetch } from "../../lib/api";
import { ChatMessage, ChatPartner, ChatConversation } from "../../types";
import ChatMessageItem from "../chat/ChatMessageItem";
import EmojiPickerPopover, { QUICK_EMOJIS } from "../chat/EmojiPickerPopover";
import MediaLightboxModal, { formatBytes } from "../chat/MediaLightboxModal";

const MAX_IMAGE_SIZE_MB = 15;
const MAX_VIDEO_SIZE_MB = 50;

const PROMPT_SUGGESTIONS = [
  "👋 Привет! Нужна помощь с настройкой заведения в Telegram",
  "💡 У меня есть идея по улучшению функционала приложения",
  "❓ Как настроить оплату через ЮKassa / СБП?",
  "🚀 Вопрос по интеграции и подключению бота"
];

function formatDateGroup(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Сегодня";
    if (isYesterday) return "Вчера";

    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  } catch {
    return "";
  }
}

export default function AdminDevChatTab() {
  const { user, token } = useAuth();
  const isDev = Boolean(
    user?.email &&
      (user.email.toLowerCase().trim() === "gelgaev.dev@mail.ru" ||
        user.email.toLowerCase().trim() === "roninfortnite71@gmail.com")
  );

  // States for Active Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<ChatPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input & Media
  const [inputText, setInputText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<{
    file: File;
    url: string;
    type: "image" | "video";
    name: string;
    size: number;
  } | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Developer mode conversations state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationUserId, setActiveConversationUserId] = useState<string | null>(null);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "paid">("all");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Lightbox Modal
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    url: string | null;
    type: "image" | "video" | "file" | null;
    name?: string | null;
    size?: number | null;
  }>({
    isOpen: false,
    url: null,
    type: null
  });

  // UI helpers
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmittingRef = useRef(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Active chat target ref for stable access inside closures / realtime handlers
  const currentTargetIdRef = useRef<string | null>(null);
  currentTargetIdRef.current = isDev ? activeConversationUserId : user?.id || null;

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end"
      });
    }
  }, []);

  // 1. Fetch Conversations (Developer only)
  const fetchConversations = useCallback(async () => {
    if (!isDev || !token) return;
    try {
      setConversationsLoading(true);
      const res = await resilientFetch("/api/chat/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Не удалось загрузить список диалогов");
      const data = await res.json();
      setConversations(data.conversations || []);

      // Auto-select first conversation if none selected
      if (!activeConversationUserId && data.conversations?.length > 0) {
        setActiveConversationUserId(data.conversations[0].userId);
      }
    } catch (err: any) {
      console.error("Error loading conversations:", err);
    } finally {
      setConversationsLoading(false);
    }
  }, [isDev, token, activeConversationUserId]);

  // 2. Fetch Messages for active chat
  const fetchMessages = useCallback(
    async (targetUserId?: string | null, isInitial = false) => {
      if (!token) return;
      try {
        if (isInitial) setLoading(true);
        setError(null);

        const url = isDev && targetUserId
          ? `/api/chat/messages?userId=${encodeURIComponent(targetUserId)}`
          : "/api/chat/messages";

        const res = await resilientFetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Не удалось загрузить сообщения");
        }

        const data = await res.json();
        setMessages(data.messages || []);
        if (data.partner) {
          setPartner(data.partner);
        }

        // Auto-mark as read
        if (data.messages?.length > 0) {
          markAsRead(targetUserId || undefined);
        }

        if (isInitial) {
          setTimeout(() => scrollToBottom(false), 80);
        }
      } catch (err: any) {
        console.error("Error loading chat messages:", err);
        setError(err.message || "Ошибка загрузки сообщений");
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [token, isDev, scrollToBottom]
  );

  // 3. Mark messages as read
  const markAsRead = useCallback(
    async (targetUserId?: string) => {
      if (!token) return;
      try {
        await resilientFetch("/api/chat/read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ targetUserId })
        });
      } catch (err) {
        // silent fail
      }
    },
    [token]
  );

  // Initial load
  useEffect(() => {
    if (isDev) {
      fetchConversations();
    } else {
      fetchMessages(null, true);
    }
  }, [isDev, fetchConversations, fetchMessages]);

  // Load messages when developer changes active conversation
  useEffect(() => {
    if (isDev && activeConversationUserId) {
      fetchMessages(activeConversationUserId, true);
    }
  }, [isDev, activeConversationUserId, fetchMessages]);

  // Realtime listeners
  useRealtimeEvent("CHAT_MESSAGE_CREATED", (event) => {
    const newMsg: ChatMessage = event.payload?.message;
    if (!newMsg) return;

    // Check if relevant to currently open chat
    const currentTargetId = currentTargetIdRef.current || (isDev ? activeConversationUserId : user?.id);
    if (newMsg.userId === currentTargetId) {
      setMessages((prev) => {
        // 1. If message with exact server ID is already present, update status/data
        const idxById = prev.findIndex((m) => m.id === newMsg.id);
        if (idxById !== -1) {
          const updated = [...prev];
          updated[idxById] = { ...updated[idxById], ...newMsg, status: "sent" };
          return updated;
        }

        // 2. If an optimistic message matches clientMessageId or temp id, replace in-place
        const cMsgId = newMsg.clientMessageId || (event.payload?.clientMessageId as string | undefined);
        if (cMsgId) {
          const idxByClient = prev.findIndex(
            (m) => m.id === cMsgId || (m.clientMessageId && m.clientMessageId === cMsgId)
          );
          if (idxByClient !== -1) {
            const updated = [...prev];
            updated[idxByClient] = { ...newMsg, status: "sent" };
            return updated;
          }
        }

        // 3. Fallback matching for pending optimistic message from the same sender
        const idxPending = prev.findIndex(
          (m) =>
            m.status === "sending" &&
            m.senderRole === newMsg.senderRole &&
            m.senderId === newMsg.senderId &&
            (m.text || "") === (newMsg.text || "") &&
            (m.mediaUrl || "") === (newMsg.mediaUrl || "")
        );
        if (idxPending !== -1) {
          const updated = [...prev];
          updated[idxPending] = { ...newMsg, status: "sent" };
          return updated;
        }

        // 4. Otherwise it's a completely new incoming message
        return [...prev, { ...newMsg, status: "sent" }];
      });
      setTimeout(() => scrollToBottom(true), 60);

      // If user or dev received message from partner, mark read
      if (
        (isDev && newMsg.senderRole === "USER") ||
        (!isDev && newMsg.senderRole === "DEVELOPER")
      ) {
        markAsRead(currentTargetId || undefined);
      }
    }

    // If developer, refresh conversation summaries
    if (isDev) {
      fetchConversations();
    }
  });

  useRealtimeEvent("CHAT_MESSAGES_READ", (event) => {
    const targetUserId = event.payload?.targetUserId;
    const currentTargetId = currentTargetIdRef.current || (isDev ? activeConversationUserId : user?.id);
    if (targetUserId === currentTargetId) {
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          isRead: true,
          readAt: m.readAt || new Date().toISOString()
        }))
      );
    }
  });

  useRealtimeEvent("CHAT_MESSAGE_DELETED", (event) => {
    const deletedId = event.payload?.messageId;
    if (deletedId) {
      setMessages((prev) => prev.filter((m) => m.id !== deletedId));
    }
  });

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setMediaError("Поддерживаются только изображения (PNG, JPG, WebP, GIF) и видео (MP4, WebM, MOV).");
      return;
    }

    if (isImage && file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setMediaError(`Размер изображения превышает ${MAX_IMAGE_SIZE_MB} МБ.`);
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      setMediaError(`Размер видеофайла превышает ${MAX_VIDEO_SIZE_MB} МБ.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setSelectedMedia({
        file,
        url: dataUrl,
        type: isVideo ? "video" : "image",
        name: file.name,
        size: file.size
      });
    };
    reader.onerror = () => {
      setMediaError("Не удалось прочитать файл");
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  // Handle Send Message
  const handleSendMessage = async (customText?: string) => {
    if (isSubmittingRef.current || sending) return;

    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend && !selectedMedia) return;
    if (!token) {
      setError("Сессия истекла, пожалуйста, обновите страницу");
      return;
    }

    const targetUserId = isDev ? activeConversationUserId : user?.id;
    if (isDev && !targetUserId) {
      setError("Выберите диалог с пользователем");
      return;
    }

    isSubmittingRef.current = true;
    setSending(true);
    setError(null);
    setMediaError(null);

    // Unique client message identifier for idempotency & instant deduplication
    const clientMessageId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const optimisticMessage: ChatMessage = {
      id: clientMessageId,
      clientMessageId,
      userId: targetUserId || "",
      senderRole: isDev ? "DEVELOPER" : "USER",
      senderId: user?.id || "",
      senderName: isDev ? "Разработчик TMA-Builder" : (user?.name || user?.email),
      text: textToSend || null,
      mediaUrl: selectedMedia?.url || null,
      mediaType: selectedMedia?.type || null,
      mediaName: selectedMedia?.name || null,
      mediaSize: selectedMedia?.size || null,
      isRead: false,
      createdAt: new Date().toISOString(),
      status: "sending"
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText("");
    const mediaToSend = selectedMedia;
    setSelectedMedia(null);
    setIsEmojiPickerOpen(false);
    setTimeout(() => scrollToBottom(true), 40);

    try {
      const res = await resilientFetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: textToSend,
          mediaUrl: mediaToSend?.url,
          mediaType: mediaToSend?.type,
          mediaName: mediaToSend?.name,
          mediaSize: mediaToSend?.size,
          targetUserId: isDev ? targetUserId : undefined,
          clientMessageId
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Ошибка отправки сообщения");
      }

      const data = await res.json();
      const realMessage: ChatMessage = {
        ...data.message,
        clientMessageId
      };

      // Safely replace optimistic placeholder with real server response
      setMessages((prev) => {
        // 1. If server ID is already in the list (e.g. from realtime WebSocket)
        const idxById = prev.findIndex((m) => m.id === realMessage.id);
        if (idxById !== -1) {
          // Remove any leftover optimistic message with clientMessageId
          return prev
            .filter((m) => m.id === realMessage.id || (m.id !== clientMessageId && m.clientMessageId !== clientMessageId))
            .map((m) => (m.id === realMessage.id ? { ...m, ...realMessage, status: "sent" } : m));
        }

        // 2. Replace the optimistic message by clientMessageId or temp id
        const idxByClient = prev.findIndex(
          (m) => m.id === clientMessageId || (m.clientMessageId && m.clientMessageId === clientMessageId)
        );
        if (idxByClient !== -1) {
          const updated = [...prev];
          updated[idxByClient] = { ...realMessage, status: "sent" };
          return updated;
        }

        // 3. Fallback: if not found, append real message
        return [...prev, { ...realMessage, status: "sent" }];
      });

      if (isDev) {
        fetchConversations();
      }
    } catch (err: any) {
      console.error("Send message error:", err);
      // Mark optimistic message as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === clientMessageId || (m.clientMessageId && m.clientMessageId === clientMessageId)
            ? { ...m, status: "error" }
            : m
        )
      );
      setError(err.message || "Не удалось отправить сообщение");
    } finally {
      setSending(false);
      isSubmittingRef.current = false;
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Handle Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    if (!token || !confirm("Удалить это сообщение?")) return;
    try {
      const res = await resilientFetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  // Group messages by date with strict ID & clientMessageId deduplication
  const groupedMessages = useMemo(() => {
    const groups: { date: string; items: ChatMessage[] }[] = [];
    const seenIds = new Set<string>();

    messages.forEach((msg) => {
      if (seenIds.has(msg.id)) return;
      if (msg.clientMessageId && seenIds.has(msg.clientMessageId)) return;
      seenIds.add(msg.id);
      if (msg.clientMessageId) {
        seenIds.add(msg.clientMessageId);
      }

      const dateLabel = formatDateGroup(msg.createdAt);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateLabel) {
        lastGroup.items.push(msg);
      } else {
        groups.push({ date: dateLabel, items: [msg] });
      }
    });
    return groups;
  }, [messages]);

  // Filtered conversations for developer
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (activeFilter === "unread" && conv.unreadCount === 0) return false;
      if (activeFilter === "paid" && conv.user.plan === "FREE") return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        conv.user.email.toLowerCase().includes(q) ||
        conv.user.name.toLowerCase().includes(q) ||
        conv.user.companyName?.toLowerCase().includes(q) ||
        conv.user.shops.some((s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q))
      );
    });
  }, [conversations, activeFilter, searchQuery]);

  // Total unread for developer
  const totalDevUnread = useMemo(() => {
    return conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  }, [conversations]);

  // Active conversation user details (Developer mode)
  const activeConv = useMemo(() => {
    return conversations.find((c) => c.userId === activeConversationUserId);
  }, [conversations, activeConversationUserId]);

  return (
    <div className="w-full flex flex-col h-[calc(100vh-140px)] min-h-[580px] max-h-[920px] bg-app-card border border-app-border rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
      {/* DEVELOPER SPLIT VIEW (List on Left, Chat on Right) OR REGULAR DIRECT VIEW */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================= */}
        {/* LEFT COLUMN: CONVERSATIONS LIST (DEVELOPER ONLY) */}
        {/* ========================================================= */}
        {isDev && (
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-app-border flex flex-col bg-app-bg/40 ${
              mobileShowChat ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Header / Search */}
            <div className="p-3 border-b border-app-border space-y-2 bg-app-card/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-app-primary">Диалоги поддержки</h3>
                    <p className="text-[10px] text-app-muted">Все пользователи платформы</p>
                  </div>
                </div>

                <button
                  onClick={fetchConversations}
                  className="p-1.5 rounded-lg hover:bg-app-hover text-app-muted hover:text-app-primary transition cursor-pointer"
                  title="Обновить список"
                >
                  <RefreshCw size={14} className={conversationsLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-app-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по email, имени, заведению..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-app-card border border-app-border rounded-xl text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-accent transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    activeFilter === "all"
                      ? "bg-app-accent text-app-accent-fg"
                      : "text-app-muted hover:text-app-primary hover:bg-app-hover"
                  }`}
                >
                  Все ({conversations.length})
                </button>
                <button
                  onClick={() => setActiveFilter("unread")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                    activeFilter === "unread"
                      ? "bg-rose-500 text-white"
                      : "text-app-muted hover:text-app-primary hover:bg-app-hover"
                  }`}
                >
                  <span>Непрочитанные</span>
                  {totalDevUnread > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-bold">
                      {totalDevUnread}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveFilter("paid")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    activeFilter === "paid"
                      ? "bg-amber-500 text-white"
                      : "text-app-muted hover:text-app-primary hover:bg-app-hover"
                  }`}
                >
                  PRO / VIP
                </button>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-app-border/40">
              {conversationsLoading && conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-app-muted animate-pulse">
                  Загрузка диалогов...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-app-muted">
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                  <span>Диалогов не найдено</span>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.userId === activeConversationUserId;
                  const isPaid = conv.user.plan === "PRO" || conv.user.plan === "ENTERPRISE";

                  return (
                    <button
                      key={conv.userId}
                      onClick={() => {
                        setActiveConversationUserId(conv.userId);
                        setMobileShowChat(true);
                      }}
                      className={`w-full text-left p-3 transition flex items-start gap-2.5 cursor-pointer relative ${
                        isSelected
                          ? "bg-app-accent/10 border-l-2 border-app-accent"
                          : "hover:bg-app-hover"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {conv.user.avatarUrl ? (
                          <img
                            src={conv.user.avatarUrl}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover border border-app-border"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-primary font-bold text-xs">
                            {conv.user.name?.[0] || conv.user.email[0].toUpperCase()}
                          </div>
                        )}
                        {isPaid && (
                          <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-amber-500 text-slate-950 shadow-xs">
                            <Crown size={9} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-semibold text-app-primary truncate">
                            {conv.user.name || conv.user.email}
                          </span>
                          {conv.lastMessage && (
                            <span className="text-[10px] text-app-muted shrink-0">
                              {formatDateGroup(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-app-muted mb-1">
                          <span className="truncate">{conv.user.email}</span>
                          {conv.user.shops?.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-app-accent font-medium truncate">
                                🏬 {conv.user.shops[0].name}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Last message text preview */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-app-muted truncate">
                            {conv.lastMessage?.senderRole === "DEVELOPER" ? "Вы: " : ""}
                            {conv.lastMessage?.mediaType === "video"
                              ? "🎬 Видео"
                              : conv.lastMessage?.mediaType === "image"
                              ? "🖼️ Фото"
                              : conv.lastMessage?.text || "Нет сообщений"}
                          </p>

                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* RIGHT COLUMN / MAIN CHAT WINDOW */}
        {/* ========================================================= */}
        <div
          className={`flex-1 flex flex-col bg-app-card/30 ${
            isDev && !mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Top Header Bar */}
          <div className="p-3 sm:px-4 border-b border-app-border flex items-center justify-between bg-app-card/80 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              {/* Back button for mobile view in Dev Mode */}
              {isDev && (
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-app-hover text-app-muted hover:text-app-primary transition cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
              )}

              {/* Partner Avatar / Status */}
              <div className="relative shrink-0">
                {isDev ? (
                  activeConv?.user?.avatarUrl ? (
                    <img
                      src={activeConv.user.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover border border-app-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-primary font-bold text-sm">
                      {activeConv?.user?.name?.[0] || activeConv?.user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                    <ShieldCheck size={20} />
                  </div>
                )}

                {/* Online pulse indicator */}
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-app-card ${
                    partner?.isOnline !== false ? "bg-emerald-500" : "bg-slate-500"
                  }`}
                  title={partner?.isOnline !== false ? "В сети" : "Офлайн"}
                />
              </div>

              {/* Partner details */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold text-app-primary truncate">
                    {isDev
                      ? activeConv?.user?.name || activeConv?.user?.email || "Пользователь"
                      : "Разработчик TMA-Builder"}
                  </h2>
                  {isDev && activeConv?.user?.plan && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        activeConv.user.plan === "ENTERPRISE"
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : activeConv.user.plan === "PRO"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-700/40 text-slate-400"
                      }`}
                    >
                      {activeConv.user.plan}
                    </span>
                  )}
                  {!isDev && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                      PRO DEV
                    </span>
                  )}
                </div>

                <p className="text-[10px] sm:text-xs text-app-muted flex items-center gap-1.5 truncate">
                  {isDev ? (
                    <>
                      <span>{activeConv?.user?.email}</span>
                      {activeConv?.user?.shops?.length ? (
                        <>
                          <span>•</span>
                          <span className="text-app-accent">
                            🏬 {activeConv.user.shops.map((s) => s.name).join(", ")}
                          </span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <Radio size={10} className="animate-pulse" />
                        {partner?.isOnline !== false ? "В сети (Online)" : "Поддержка 24/7"}
                      </span>
                      <span>•</span>
                      <span>Прямая связь и консультации</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchMessages(isDev ? activeConversationUserId : null, false)}
                className="p-2 rounded-xl bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary transition cursor-pointer"
                title="Обновить переписку"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>

              {isDev && activeConv?.user?.shops?.[0] && (
                <a
                  href={`/${activeConv.user.shops[0].slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-app-card hover:bg-app-hover border border-app-border text-app-accent transition cursor-pointer"
                  title="Открыть витрину заведения"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* MESSAGES STREAM VIEWPORT */}
          {/* ========================================================= */}
          <div
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar relative"
            onScroll={(e) => {
              const el = e.currentTarget;
              const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
              setShowScrollBottomBtn(!isNearBottom);
            }}
          >
            {/* Loading Skeleton */}
            {loading && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 text-app-muted">
                <RefreshCw size={24} className="animate-spin text-app-accent" />
                <p className="text-xs">Загрузка переписки...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => fetchMessages(isDev ? activeConversationUserId : null, true)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-medium text-xs hover:bg-rose-600 transition"
                >
                  Повторить
                </button>
              </div>
            ) : messages.length === 0 ? (
              /* Empty Chat Prompt */
              <div className="flex flex-col items-center justify-center min-h-[320px] text-center p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-app-accent/10 border border-app-accent/20 flex items-center justify-center text-app-accent shadow-lg">
                  <MessageSquare size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-app-primary">
                    {isDev
                      ? "С этим пользователем ещё нет сообщений"
                      : "Добро пожаловать в чат с разработчиком!"}
                  </h3>
                  <p className="text-xs text-app-muted max-w-sm mt-1">
                    {isDev
                      ? "Напишите первое сообщение, чтобы помочь клиенту с настройкой заведения или ответить на вопрос."
                      : "Задайте любой технический вопрос, предложите улучшение или запросите помощь по Telegram-боту."}
                  </p>
                </div>

                {!isDev && (
                  <div className="w-full max-w-md space-y-2 pt-2">
                    <p className="text-[11px] font-semibold text-app-muted text-left">
                      💡 Быстрые вопросы:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PROMPT_SUGGESTIONS.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(sug)}
                          className="p-2.5 rounded-xl bg-app-card hover:bg-app-hover border border-app-border text-left text-xs text-app-primary transition cursor-pointer hover:border-app-accent group"
                        >
                          <span className="group-hover:text-app-accent transition">{sug}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Grouped Message Bubbles */
              groupedMessages.map((group, groupIdx) => (
                <div key={`${group.date}-${groupIdx}`} className="space-y-1">
                  {/* Date Divider */}
                  {group.date && (
                    <div className="flex items-center justify-center my-3">
                      <span className="px-3 py-1 rounded-full bg-app-card/90 border border-app-border text-[10px] font-semibold text-app-muted shadow-xs">
                        {group.date}
                      </span>
                    </div>
                  )}

                  {/* Messages */}
                  {group.items.map((msg) => {
                    const isMine =
                      (isDev && msg.senderRole === "DEVELOPER") ||
                      (!isDev && msg.senderRole === "USER");

                    return (
                      <ChatMessageItem
                        key={msg.id}
                        message={msg}
                        isCurrentUser={isMine}
                        onOpenMedia={(url, type, name, size) =>
                          setLightboxData({
                            isOpen: true,
                            url,
                            type,
                            name,
                            size
                          })
                        }
                        onDeleteMessage={handleDeleteMessage}
                        showSenderName={!isMine}
                      />
                    );
                  })}
                </div>
              ))
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Scroll to Bottom Button */}
          {showScrollBottomBtn && (
            <div className="absolute bottom-28 right-6 z-20">
              <button
                onClick={() => scrollToBottom(true)}
                className="p-2 rounded-full bg-app-accent text-app-accent-fg shadow-lg hover:scale-105 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-3"
              >
                <span>Вниз</span>
                <ChevronDown size={14} />
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* BOTTOM INPUT & MEDIA TOOLBAR */}
          {/* ========================================================= */}
          <div className="p-3 border-t border-app-border bg-app-card/90 backdrop-blur-md relative">
            {/* Quick Emojis Bar */}
            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[10px] font-medium text-app-muted mr-1 shrink-0">Реакции:</span>
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 active:scale-95 hover:bg-app-hover rounded-lg transition-transform cursor-pointer shrink-0 select-none"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Error alerts if any */}
            {mediaError && (
              <div className="mb-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>{mediaError}</span>
                </div>
                <button
                  onClick={() => setMediaError(null)}
                  className="text-rose-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Pre-send Media Attachment Card */}
            {selectedMedia && (
              <div className="mb-2.5 p-2 rounded-xl bg-app-card border border-app-accent/40 flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedMedia.type === "image" ? (
                    <img
                      src={selectedMedia.url}
                      alt="Превью"
                      className="w-12 h-12 rounded-lg object-cover border border-app-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-black/40 border border-app-border flex items-center justify-center text-indigo-400 shrink-0">
                      <Video size={20} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-app-primary truncate">
                      {selectedMedia.name}
                    </p>
                    <p className="text-[10px] text-app-muted">
                      {selectedMedia.type === "video" ? "🎬 Видео" : "🖼️ Изображение"} • {formatBytes(selectedMedia.size)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMedia(null)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-app-muted hover:text-rose-400 transition cursor-pointer"
                  title="Отменить прикрепление"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Input Bar Form */}
            <div className="flex items-end gap-2">
              {/* Media File Picker Trigger */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary transition cursor-pointer shrink-0"
                title="Прикрепить изображение или видео (до 50 МБ)"
              >
                <Paperclip size={18} />
              </button>

              {/* Emoji Picker Trigger */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    isEmojiPickerOpen
                      ? "bg-app-accent text-app-accent-fg border-app-accent"
                      : "bg-app-card hover:bg-app-hover border-app-border text-app-muted hover:text-app-primary"
                  }`}
                  title="Выбрать эмодзи"
                >
                  <Smile size={18} />
                </button>

                {/* Emoji Popover */}
                <EmojiPickerPopover
                  isOpen={isEmojiPickerOpen}
                  onClose={() => setIsEmojiPickerOpen(false)}
                  onSelectEmoji={(emoji) => {
                    setInputText((prev) => prev + emoji);
                    if (textareaRef.current) textareaRef.current.focus();
                  }}
                />
              </div>

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (e.nativeEvent.isComposing) return;
                      if (!sending && !isSubmittingRef.current) {
                        handleSendMessage();
                      }
                    }
                  }}
                  rows={1}
                  placeholder="Напишите сообщение разработчику... (Enter для отправки)"
                  className="w-full px-3.5 py-2.5 text-xs bg-app-bg/80 border border-app-border rounded-xl text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-accent transition resize-none max-h-32 min-h-[40px]"
                />
              </div>

              {/* Send Button */}
              <button
                type="button"
                disabled={sending || (!inputText.trim() && !selectedMedia)}
                onClick={(e) => {
                  e.preventDefault();
                  if (!sending && !isSubmittingRef.current) {
                    handleSendMessage();
                  }
                }}
                className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition cursor-pointer shrink-0 ${
                  inputText.trim() || selectedMedia
                    ? "bg-app-accent text-app-accent-fg shadow-md hover:scale-105 active:scale-95"
                    : "bg-app-card border border-app-border text-app-muted cursor-not-allowed opacity-50"
                }`}
                title="Отправить сообщение (Enter)"
              >
                {sending ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Media Lightbox Expanded Modal */}
      <MediaLightboxModal
        isOpen={lightboxData.isOpen}
        onClose={() =>
          setLightboxData({
            isOpen: false,
            url: null,
            type: null
          })
        }
        mediaUrl={lightboxData.url}
        mediaType={lightboxData.type}
        mediaName={lightboxData.name}
        mediaSize={lightboxData.size}
      />
    </div>
  );
}
