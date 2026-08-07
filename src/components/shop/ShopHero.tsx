import React from "react";
import { Clock, Info, Phone as PhoneIcon, MapPin, Gift, Truck, Store, Send, ExternalLink, MessageCircle, Globe } from "lucide-react";
import { Shop, parseSocialLinks, parseDeliveryOptions } from "../../types";

interface ShopHeroProps {
  shop: Shop;
  onOpenInfo?: () => void;
  onOpenInfoModal?: () => void;
  reviewsStats?: { totalReviews: number; avgRating: number };
  onOpenReviews?: () => void;
}

export const ShopHero: React.FC<ShopHeroProps> = ({
  shop,
  onOpenInfo,
  onOpenInfoModal,
  reviewsStats,
  onOpenReviews,
}) => {
  const handleOpenInfo = onOpenInfoModal || onOpenInfo || (() => {});
  const socials = parseSocialLinks(shop.socialLinks);
  const delivery = parseDeliveryOptions(shop.deliveryOptions);
  const hasSocials = Boolean(socials.telegram || socials.instagram || socials.whatsapp || socials.vk || socials.website);

  return (
    <div className="rounded-3xl bg-app-card border border-app-border overflow-hidden shadow-sm relative space-y-0">
      {/* Cover Banner Image or Gradient Hero */}
      <div className="relative h-36 sm:h-52 w-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 overflow-hidden">
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
          <span className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-md shadow-md border ${
            shop.isOpen !== false 
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
              : "bg-rose-500/20 text-rose-400 border-rose-500/40"
          }`}>
            <span className={`w-2 h-2 rounded-full ${shop.isOpen !== false ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" : "bg-rose-400"}`} />
            <span>{shop.isOpen !== false ? "Открыто" : "Закрыто"}</span>
          </span>
        </div>
      </div>

      {/* Shop Content Header Body */}
      <div className="px-5 sm:px-6 pb-6 pt-3 relative space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3.5">
            {/* Store Logo */}
            <div className="-mt-12 sm:-mt-16 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-app-surface flex items-center justify-center font-mono font-bold text-2xl text-app-primary shrink-0 shadow-lg overflow-hidden">
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                shop.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="pt-1 sm:pt-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-app-primary">{shop.name}</h1>
              {shop.workingHours && (
                <div className="flex items-center gap-1.5 text-xs text-app-muted font-mono mt-1">
                  <Clock size={13} className="text-amber-500 shrink-0" />
                  <span>{shop.workingHours}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions / Info trigger */}
          <div className="flex items-center gap-2 self-start sm:self-end">
            <button
              type="button"
              onClick={handleOpenInfo}
              className="px-3.5 py-2 rounded-xl bg-app-surface border border-app-border hover:border-amber-500/50 hover:text-app-primary text-xs font-mono font-semibold text-app-secondary transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Info size={14} className="text-amber-500 shrink-0" />
              <span>О заведении</span>
            </button>
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <PhoneIcon size={14} />
                <span className="hidden xs:inline">Позвонить</span>
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
            <div className="px-3 py-1.5 rounded-xl bg-app-surface text-app-secondary flex items-center gap-2">
              <MapPin size={13} className="text-rose-400 shrink-0" />
              <span className="truncate max-w-[220px] sm:max-w-xs">{shop.address}</span>
            </div>
          )}

          {shop.cashbackPercent ? (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 flex items-center gap-2 font-bold">
              <Gift size={13} className="shrink-0" />
              <span>Кэшбэк {shop.cashbackPercent}%</span>
            </div>
          ) : null}

          {(delivery.courier || delivery.deliveryMinOrder || delivery.deliveryFee) && (
            <div className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-400 flex items-center gap-2">
              <Truck size={13} className="shrink-0" />
              <span>Доставка</span>
            </div>
          )}

          {(delivery.pickup || delivery.pickupAddress) && (
            <div className="px-3 py-1.5 rounded-xl bg-app-surface text-app-secondary flex items-center gap-2">
              <Store size={13} className="text-indigo-400 shrink-0" />
              <span>Самовывоз</span>
            </div>
          )}
        </div>

        {/* Social Networks Row */}
        {hasSocials && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-app-border/40">
            <span className="text-[10px] font-mono text-app-muted uppercase mr-1">Соцсети и связь:</span>
            {socials.telegram && (
              <a
                href={socials.telegram.startsWith("http") ? socials.telegram : `https://t.me/${socials.telegram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
              >
                <Send size={12} />
                <span>Telegram</span>
              </a>
            )}
            {socials.instagram && (
              <a
                href={socials.instagram.startsWith("http") ? socials.instagram : `https://instagram.com/${socials.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-pink-500/15 text-pink-400 hover:bg-pink-500/25 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink size={12} />
                <span>Instagram</span>
              </a>
            )}
            {socials.whatsapp && (
              <a
                href={socials.whatsapp.startsWith("http") ? socials.whatsapp : `https://wa.me/${socials.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle size={12} />
                <span>WhatsApp</span>
              </a>
            )}
            {socials.vk && (
              <a
                href={socials.vk.startsWith("http") ? socials.vk : `https://vk.com/${socials.vk}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
              >
                <Globe size={12} />
                <span>ВКонтакте</span>
              </a>
            )}
            {socials.website && (
              <a
                href={socials.website.startsWith("http") ? socials.website : `https://${socials.website}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-app-surface text-app-primary hover:bg-app-hover text-[11px] font-mono flex items-center gap-1.5 transition-colors"
              >
                <Globe size={12} />
                <span>Сайт</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
