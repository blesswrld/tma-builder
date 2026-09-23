import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  BellOff,
  MessageSquare,
  ShoppingBag,
  Star,
  CheckCheck,
  Trash2,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronDown
} from "lucide-react";

export interface TextNotificationItem {
  id: string;
  type: "chat" | "order" | "review" | "system";
  title: string;
  sender?: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  actionTab?: string;
  payload?: any;
  chatMessageId?: string;
}

interface NotificationInboxProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: TextNotificationItem[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDeleteNotification: (id: string) => void;
  onNotificationClick: (item: TextNotificationItem) => void;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  onSendTestNotification?: (category: "all" | "chat" | "order" | "review") => void;
}

function NotificationInboxComponent({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onDeleteNotification,
  onNotificationClick,
  isAudioEnabled,
  onToggleAudio,
  onSendTestNotification
}: NotificationInboxProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "chat" | "order" | "review">("all");
  const [visibleCount, setVisibleCount] = useState<number>(99);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const chatCount = useMemo(
    () => notifications.filter((n) => n.type === "chat").length,
    [notifications]
  );
  const orderCount = useMemo(
    () => notifications.filter((n) => n.type === "order").length,
    [notifications]
  );
  const reviewCount = useMemo(
    () => notifications.filter((n) => n.type === "review").length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const visibleNotifications = useMemo(
    () => filteredNotifications.slice(0, visibleCount),
    [filteredNotifications, visibleCount]
  );
  const remainingCount = filteredNotifications.length - visibleNotifications.length;

  const handleFilterChange = (filter: "all" | "chat" | "order" | "review") => {
    setActiveFilter(filter);
    setVisibleCount(99);
  };

  const handleLoadMore = () => {
    setVisibleCount(filteredNotifications.length);
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes}м назад`;
    if (hours < 24) return `${hours}ч назад`;
    if (days === 1) return "вчера";
    return new Date(timestamp).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const getTypeIcon = (type: TextNotificationItem["type"]) => {
    switch (type) {
      case "chat":
        return <MessageSquare size={13} className="text-blue-500 shrink-0" />;
      case "order":
        return <ShoppingBag size={13} className="text-emerald-500 shrink-0" />;
      case "review":
        return <Star size={13} className="text-amber-400 shrink-0" />;
      default:
        return <Bell size={13} className="text-app-primary shrink-0" />;
    }
  };

  const filterTabs = useMemo(() => [
    { id: "all" as const, label: "Все", count: notifications.length },
    { id: "chat" as const, label: "Чат", count: chatCount },
    { id: "order" as const, label: "Заказы", count: orderCount },
    { id: "review" as const, label: "Отзывы", count: reviewCount },
  ], [notifications.length, chatCount, orderCount, reviewCount]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop without expensive full-viewport blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50 transition-opacity"
          />

          {/* Compact Flyout Window with isolated GPU layer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-50 bottom-3 left-3 right-3 sm:right-auto sm:left-14 md:left-18 sm:w-[350px] max-h-[78vh] flex flex-col bg-app-surface border border-app-border rounded-2xl shadow-2xl overflow-hidden font-mono text-xs transform-gpu will-change-transform"
          >
            {/* Header: Clean, single-row compact layout */}
            <div className="px-3 py-2.5 border-b border-app-border flex items-center justify-between bg-app-card">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-app-surface border border-app-border flex items-center justify-center shrink-0 text-app-primary shadow-2xs">
                  <Bell size={13} />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-xs font-bold text-app-primary truncate">
                    Уведомления
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Compact sound mode indicator & toggle */}
                <button
                  type="button"
                  onClick={onToggleAudio}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
                    isAudioEnabled
                      ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      : "border-app-border text-app-muted hover:text-app-primary hover:bg-app-hover"
                  }`}
                  title={isAudioEnabled ? "Звук включен. Кликните для тихого режима" : "Тихий режим (только текст). Кликните для включения звука"}
                >
                  {isAudioEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    className="p-1.5 hover:bg-app-hover border border-app-border rounded-lg text-app-secondary hover:text-app-primary transition-colors cursor-pointer"
                    title="Отметить все как прочитанные"
                  >
                    <CheckCheck size={13} />
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="p-1.5 hover:bg-rose-500/10 hover:border-rose-500/30 border border-app-border rounded-lg text-app-muted hover:text-rose-500 transition-colors cursor-pointer"
                    title="Очистить все"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 hover:bg-app-hover border border-app-border rounded-lg text-app-muted hover:text-app-primary transition-colors cursor-pointer ml-0.5"
                  title="Закрыть"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Compact Filter Segmented Tabs */}
            <div className="p-1.5 border-b border-app-border bg-app-card/60 grid grid-cols-4 gap-1">
              {filterTabs.map((tab) => {
                const isCurrent = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleFilterChange(tab.id)}
                    className={`px-1 py-1 rounded-lg text-[10.5px] transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                      isCurrent
                        ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                        : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                    }`}
                  >
                    <span className="truncate">{tab.label}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full font-mono shrink-0 ${
                        isCurrent
                          ? "bg-app-accent-fg/20 text-app-accent-fg font-bold"
                          : "bg-app-surface text-app-muted border border-app-border/50"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Notification List Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[46vh] min-h-[140px] scrollbar-thin">
              {filteredNotifications.length === 0 ? (
                <div className="py-8 px-3 text-center space-y-2">
                  <div className="w-8 h-8 mx-auto rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-muted">
                    <BellOff size={15} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11.5px] font-semibold text-app-secondary">
                      Уведомлений пока нет
                    </p>
                    <p className="text-[9.5px] text-app-muted max-w-[240px] mx-auto">
                      {isAudioEnabled
                        ? "Новые сообщения и заказы будут дублироваться здесь"
                        : "Тихий режим активен: сообщения приходят прямо в этот ящик"}
                    </p>
                  </div>
                  {onSendTestNotification && (
                    <button
                      type="button"
                      onClick={() => onSendTestNotification(activeFilter)}
                      className="px-2.5 py-1 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer mt-1"
                    >
                      <Sparkles size={11} className="text-amber-400" />
                      <span>
                        {activeFilter === "order"
                          ? "Тестовый заказ"
                          : activeFilter === "review"
                          ? "Тестовый отзыв"
                          : activeFilter === "chat"
                          ? "Тестовое сообщение поддержки"
                          : "Тестовое уведомление"}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {visibleNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onNotificationClick(item)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer group relative ${
                        !item.isRead
                          ? "bg-app-card border-app-border hover:border-app-secondary/60 shadow-xs"
                          : "bg-app-surface border-app-border hover:bg-app-card hover:border-app-border opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded-md bg-app-surface border border-app-border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            {getTypeIcon(item.type)}
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-[11.5px] font-bold text-app-primary truncate">
                                {item.title}
                              </h4>
                              <span className="text-[9px] text-app-muted whitespace-nowrap shrink-0 font-mono">
                                {formatRelativeTime(item.timestamp)}
                              </span>
                            </div>

                            <p className="text-[10.5px] text-app-secondary line-clamp-2 leading-relaxed break-words font-sans">
                              {item.message}
                            </p>

                            {item.sender && (
                              <div className="text-[9px] text-app-muted truncate">
                                От: <span className="text-app-secondary font-medium">{item.sender}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right column: Sleek static unread dot without high-CPU continuous ping */}
                        <div className="flex flex-col items-end justify-between self-stretch gap-1 shrink-0">
                          {!item.isRead ? (
                            <span className="relative flex h-2 w-2 shrink-0 my-0.5" title="Новое уведомление">
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] ring-1.5 ring-rose-500/30" />
                            </span>
                          ) : (
                            <span className="w-2 h-2" />
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNotification(item.id);
                            }}
                            className="p-0.5 text-app-muted hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Удалить"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load more button if there are more items */}
                  {remainingCount > 0 && (
                    <div className="pt-1 pb-0.5">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        className="w-full py-1.5 px-3 rounded-xl border border-app-border bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary text-[10.5px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group"
                      >
                        <ChevronDown size={12} className="text-app-muted group-hover:text-app-primary transition-transform group-hover:translate-y-0.5" />
                        <span>Загрузить еще</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Compact Footer */}
            <div className="px-2.5 py-1.5 border-t border-app-border bg-app-surface flex items-center justify-between text-[9.5px] text-app-muted">
              <span>{isAudioEnabled ? "Звук включен" : "Тихий режим (текст)"}</span>
              {onSendTestNotification && (
                <button
                  type="button"
                  onClick={() => onSendTestNotification(activeFilter)}
                  className="hover:text-app-primary transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <Sparkles size={10} className="text-amber-400" />
                  <span>
                    Тест{" "}
                    {activeFilter === "order"
                      ? "(заказ)"
                      : activeFilter === "review"
                      ? "(отзыв)"
                      : activeFilter === "chat"
                      ? "(поддержка)"
                      : ""}
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default React.memo(NotificationInboxComponent);
