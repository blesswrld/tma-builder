import React from "react";
import { motion } from "motion/react";
import { Clock, Info, Phone as PhoneIcon, MapPin, Gift, Star, Music, MessageSquare } from "lucide-react";
import { Shop, parseMusicSettings } from "../../types";
import { useLanguage } from "../../context/LanguageContext";
import { ResponsiveImage } from "../common/ResponsiveImage";

interface ShopHeroProps {
  shop: Shop;
  onOpenInfo?: () => void;
  onOpenInfoModal?: () => void;
  reviewsStats?: { totalReviews: number; avgRating: number };
  onOpenReviews?: () => void;
  onOpenMusic?: () => void;
  onOpenMap?: () => void;
  onOpenChat?: () => void;
}

export const ShopHero: React.FC<ShopHeroProps> = ({
  shop,
  onOpenInfo,
  onOpenInfoModal,
  reviewsStats,
  onOpenReviews,
  onOpenMusic,
  onOpenMap,
  onOpenChat,
}) => {
  const { t } = useLanguage();
  const handleOpenInfo = onOpenInfoModal || onOpenInfo || (() => {});
  const musicSettings = parseMusicSettings(shop.musicSettings);
  const hasMusic = musicSettings.enabled !== false && Boolean(
    musicSettings.playlistUrl ||
    musicSettings.yandexMusicUrl ||
    musicSettings.spotifyUrl ||
    musicSettings.vkMusicUrl ||
    musicSettings.appleMusicUrl ||
    musicSettings.soundcloudUrl ||
    musicSettings.customStreamUrl ||
    (musicSettings.tracks && musicSettings.tracks.length > 0) ||
    musicSettings.sourceType === "radio" ||
    musicSettings.title
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-3xl bg-app-card border border-app-border overflow-hidden shadow-xs relative space-y-0 font-sans"
    >
      {/* Cover Banner Image or Gradient Hero */}
      <div className="relative h-32 xs:h-36 sm:h-52 w-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 overflow-hidden">
        {shop.bannerUrl ? (
          <ResponsiveImage
            src={shop.bannerUrl}
            alt={shop.name}
            preset="hero"
            priority={true}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        
        {/* Atmospheric Music Equalizer trigger on banner */}
        {hasMusic && onOpenMusic && (
          <button
            type="button"
            onClick={onOpenMusic}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 h-8 px-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center gap-2 text-xs font-mono hover:bg-black/80 transition-all cursor-pointer shadow-md group"
            title={musicSettings.title || "Музыка салона"}
          >
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 h-2 bg-emerald-400 animate-pulse rounded-full" />
              <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-75 rounded-full" />
              <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150 rounded-full" />
            </div>
            <span className="text-[11px] font-medium hidden xs:inline">{musicSettings.title || "Музыка"}</span>
          </button>
        )}

        {/* Status Badge in top right corner */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <span className="px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-md shadow-md border bg-black/60 text-white border-white/10">
            <span className={`w-2 h-2 rounded-full ${shop.isOpen !== false ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"}`} />
            <span>{shop.isOpen !== false ? t("shop.open", "Открыто") : t("shop.closed", "Закрыто")}</span>
          </span>
        </div>
      </div>

      {/* Shop Content Header Body */}
      <div className="px-4 sm:px-6 pb-5 pt-3 relative space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3.5">
            {/* Store Logo */}
            <div className={`-mt-10 sm:-mt-16 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-mono font-bold text-xl sm:text-2xl text-app-primary dark:text-white shrink-0 shadow-lg overflow-hidden border-2 border-app-card ${
              shop.logoUrl ? "bg-transparent" : "bg-app-surface dark:bg-zinc-800"
            }`}>
              {shop.logoUrl ? (
                <ResponsiveImage
                  src={shop.logoUrl}
                  alt={shop.name}
                  preset="avatar"
                  priority={true}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                shop.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="pt-1 sm:pt-0 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-app-primary dark:text-white truncate">
                  {shop.name}
                </h1>
                {reviewsStats && reviewsStats.totalReviews > 0 && onOpenReviews && (
                  <button
                    type="button"
                    onClick={onOpenReviews}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 transition-all text-xs font-mono font-bold cursor-pointer shrink-0 shadow-2xs"
                    title={t("shop.reviews", "Отзывы")}
                  >
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span>{reviewsStats.avgRating.toFixed(1)}</span>
                    <span className="text-app-muted font-normal text-[11px]">({reviewsStats.totalReviews})</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-muted font-mono mt-1">
                {shop.workingHours && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock size={13} className="text-app-muted shrink-0" />
                    <span>{shop.workingHours}</span>
                  </div>
                )}
                {shop.address && (
                  <button
                    type="button"
                    onClick={onOpenMap}
                    className="flex items-center gap-1 hover:text-emerald-500 transition-colors text-app-muted cursor-pointer truncate max-w-[200px] sm:max-w-xs text-left"
                    title="Посмотреть на карте"
                  >
                    <MapPin size={12} className="text-emerald-500 shrink-0" />
                    <span className="truncate">{shop.address}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actions: О заведении, Позвонить, Чат */}
          <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-end">
            <button
              type="button"
              onClick={handleOpenInfo}
              className="flex-1 sm:flex-initial h-9 px-3 sm:px-3.5 rounded-xl bg-app-surface border border-app-border hover:bg-app-hover hover:text-app-primary text-xs font-mono font-medium sm:font-semibold text-app-secondary transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-2xs active:scale-[0.98] min-w-[84px] whitespace-nowrap"
            >
              <Info size={14} className="text-app-muted shrink-0" />
              <span>{t("shop.about", "О заведении")}</span>
            </button>
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="flex-1 sm:flex-initial h-9 px-3 sm:px-3.5 rounded-xl bg-app-surface text-app-secondary hover:text-app-primary border border-app-border hover:bg-app-hover text-xs font-mono font-medium sm:font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-2xs active:scale-[0.98] min-w-[84px] whitespace-nowrap"
              >
                <PhoneIcon size={14} className="text-app-muted shrink-0" />
                <span>{t("shop.call", "Позвонить")}</span>
              </a>
            )}
            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="flex-1 sm:flex-initial h-9 px-3 sm:px-3.5 rounded-xl bg-app-surface text-app-secondary hover:text-app-primary border border-app-border hover:bg-app-hover text-xs font-mono font-medium sm:font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-2xs active:scale-[0.98] min-w-[84px] whitespace-nowrap"
              >
                <MessageSquare size={14} className="text-app-muted shrink-0" />
                <span>{t("shop.chat", "Чат")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Description / Welcome */}
        {shop.description && (
          <p className="text-xs sm:text-sm text-app-secondary leading-relaxed pt-0.5 whitespace-pre-line line-clamp-2">
            {shop.description}
          </p>
        )}
      </div>
    </motion.div>
  );
};
