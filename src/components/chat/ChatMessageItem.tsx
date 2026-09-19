import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  Maximize2,
  ShieldCheck,
  User as UserIcon,
  AlertCircle,
  Image as ImageIcon,
  Copy,
  Check as CopyCheck,
  Pencil,
  Trash2,
  User,
  Users
} from "lucide-react";
import { ChatMessage } from "../../types";
import { formatBytes } from "./MediaLightboxModal";

interface ChatMessageItemProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onOpenMedia: (url: string, type: "image" | "video" | "file", name?: string | null, size?: number | null) => void;
  onEditMessage?: (message: ChatMessage) => void;
  onDeleteForMe?: (message: ChatMessage) => void;
  onDeleteForAll?: (message: ChatMessage) => void;
  showSenderName?: boolean;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Helper to make URLs clickable
function renderFormattedText(text?: string | null) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all transition font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({
  message,
  isCurrentUser,
  onOpenMedia,
  onEditMessage,
  onDeleteForMe,
  onDeleteForAll,
  showSenderName = true,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDeveloperSender = message.senderRole === "DEVELOPER";
  const isVideo = message.mediaType === "video";
  const isImage = message.mediaType === "image";
  const hasMedia = Boolean(message.mediaUrl);
  const hasText = Boolean(message.text);
  const canModify = isCurrentUser && message.status !== "sending" && message.status !== "error";

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 160;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceAbove > menuHeight + 20 && spaceAbove > spaceBelow;

      const pos: { top?: number; bottom?: number; left?: number; right?: number } = {};
      if (openUp) {
        pos.bottom = window.innerHeight - rect.top + 4;
      } else {
        pos.top = rect.bottom + 4;
      }

      if (isCurrentUser) {
        pos.right = Math.max(8, window.innerWidth - rect.right);
      } else {
        pos.left = Math.max(8, rect.left);
      }

      setMenuPos(pos);
      setMenuOpen(true);
    }
  };

  // Close dropdown on click outside or escape or scroll
  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [menuOpen]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setMenuOpen(false);
      }, 800);
    }
  };

  return (
    <div
      className={`group relative flex flex-col my-1 select-text ${
        isCurrentUser ? "items-end" : "items-start"
      }`}
    >
      {/* Sender Header for Partner Messages */}
      {!isCurrentUser && showSenderName && (
        <div className="flex items-center gap-1.5 mb-1 px-1 select-none">
          {isDeveloperSender ? (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={13} className="shrink-0 text-emerald-500" />
              <span>Разработчик TMA-Builder</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-medium text-app-muted">
              <UserIcon size={12} className="shrink-0" />
              <span className="truncate max-w-[200px]">{message.senderName || "Пользователь"}</span>
            </div>
          )}
        </div>
      )}

      {/* Message Row with Bubble & Action Menu */}
      <div className={`flex items-center gap-1 max-w-[88%] sm:max-w-[80%] ${isCurrentUser ? "flex-row" : "flex-row-reverse"}`}>
        {/* Action Trigger Button */}
        <div className="shrink-0">
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleMenu}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              menuOpen
                ? "bg-app-hover text-app-primary opacity-100"
                : "opacity-0 group-hover:opacity-100 text-app-muted hover:text-app-primary hover:bg-app-hover"
            }`}
            title="Действия с сообщением"
          >
            <MoreVertical size={14} />
          </button>

          {/* Action Popover Menu rendered via Portal at top-level z-index */}
          {menuOpen && menuPos && createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: menuPos.top !== undefined ? `${menuPos.top}px` : undefined,
                bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : undefined,
                left: menuPos.left !== undefined ? `${menuPos.left}px` : undefined,
                right: menuPos.right !== undefined ? `${menuPos.right}px` : undefined,
                zIndex: 99999,
              }}
              className="min-w-[175px] bg-app-card border border-app-border rounded-xl shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Copy option */}
              {hasText && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-app-primary hover:bg-app-hover transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CopyCheck size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-emerald-400 font-medium">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="text-app-muted shrink-0" />
                      <span>Скопировать текст</span>
                    </>
                  )}
                </button>
              )}

              {/* Edit option */}
              {canModify && hasText && onEditMessage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEditMessage(message);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-app-primary hover:bg-app-hover transition cursor-pointer"
                >
                  <Pencil size={14} className="text-indigo-400 shrink-0" />
                  <span>Изменить</span>
                </button>
              )}

              {/* Divider if delete options available */}
              {canModify && (
                <div className="my-1 border-t border-app-border" />
              )}

              {/* Delete only for me */}
              {canModify && onDeleteForMe && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDeleteForMe(message);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-app-primary hover:bg-app-hover hover:text-amber-500 transition cursor-pointer"
                >
                  <User size={14} className="text-app-muted shrink-0" />
                  <span>Удалить у себя</span>
                </button>
              )}

              {/* Delete for all */}
              {canModify && onDeleteForAll && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDeleteForAll(message);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer font-medium"
                >
                  <Trash2 size={14} className="text-rose-500 shrink-0" />
                  <span>Удалить у всех</span>
                </button>
              )}
            </div>,
            document.body
          )}
        </div>

        {/* Main Message Bubble */}
        <div
          className={`relative px-3.5 py-2 text-xs leading-relaxed transition-all shadow-xs ${
            isCurrentUser
              ? "chat-bubble-outgoing rounded-2xl rounded-tr-xs"
              : "chat-bubble-incoming rounded-2xl rounded-tl-xs"
          }`}
        >
          {/* Media Block (Image or Video) */}
          {hasMedia && message.mediaUrl && (
            <div className="mb-2 relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
              {isImage ? (
                <div
                  className="relative group/media cursor-pointer overflow-hidden max-h-72 flex items-center justify-center"
                  onClick={() =>
                    onOpenMedia(
                      message.mediaUrl!,
                      "image",
                      message.mediaName,
                      message.mediaSize
                    )
                  }
                >
                  {!imageLoaded && !imageError && (
                    <div className="w-full h-36 flex flex-col items-center justify-center gap-2 text-app-muted">
                      <ImageIcon size={20} className="animate-pulse" />
                      <span className="text-[11px]">Загрузка фото...</span>
                    </div>
                  )}
                  {imageError ? (
                    <div className="w-full h-24 flex items-center justify-center gap-1.5 text-rose-500 text-[11px]">
                      <AlertCircle size={14} />
                      <span>Не удалось загрузить изображение</span>
                    </div>
                  ) : (
                    <img
                      src={message.mediaUrl}
                      alt={message.mediaName || "Изображение"}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                      className={`w-full max-h-72 object-cover transition-transform duration-200 group-hover/media:scale-[1.02] ${
                        imageLoaded ? "block" : "hidden"
                      }`}
                      loading="lazy"
                    />
                  )}
                  {imageLoaded && (
                    <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/media:opacity-100">
                      <div className="p-2 rounded-full bg-black/70 text-white shadow-md">
                        <Maximize2 size={15} />
                      </div>
                    </div>
                  )}
                  {message.mediaSize && imageLoaded && (
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">
                      {formatBytes(message.mediaSize)}
                    </div>
                  )}
                </div>
              ) : isVideo ? (
                <div className="relative group/video overflow-hidden rounded-xl bg-black">
                  <video
                    src={message.mediaUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-72 rounded-xl object-contain bg-black"
                  />
                  <button
                    onClick={() =>
                      onOpenMedia(
                        message.mediaUrl!,
                        "video",
                        message.mediaName,
                        message.mediaSize
                      )
                    }
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-black text-white transition cursor-pointer shadow-md"
                    title="Открыть на весь экран"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* Text Content */}
          {message.text && (
            <p className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed select-text font-normal">
              {renderFormattedText(message.text)}
            </p>
          )}

          {/* Message Metadata (Time, Edited & Read Status) */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] select-none chat-meta">
            {message.isEdited && (
              <span
                className="text-[9px] opacity-80 mr-0.5 tracking-tight font-medium"
                title={message.editedAt ? `Изменено: ${formatTime(message.editedAt)}` : "Изменено"}
              >
                (изм.)
              </span>
            )}
            <span>{formatTime(message.createdAt)}</span>

            {/* Delivery & Read Receipts (for current user messages) */}
            {isCurrentUser && (
              <span className="flex items-center ml-0.5">
                {message.status === "sending" ? (
                  <Clock size={11} className="animate-spin text-white/70" />
                ) : message.status === "error" ? (
                  <AlertCircle size={11} className="text-rose-400" title="Ошибка отправки" />
                ) : message.isRead ? (
                  <CheckCheck size={13} className="text-emerald-400" title="Прочитано" />
                ) : (
                  <Check size={12} className="text-white/70" title="Отправлено" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ChatMessageItem.displayName = "ChatMessageItem";

export default ChatMessageItem;
