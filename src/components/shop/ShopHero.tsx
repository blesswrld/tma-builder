import React from "react";
import { motion } from "motion/react";
import { Clock, Info, Phone as PhoneIcon, MapPin, Gift, Truck, Store, Send, ExternalLink, MessageCircle, Globe, Music } from "lucide-react";
import { Shop, parseSocialLinks, parseDeliveryOptions, parseMusicSettings } from "../../types";

interface ShopHeroProps {
  shop: Shop;
  onOpenInfo?: () => void;
  onOpenInfoModal?: () => void;
  reviewsStats?: { totalReviews: number; avgRating: number };
  onOpenReviews?: () => void;
  onOpenMusic?: () => void;
}

export const ShopHero: React.FC<ShopHeroProps> = ({
  shop,
  onOpenInfo,
  onOpenInfoModal,
  reviewsStats,
  onOpenReviews,
  onOpenMusic,
}) => {
  const handleOpenInfo = onOpenInfoModal || onOpenInfo || (() => {});
  const socials = parseSocialLinks(shop.socialLinks);
  const delivery = parseDeliveryOptions(shop.deliveryOptions);
  const musicSettings = parseMusicSettings(shop.musicSettings);
  const hasSocials = Boolean(socials.telegram || socials.instagram || socials.whatsapp || socials.vk || socials.website);
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
          <img
            src={shop.bannerUrl}
            alt={shop.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Status Badge in top right corner */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <span className="px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-md shadow-md border bg-black/60 text-white border-white/10">
            <span className={`w-2 h-2 rounded-full ${shop.isOpen !== false ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"}`} />
            <span>{shop.isOpen !== false ? "Открыто" : "Закрыто"}</span>
          </span>
        </div>
      </div>

      {/* Shop Content Header Body */}
      <div className="px-4 sm:px-6 pb-6 pt-3 relative space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3.5">
            {/* Store Logo */}
            <div className={`-mt-10 sm:-mt-16 w-18 h-18 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-mono font-bold text-xl sm:text-2xl text-app-primary shrink-0 shadow-lg overflow-hidden border-2 border-app-card ${
              shop.logoUrl ? "bg-transparent" : "bg-app-surface"
            }`}>
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                shop.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="pt-1 sm:pt-0 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-app-primary truncate">{shop.name}</h1>
              {shop.workingHours && (
                <div className="flex items-center gap-1.5 text-xs text-app-muted font-mono mt-1">
                  <Clock size={13} className="text-app-muted shrink-0" />
                  <span>{shop.workingHours}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions / Info trigger */}
          <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-end">
            <button
              type="button"
              onClick={handleOpenInfo}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-app-surface border border-app-border hover:bg-app-hover hover:text-app-primary text-xs font-mono font-semibold text-app-secondary transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs backdrop-blur-sm"
            >
              <Info size={14} className="text-app-muted shrink-0" />
              <span>О заведении</span>
            </button>
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-app-surface text-app-primary border border-app-border hover:bg-app-hover text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs backdrop-blur-sm"
              >
                <PhoneIcon size={14} className="text-app-muted" />
                <span>Позвонить</span>
              </a>
            )}
          </div>
        </div>

        {/* Description / Welcome */}
        {shop.description && (
          <p className="text-xs sm:text-sm text-app-secondary leading-relaxed pt-1 whitespace-pre-line">
            {shop.description}
          </p>
        )}

        {/* Quick Details Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
          {shop.address && (
            <div className="px-3 py-1.5 rounded-xl bg-app-surface border border-app-border text-app-secondary flex items-center gap-2">
              <MapPin size={13} className="text-app-muted shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-xs">{shop.address}</span>
            </div>
          )}

          {Boolean(shop.cashbackPercent && Number(shop.cashbackPercent) > 0) && (
            <div className="px-3 py-1.5 rounded-xl bg-app-surface border border-app-border text-app-primary flex items-center gap-2 font-medium">
              <Gift size={13} className="shrink-0 text-app-muted" />
              <span>Кэшбэк {shop.cashbackPercent}%</span>
            </div>
          )}

          {delivery.enabled !== false && (delivery.courier !== false || Boolean(delivery.shipping)) && (
            <div className="px-3 py-1.5 rounded-xl bg-app-surface border border-app-border text-app-primary flex items-center gap-2 font-medium">
              <Truck size={13} className="shrink-0 text-app-muted" />
              <span>Доставка</span>
            </div>
          )}

          {delivery.enabled !== false && delivery.pickup !== false && (
            <div className="px-3 py-1.5 rounded-xl bg-app-surface border border-app-border text-app-secondary flex items-center gap-2">
              <Store size={13} className="text-app-muted shrink-0" />
              <span>Самовывоз</span>
            </div>
          )}

          {hasMusic && onOpenMusic && (
            <button
              type="button"
              onClick={onOpenMusic}
              className="px-3 py-1.5 rounded-xl bg-app-surface hover:bg-app-hover border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Music size={13} className="text-emerald-400 shrink-0" />
              <span>{musicSettings.title || "Музыка салона"}</span>
            </button>
          )}
        </div>

        {/* Social Networks Row */}
        {hasSocials && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-app-border/40">
            <span className="text-[10px] font-mono text-app-muted uppercase mr-1">Соцсети:</span>
            {socials.telegram && (
              <a
                href={socials.telegram.startsWith("http") ? socials.telegram : `https://t.me/${socials.telegram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-app-surface border border-app-border text-app-primary hover:bg-app-hover text-[11px] font-mono font-medium flex items-center gap-1.5 transition-all backdrop-blur-sm"
              >
                <Send size={12} className="text-app-muted" />
                <span>Telegram</span>
              </a>
            )}
            {socials.instagram && (
              <a
                href={socials.instagram.startsWith("http") ? socials.instagram : `https://instagram.com/${socials.instagram}`}
                target="_blank"
                rel="noreferrer"
                title="* Instagram принадлежит компании Meta Platforms Inc., признанной экстремистской организацией и запрещенной на территории РФ"
                className="px-2.5 py-1 rounded-lg bg-app-surface border border-app-border text-app-primary hover:bg-app-hover text-[11px] font-mono font-medium flex items-center gap-1.5 transition-all backdrop-blur-sm"
              >
                <ExternalLink size={12} className="text-app-muted" />
                <span>Instagram*</span>
              </a>
            )}
            {socials.whatsapp && (
              <a
                href={socials.whatsapp.startsWith("http") ? socials.whatsapp : `https://wa.me/${socials.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                title="* WhatsApp принадлежит компании Meta Platforms Inc., признанной экстремистской организацией и запрещенной на территории РФ"
                className="px-2.5 py-1 rounded-lg bg-app-surface border border-app-border text-app-primary hover:bg-app-hover text-[11px] font-mono font-medium flex items-center gap-1.5 transition-all backdrop-blur-sm"
              >
                <MessageCircle size={12} className="text-app-muted" />
                <span>WhatsApp*</span>
              </a>
            )}
            {socials.vk && (
              <a
                href={socials.vk.startsWith("http") ? socials.vk : `https://vk.com/${socials.vk}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-app-surface border border-app-border text-app-primary hover:bg-app-hover text-[11px] font-mono font-medium flex items-center gap-1.5 transition-all backdrop-blur-sm"
              >
                <Globe size={12} className="text-app-muted" />
                <span>ВКонтакте</span>
              </a>
            )}
            {socials.website && (
              <a
                href={socials.website.startsWith("http") ? socials.website : `https://${socials.website}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-app-surface border border-app-border text-app-primary hover:bg-app-hover text-[11px] font-mono flex items-center gap-1.5 transition-all backdrop-blur-sm"
              >
                <Globe size={12} className="text-app-muted" />
                <span>Сайт</span>
              </a>
            )}
          </div>
        )}

        {/* Meta Disclaimer Note */}
        {hasSocials && (socials.instagram || socials.whatsapp) && (
          <div
            className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-mono space-y-0.5 leading-tight"
            style={{ color: "oklch(0.78 0.18 87.53)" }}
          >
            <strong className="block font-bold">* Примечание о маркировке:</strong>
            <p>
              Instagram, WhatsApp и Facebook принадлежат компании Meta Platforms Inc., признанной экстремистской организацией и запрещенной на территории РФ.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
