import React from "react";
import { motion } from "motion/react";
import { Info, Phone as PhoneIcon, MapPin, Star, MessageSquare, Sparkles } from "lucide-react";
import { Shop, parseMusicSettings } from "../../types";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
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
  const { designMode } = useTheme();
  const isAtelier = designMode === "atelier";
  const handleOpenInfo = onOpenInfoModal || onOpenInfo || (() => {});
  const musicSettings = parseMusicSettings(shop.musicSettings);
  const hasMusic =
    musicSettings.enabled !== false &&
    Boolean(
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

  if (isAtelier) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-3xl bg-app-surface border border-app-border p-4 sm:p-6 shadow-md relative font-sans"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
          {/* Framed Editorial Visual */}
          <div className="lg:col-span-5 relative h-52 sm:h-64 w-full rounded-2xl overflow-hidden bg-stone-900 border border-app-border">
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
              <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

            {/* Music Trigger */}
            {hasMusic && onOpenMusic && (
              <button
                type="button"
                onClick={onOpenMusic}
                className="absolute top-3 left-3 z-10 h-8 px-3 rounded-full bg-black/70 backdrop-blur-xs border border-white/15 text-white flex items-center gap-2 text-xs font-mono hover:bg-black/90 transition-all cursor-pointer"
                title={musicSettings.title || "Музыка заведения"}
              >
                <div className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 h-2 bg-emerald-400 animate-pulse rounded-full" />
                  <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-75 rounded-full" />
                  <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150 rounded-full" />
                </div>
                <span className="text-[11px] font-medium">
                  {musicSettings.title || "Атмосфера"}
                </span>
              </button>
            )}

            {/* Status Pill */}
            <div className="absolute top-3 right-3 z-10">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium flex items-center gap-1.5 border bg-black/70 backdrop-blur-xs text-white border-white/15">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    shop.isOpen !== false ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"
                  }`}
                />
                <span>
                  {shop.isOpen !== false
                    ? t("shop.open", "Открыто")
                    : t("shop.closed", "Закрыто")}
                </span>
              </span>
            </div>

            {/* Bottom Crest */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-full bg-app-surface border-2 border-amber-200/40 overflow-hidden flex items-center justify-center font-editorial font-bold text-lg text-app-primary shadow-md">
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
              <span className="text-xs font-editorial italic text-amber-200/95 keep-white">
                Резиденция · /{shop.slug}
              </span>
            </div>
          </div>

          {/* Editorial Spread Content */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-editorial italic text-app-secondary">
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Авторская витрина и онлайн-заказ</span>
                </span>
                {reviewsStats && reviewsStats.totalReviews > 0 && onOpenReviews && (
                  <button
                    type="button"
                    onClick={onOpenReviews}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-app-bg hover:bg-app-hover text-app-primary border border-app-border transition-colors text-xs font-mono font-semibold cursor-pointer tabular-nums"
                    title={t("shop.reviews", "Отзывы")}
                  >
                    <Star size={11} className="fill-amber-500 text-amber-500" />
                    <span>{reviewsStats.avgRating.toFixed(1)}</span>
                    <span className="text-app-muted font-normal text-[11px]">
                      ({reviewsStats.totalReviews})
                    </span>
                  </button>
                )}
              </div>

              <h1 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-app-primary leading-[1.08]">
                {shop.name}
              </h1>

              {shop.description && (
                <p className="text-xs sm:text-sm text-app-secondary leading-relaxed whitespace-pre-line line-clamp-3">
                  {shop.description}
                </p>
              )}

              {/* Hours & Location */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-app-muted font-mono">
                {shop.workingHours && <span>Часы работы: {shop.workingHours}</span>}
                {shop.workingHours && shop.address && <span aria-hidden="true">·</span>}
                {shop.address && (
                  <button
                    type="button"
                    onClick={onOpenMap}
                    className="inline-flex items-center gap-1 hover:text-emerald-500 transition-colors text-app-secondary cursor-pointer truncate max-w-xs sm:max-w-md text-left font-sans"
                    title="Посмотреть на карте"
                  >
                    <MapPin size={12} className="text-amber-500 shrink-0" />
                    <span className="truncate">{shop.address}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Capsule Editorial Actions */}
            <div className="pt-3 border-t border-app-border flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenInfo}
                className="h-9 px-4 rounded-full bg-app-bg border border-app-border hover:bg-app-hover hover:text-app-primary text-xs font-medium text-app-secondary transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Info size={13} className="text-app-muted shrink-0" />
                <span>{t("shop.about", "О резиденции")}</span>
              </button>
              {shop.phone && (
                <a
                  href={`tel:${shop.phone}`}
                  className="h-9 px-4 rounded-full bg-app-bg text-app-secondary hover:text-app-primary border border-app-border hover:bg-app-hover text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <PhoneIcon size={13} className="text-app-muted shrink-0" />
                  <span>{t("shop.call", "Связаться")}</span>
                </a>
              )}
              {onOpenChat && (
                <button
                  type="button"
                  onClick={onOpenChat}
                  className="h-9 px-5 rounded-full bg-app-accent text-app-accent-fg hover:opacity-90 font-editorial font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                >
                  <MessageSquare size={13} className="shrink-0" />
                  <span>{t("shop.chat", "Личный консьерж")}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-xl bg-app-surface border border-app-border overflow-hidden relative font-sans"
    >
      {/* Cover Banner Image or Architectural Dark Slate Field */}
      <div className="relative h-36 sm:h-52 w-full bg-zinc-900 overflow-hidden border-b border-app-border">
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
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Atmospheric Music Equalizer trigger on banner */}
        {hasMusic && onOpenMusic && (
          <button
            type="button"
            onClick={onOpenMusic}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 h-8 px-2.5 rounded-lg bg-black/75 border border-white/15 text-white flex items-center gap-2 text-xs font-mono hover:bg-black/90 transition-all cursor-pointer"
            title={musicSettings.title || "Музыка заведения"}
          >
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 h-2 bg-emerald-400 animate-pulse rounded-full" />
              <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-75 rounded-full" />
              <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150 rounded-full" />
            </div>
            <span className="text-[11px] font-medium hidden xs:inline">
              {musicSettings.title || "Атмосфера"}
            </span>
          </button>
        )}

        {/* Status Indicator in top right corner */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border bg-black/75 text-white border-white/15">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                shop.isOpen !== false ? "bg-emerald-400" : "bg-zinc-400"
              }`}
            />
            <span>
              {shop.isOpen !== false
                ? t("shop.open", "Открыто")
                : t("shop.closed", "Закрыто")}
            </span>
          </span>
        </div>
      </div>

      {/* Architectural Storefront Identity & Action Strip */}
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
            {/* Store Logo */}
            <div
              className={`-mt-12 sm:-mt-14 w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center font-mono font-bold text-lg sm:text-xl text-app-primary shrink-0 overflow-hidden border-2 border-app-surface ${
                shop.logoUrl ? "bg-app-surface" : "bg-app-bg"
              }`}
            >
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

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-app-primary truncate">
                  {shop.name}
                </h1>
                {reviewsStats && reviewsStats.totalReviews > 0 && onOpenReviews && (
                  <button
                    type="button"
                    onClick={onOpenReviews}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-app-bg hover:bg-app-hover text-app-primary border border-app-border transition-colors text-xs font-mono font-semibold cursor-pointer shrink-0 tabular-nums"
                    title={t("shop.reviews", "Отзывы")}
                  >
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span>{reviewsStats.avgRating.toFixed(1)}</span>
                    <span className="text-app-muted font-normal text-[11px]">
                      ({reviewsStats.totalReviews})
                    </span>
                  </button>
                )}
              </div>

              {/* Unboxed Metadata Line with · Separators */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-app-muted font-mono">
                {shop.workingHours && <span>{shop.workingHours}</span>}
                {shop.workingHours && shop.address && <span aria-hidden="true">·</span>}
                {shop.address && (
                  <button
                    type="button"
                    onClick={onOpenMap}
                    className="inline-flex items-center gap-1 hover:text-emerald-500 transition-colors text-app-secondary cursor-pointer truncate max-w-[240px] sm:max-w-md text-left font-sans"
                    title="Посмотреть на карте"
                  >
                    <MapPin size={12} className="text-emerald-500 shrink-0" />
                    <span className="truncate">{shop.address}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Primary Storefront Actions */}
          <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-end shrink-0">
            <button
              type="button"
              onClick={handleOpenInfo}
              className="flex-1 sm:flex-initial h-8 px-3 rounded-lg bg-app-bg border border-app-border hover:bg-app-hover hover:text-app-primary text-xs font-mono font-medium text-app-secondary transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Info size={13} className="text-app-muted shrink-0" />
              <span>{t("shop.about", "Инфо")}</span>
            </button>
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="flex-1 sm:flex-initial h-8 px-3 rounded-lg bg-app-bg text-app-secondary hover:text-app-primary border border-app-border hover:bg-app-hover text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <PhoneIcon size={13} className="text-app-muted shrink-0" />
                <span>{t("shop.call", "Звонок")}</span>
              </a>
            )}
            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="flex-1 sm:flex-initial h-8 px-3 rounded-lg bg-app-accent text-app-accent-fg hover:opacity-90 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <MessageSquare size={13} className="shrink-0" />
                <span>{t("shop.chat", "Написать")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Store Description separated by 1px hairline */}
        {shop.description && (
          <p className="text-xs sm:text-sm text-app-secondary leading-relaxed pt-3 border-t border-app-border whitespace-pre-line line-clamp-2">
            {shop.description}
          </p>
        )}
      </div>
    </motion.section>
  );
};
