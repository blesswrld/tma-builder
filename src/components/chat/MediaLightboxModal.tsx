import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Play, Maximize2, FileText, Check } from "lucide-react";

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string | null;
  mediaType: "image" | "video" | "file" | null;
  mediaName?: string | null;
  mediaSize?: number | null;
  senderName?: string | null;
  timestamp?: string | null;
}

export function formatBytes(bytes?: number | null, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 Б";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function MediaLightboxModal({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  mediaName,
  mediaSize,
  senderName,
  timestamp,
}: MediaLightboxModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
    }
  }, [isOpen, mediaUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoomLevel((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === "-") {
        setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === "0") {
        setZoomLevel(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mediaUrl) return null;

  const handleDownload = () => {
    try {
      const a = document.createElement("a");
      a.href = mediaUrl;
      a.download = mediaName || (mediaType === "video" ? "video.mp4" : "image.jpg");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      window.open(mediaUrl, "_blank");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mediaUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md select-none">
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Top Control Bar */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-4 sm:px-6 z-20 pointer-events-auto">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
              {mediaType === "video" ? (
                <Play size={18} className="text-indigo-400" />
              ) : (
                <Maximize2 size={18} className="text-emerald-400" />
              )}
            </div>
            <div className="min-w-0 max-w-xs sm:max-w-md">
              <p className="text-sm font-semibold truncate text-white">
                {mediaName || (mediaType === "video" ? "Видео" : "Изображение")}
              </p>
              <p className="text-xs text-slate-400">
                {formatBytes(mediaSize)} {senderName ? `• ${senderName}` : ""} {timestamp ? `• ${timestamp}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mediaType === "image" && (
              <div className="hidden sm:flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                  title="Уменьшить (-)"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono text-slate-300 px-1.5 min-w-[42px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 3))}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                  title="Увеличить (+)"
                >
                  <ZoomIn size={16} />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                    title="Сбросить масштаб (0)"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-medium backdrop-blur-sm transition cursor-pointer"
              title="Скачать файл"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Скачать</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 border border-white/10 text-white hover:text-white transition backdrop-blur-sm cursor-pointer ml-1"
              title="Закрыть (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewport */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18 }}
          className="relative z-10 max-w-[95vw] max-h-[85vh] flex items-center justify-center p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {mediaType === "video" ? (
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 max-h-[80vh] flex items-center justify-center">
              <video
                src={mediaUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[78vh] max-w-[92vw] w-auto h-auto rounded-xl object-contain"
              >
                Ваш браузер не поддерживает воспроизведение видео.
              </video>
            </div>
          ) : mediaType === "image" ? (
            <div className="relative overflow-auto max-h-[80vh] max-w-[92vw] flex items-center justify-center">
              <img
                src={mediaUrl}
                alt={mediaName || "Медиафайл"}
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: "transform 0.15s ease-out",
                }}
                className="max-h-[78vh] max-w-[92vw] w-auto h-auto object-contain rounded-xl shadow-2xl cursor-zoom-in select-none"
                onClick={() => setZoomLevel((prev) => (prev > 1.2 ? 1 : 1.75))}
              />
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-700 text-center text-white max-w-sm">
              <FileText size={48} className="mx-auto text-indigo-400 mb-3" />
              <p className="font-semibold text-sm mb-1">{mediaName || "Файл"}</p>
              <p className="text-xs text-slate-400 mb-4">{formatBytes(mediaSize)}</p>
              <button
                onClick={handleDownload}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition"
              >
                Скачать документ
              </button>
            </div>
          )}
        </motion.div>

        {/* Bottom Bar Info */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center items-center z-20 pointer-events-none">
          <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 text-xs flex items-center gap-3 pointer-events-auto">
            <span>{mediaType === "video" ? "🎬 Видеофайл" : "🖼️ Изображение"}</span>
            <span className="text-slate-500">•</span>
            <button
              onClick={handleCopyLink}
              className="text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Ссылка скопирована</span>
                </>
              ) : (
                <span>Копировать ссылку</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
