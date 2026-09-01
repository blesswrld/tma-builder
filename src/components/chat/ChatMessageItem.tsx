import React, { useState } from "react";
import { motion } from "motion/react";
import { Check, CheckCheck, Clock, Play, Trash2, Maximize2, ShieldCheck, User as UserIcon, AlertCircle } from "lucide-react";
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

// Function to make URLs in text clickable safely
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
          className="text-app-accent underline hover:opacity-80 break-all transition"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isCurrentUser,
  onOpenMedia,
  onDeleteMessage,
  showSenderName = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isDeveloperSender = message.senderRole === "DEVELOPER";
  const isVideo = message.mediaType === "video";
  const isImage = message.mediaType === "image";
  const hasMedia = Boolean(message.mediaUrl);

  return (
    <div
      className={`group relative flex flex-col my-1.5 ${
        isCurrentUser ? "items-end" : "items-start"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sender Header if needed */}
      {!isCurrentUser && showSenderName && (
        <div className="flex items-center gap-1.5 mb-1 px-1">
          {isDeveloperSender ? (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Разработчик TMA-Builder</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-app-muted">
              <UserIcon size={12} />
              <span>{message.senderName || "Пользователь"}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Message Bubble */}
      <div
        className={`relative max-w-[88%] sm:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed transition-all shadow-xs ${
          isCurrentUser
            ? "bg-app-accent text-app-accent-fg rounded-br-xs"
            : isDeveloperSender
            ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-50 rounded-bl-xs"
            : "bg-app-card border border-app-border text-app-primary rounded-bl-xs"
        }`}
      >
        {/* Media Block (Image or Video) */}
        {hasMedia && message.mediaUrl && (
          <div className="mb-2 relative rounded-xl overflow-hidden bg-black/40 border border-black/10">
            {isImage ? (
              <div
                className="relative group/media cursor-pointer overflow-hidden max-h-72 flex items-center justify-center bg-black/20"
                onClick={() =>
                  onOpenMedia(
                    message.mediaUrl!,
                    "image",
                    message.mediaName,
                    message.mediaSize
                  )
                }
              >
                {!imageLoaded && (
                  <div className="w-full h-40 flex items-center justify-center bg-app-card/60 animate-pulse text-app-muted text-[11px]">
                    Загрузка изображения...
                  </div>
                )}
                <img
                  src={message.mediaUrl}
                  alt={message.mediaName || "Изображение"}
                  onLoad={() => setImageLoaded(true)}
                  className={`w-full max-h-72 object-cover transition duration-300 group-hover/media:scale-105 ${
                    imageLoaded ? "block" : "hidden"
                  }`}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/30 transition flex items-center justify-center opacity-0 group-hover/media:opacity-100">
                  <div className="p-2 rounded-full bg-black/60 text-white backdrop-blur-sm shadow-lg">
                    <Maximize2 size={16} />
                  </div>
                </div>
                {message.mediaSize && (
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white backdrop-blur-sm">
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
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm transition cursor-pointer shadow-md"
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
          <p className="whitespace-pre-wrap break-words font-sans text-xs select-text">
            {renderFormattedText(message.text)}
          </p>
        )}

        {/* Message Metadata (Time & Read Status) */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
            isCurrentUser
              ? "text-app-accent-fg/70"
              : isDeveloperSender
              ? "text-emerald-300/70"
              : "text-app-muted"
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>

          {/* Delivery & Read Receipts (for current user messages) */}
          {isCurrentUser && (
            <span className="flex items-center ml-0.5">
              {message.status === "sending" ? (
                <Clock size={11} className="animate-spin" />
              ) : message.status === "error" ? (
                <AlertCircle size={11} className="text-rose-400" title="Ошибка отправки" />
              ) : message.isRead ? (
                <CheckCheck size={13} className="text-sky-300" title="Прочитано" />
              ) : (
                <Check size={12} title="Отправлено" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Hover Actions (Delete) */}
      {isHovered && onDeleteMessage && (
        <div
          className={`absolute top-0 ${
            isCurrentUser ? "-left-8" : "-right-8"
          } flex items-center py-1`}
        >
          <button
            onClick={() => onDeleteMessage(message.id)}
            className="p-1 rounded-lg bg-app-card hover:bg-rose-500 hover:text-white text-app-muted border border-app-border transition cursor-pointer shadow-xs"
            title="Удалить сообщение"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatMessageItem;
