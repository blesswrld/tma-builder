import React, { useState } from "react";
import { Check, CheckCheck, Clock, Trash2, Maximize2, ShieldCheck, User as UserIcon, AlertCircle, Image as ImageIcon } from "lucide-react";
import { ChatMessage } from "../../types";
import { formatBytes } from "./MediaLightboxModal";

interface ChatMessageItemProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onOpenMedia: (url: string, type: "image" | "video" | "file", name?: string | null, size?: number | null) => void;
  onDeleteMessage?: (messageId: string) => void;
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
function renderFormattedText(text?: string | null, isCurrentUser = false) {
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
          className={`underline break-all transition font-medium ${
            isCurrentUser
              ? "text-emerald-200 hover:text-white"
              : "text-emerald-600 dark:text-emerald-400 hover:opacity-80"
          }`}
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
  onDeleteMessage,
  showSenderName = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isDeveloperSender = message.senderRole === "DEVELOPER";
  const isVideo = message.mediaType === "video";
  const isImage = message.mediaType === "image";
  const hasMedia = Boolean(message.mediaUrl);

  return (
    <div
      className={`group relative flex flex-col my-1 ${
        isCurrentUser ? "items-end" : "items-start"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sender Header if needed */}
      {!isCurrentUser && showSenderName && (
        <div className="flex items-center gap-1.5 mb-1 px-1">
          {isDeveloperSender ? (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-app-primary">
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

      {/* Main Message Bubble */}
      <div
        className={`relative max-w-[85%] sm:max-w-[78%] px-3.5 py-2.5 text-xs leading-relaxed transition-all shadow-xs ${
          isCurrentUser
            ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 dark:border dark:border-white/10 rounded-2xl rounded-tr-xs"
            : "bg-app-card text-app-primary border border-app-border rounded-2xl rounded-tl-xs"
        }`}
      >
        {/* Media Block (Image or Video) */}
        {hasMedia && message.mediaUrl && (
          <div className="mb-2 relative rounded-xl overflow-hidden border border-app-border bg-app-surface/50">
            {isImage ? (
              <div
                className="relative group/media cursor-pointer overflow-hidden max-h-72 flex items-center justify-center bg-app-surface"
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
                  <div className="w-full h-24 flex items-center justify-center gap-1.5 text-app-muted text-[11px]">
                    <AlertCircle size={14} className="text-rose-500" />
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
                  <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover/media:opacity-100">
                    <div className="p-2 rounded-full bg-black/60 text-white backdrop-blur-xs shadow-md">
                      <Maximize2 size={15} />
                    </div>
                  </div>
                )}
                {message.mediaSize && imageLoaded && (
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white backdrop-blur-xs font-mono">
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
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-xs transition cursor-pointer shadow-md"
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
          <p className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed select-text">
            {renderFormattedText(message.text, isCurrentUser)}
          </p>
        )}

        {/* Message Metadata (Time & Read Status) */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
            isCurrentUser
              ? "text-white/60 dark:text-zinc-400"
              : "text-app-muted"
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>

          {/* Delivery & Read Receipts (for current user messages) */}
          {isCurrentUser && (
            <span className="flex items-center ml-0.5">
              {message.status === "sending" ? (
                <Clock size={11} className="animate-spin text-white/70 dark:text-zinc-300" />
              ) : message.status === "error" ? (
                <AlertCircle size={11} className="text-rose-400" title="Ошибка отправки" />
              ) : message.isRead ? (
                <CheckCheck size={13} className="text-emerald-400" title="Прочитано" />
              ) : (
                <Check size={12} className="text-white/70 dark:text-zinc-300" title="Отправлено" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Hover Actions (Delete) */}
      {isHovered && onDeleteMessage && (
        <div
          className={`absolute top-1 ${
            isCurrentUser ? "-left-7" : "-right-7"
          } flex items-center`}
        >
          <button
            onClick={() => onDeleteMessage(message.id)}
            className="p-1 rounded-lg bg-app-card hover:bg-rose-500/10 text-app-muted hover:text-rose-500 transition cursor-pointer shadow-xs border border-app-border"
            title="Удалить сообщение"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
});

ChatMessageItem.displayName = "ChatMessageItem";

export default ChatMessageItem;
