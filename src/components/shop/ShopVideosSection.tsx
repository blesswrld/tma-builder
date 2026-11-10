import React, { useState } from "react";
import { Video, ExternalLink, Play, Film, Sparkles } from "lucide-react";
import { ShopVideo, parseShopVideos } from "../../lib/videoUtils";

interface ShopVideosSectionProps {
  videos?: string | ShopVideo[] | null;
  className?: string;
}

export const ShopVideosSection: React.FC<ShopVideosSectionProps> = ({
  videos: rawVideos,
  className = "",
}) => {
  const videos = parseShopVideos(rawVideos);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!videos || videos.length === 0) {
    return null;
  }

  const currentVideo = videos[activeIdx] || videos[0];

  const getPlatformBadge = (type: ShopVideo["type"]) => {
    switch (type) {
      case "youtube":
        return {
          label: "YouTube",
          bg: "bg-red-500/10 text-red-500 border-red-500/30",
          dot: "bg-red-500",
        };
      case "vk":
        return {
          label: "VK Видео",
          bg: "bg-sky-500/10 text-sky-500 border-sky-500/30",
          dot: "bg-sky-500",
        };
      case "rutube":
        return {
          label: "RuTube",
          bg: "bg-blue-600/10 text-blue-400 border-blue-500/30",
          dot: "bg-blue-500",
        };
      default:
        return {
          label: "Видеофайл",
          bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
          dot: "bg-emerald-500",
        };
    }
  };

  const badgeInfo = getPlatformBadge(currentVideo.type);

  return (
    <div className={`p-3 sm:p-3.5 bg-app-card border border-app-border rounded-2xl space-y-3 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
            <Film size={13} />
          </div>
          <div>
            <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">
              Видео о заведении и услугах
            </span>
            <span className="text-xs font-bold text-app-primary">
              {currentVideo.title || (videos.length > 1 ? `Видео ${activeIdx + 1}` : "Видеопрезентация")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold flex items-center gap-1.5 ${badgeInfo.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badgeInfo.dot} animate-pulse`} />
            {badgeInfo.label}
          </span>
        </div>
      </div>

      {/* Tabs if there are 2 videos */}
      {videos.length > 1 && (
        <div className="flex gap-1.5 p-1 bg-app-surface border border-app-border rounded-xl font-mono text-[11px]">
          {videos.map((vid, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <button
                key={vid.id || idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`flex-1 py-1 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate ${
                  isSelected
                    ? "bg-app-card text-app-primary shadow-xs border border-app-border/80"
                    : "text-app-muted hover:text-app-primary"
                }`}
              >
                <Play size={10} className={isSelected ? "text-emerald-500 fill-emerald-500" : "text-app-muted"} />
                <span className="truncate">
                  {vid.title ? vid.title : `Ролик ${idx + 1}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Video Player Container */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-app-border shadow-inner">
        {currentVideo.type === "file" ? (
          <video
            key={currentVideo.url}
            src={currentVideo.url}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
          >
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        ) : (
          <iframe
            key={currentVideo.embedUrl || currentVideo.url}
            src={currentVideo.embedUrl || currentVideo.url}
            title={currentVideo.title || "Видео о заведении"}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>

      {/* Footer link to source if it's an external URL */}
      {currentVideo.type !== "file" && currentVideo.url && (
        <div className="flex items-center justify-between text-[11px] pt-0.5 text-app-muted font-mono">
          <span className="text-[10px] text-app-muted truncate">
            {currentVideo.title ? "Официальное видео заведения" : "Презентация услуг и атмосферы"}
          </span>
          <a
            href={currentVideo.url}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-500 hover:text-emerald-400 font-semibold flex items-center gap-1 hover:underline shrink-0 ml-2"
          >
            <span>В источнике</span>
            <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
};

export default ShopVideosSection;
