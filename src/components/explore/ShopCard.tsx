import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Star,
  MapPin,
  Clock,
  Truck,
  Percent,
  Heart,
  ChevronRight,
  ExternalLink,
  Store,
  Sparkles,
} from "lucide-react";
import { PublicShop } from "../../types";

interface ShopCardProps {
  shop: PublicShop;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  viewMode?: "grid" | "list";
}

export const ShopCard: React.FC<ShopCardProps> = ({
  shop,
  isFavorite,
  onToggleFavorite,
  viewMode = "grid",
}) => {
  const hasDelivery = Boolean(
    shop.deliveryOptions &&
      (shop.deliveryOptions.enabled ||
        shop.deliveryOptions.courier ||
        shop.deliveryOptions.shipping)
  );

  const fallbackBanner =
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800";

  const bannerImg = shop.bannerUrl || fallbackBanner;

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="group relative bg-app-surface border border-app-border hover:border-app-border-focus rounded-2xl p-4 transition-all hover:shadow-md flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        {/* Banner / Avatar Thumbnail */}
        <div className="relative w-full sm:w-36 h-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-app-card border border-app-border">
          <img
            src={bannerImg}
            alt={shop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />
          
          {/* Logo badge */}
          <div className="absolute bottom-2 left-2 w-9 h-9 rounded-lg bg-app-surface border border-app-border p-0.5 shadow-sm overflow-hidden flex items-center justify-center font-bold text-xs">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover rounded-md" />
            ) : (
              <Store size={16} className="text-app-muted" />
            )}
          </div>

          {/* Status Indicator */}
          <div className="absolute top-2 left-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium shadow-xs ${
                shop.isOpen
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${shop.isOpen ? "bg-white animate-pulse" : "bg-zinc-400"}`} />
              {shop.isOpen ? "Открыто" : "Закрыто"}
            </span>
          </div>
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0 space-y-1.5 w-full">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/${shop.slug}`}
                className="font-bold text-sm sm:text-base text-app-primary hover:text-emerald-500 transition-colors truncate group-hover:underline"
              >
                {shop.name}
              </Link>
              {shop.cashbackPercent && shop.cashbackPercent > 0 ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Percent size={10} />
                  {shop.cashbackPercent}% кэшбэк
                </span>
              ) : null}
            </div>

            {shop.description && (
              <p className="text-xs text-app-muted line-clamp-1 mt-0.5">
                {shop.description}
              </p>
            )}
          </div>

          {/* Meta specs */}
          <div className="flex items-center gap-3 text-xs text-app-muted flex-wrap pt-0.5">
            <div className="flex items-center gap-1 font-mono font-semibold text-amber-500">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              <span>{shop.avgRating.toFixed(1)}</span>
              <span className="text-app-muted font-normal text-[11px]">
                ({shop.reviewsCount})
              </span>
            </div>

            {shop.address && (
              <div className="flex items-center gap-1 text-[11px] max-w-[220px] truncate">
                <MapPin size={12} className="shrink-0 text-app-muted" />
                <span className="truncate">{shop.address}</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-[11px]">
              <Clock size={12} className="shrink-0 text-app-muted" />
              <span>{shop.workingHours || "10:00 – 22:00"}</span>
            </div>

            {hasDelivery && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Truck size={12} className="shrink-0" />
                <span>Доставка</span>
              </div>
            )}
          </div>

          {/* Categories */}
          {shop.categories && shop.categories.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {shop.categories.slice(0, 4).map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-app-card border border-app-border text-app-secondary"
                >
                  {cat}
                </span>
              ))}
              {shop.categories.length > 4 && (
                <span className="text-[10px] text-app-muted font-mono">
                  +{shop.categories.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Actions Column: Favorite and Action button unified and aligned */}
        <div className="w-full sm:w-auto shrink-0 flex items-center justify-end gap-2 pt-2 sm:pt-0 sm:self-center">
          {/* Favorite button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(shop.id);
            }}
            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isFavorite
                ? "bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-2xs"
                : "bg-app-card hover:bg-app-hover border-app-border text-app-muted hover:text-rose-500"
            }`}
            title={isFavorite ? "Удалить из избранного" : "В избранное"}
          >
            <Heart size={16} className={isFavorite ? "fill-current" : ""} />
          </button>

          {/* Action Button */}
          <Link
            to={`/${shop.slug}`}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold bg-app-accent text-app-accent-fg hover:opacity-90 active:scale-[0.98] transition-all shadow-xs whitespace-nowrap"
          >
            <span>В заведение</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </motion.div>
    );
  }

  // Grid view (Default)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col h-full bg-app-surface border border-app-border hover:border-app-border-focus rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200"
    >
      {/* Banner & Overlay */}
      <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-app-card">
        <img
          src={bannerImg}
          alt={shop.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Top bar over banner: Status badge & Favorite heart */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium shadow-sm ${
              shop.isOpen
                ? "bg-emerald-600 text-white"
                : "bg-zinc-900 text-zinc-300"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                shop.isOpen ? "bg-white animate-pulse" : "bg-zinc-400"
              }`}
            />
            {shop.isOpen ? "Открыто" : "Закрыто"}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(shop.id);
            }}
            className={`p-2 rounded-full transition-all pointer-events-auto cursor-pointer shadow-sm ${
              isFavorite
                ? "bg-rose-500 text-white shadow-rose-500/20"
                : "bg-black/60 hover:bg-black/80 text-white/90 hover:text-white"
            }`}
            title={isFavorite ? "В избранном" : "Добавить в избранное"}
          >
            <Heart size={15} className={isFavorite ? "fill-current" : ""} />
          </button>
        </div>

        {/* Delivery & Cashback tags over banner bottom-left */}
        <div className="absolute bottom-3 left-3 right-16 flex items-center gap-1.5 flex-wrap">
          {hasDelivery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/75 text-emerald-300 border border-emerald-500/30">
              <Truck size={11} />
              Доставка
            </span>
          )}
          {shop.cashbackPercent && shop.cashbackPercent > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/75 text-amber-300 border border-amber-500/30">
              <Percent size={11} />
              {shop.cashbackPercent}% кэшбэк
            </span>
          ) : null}
        </div>

        {/* Logo Avatar floating */}
        <div className="absolute -bottom-4 right-3 w-12 h-12 rounded-xl bg-app-surface p-0.5 border-2 border-app-surface shadow-md overflow-hidden flex items-center justify-center font-bold text-sm">
          {shop.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt={shop.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Store size={20} className="text-app-muted" />
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 pt-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2.5">
          {/* Shop Title & Rating */}
          <div className="flex items-start justify-between gap-2 min-h-[1.5rem]">
            <Link
              to={`/${shop.slug}`}
              className="font-bold text-sm sm:text-base text-app-primary hover:text-emerald-500 transition-colors line-clamp-1 group-hover:underline"
              title={shop.name}
            >
              {shop.name}
            </Link>

            <div className="flex items-center gap-1 font-mono font-bold text-xs text-amber-500 shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span>{shop.avgRating.toFixed(1)}</span>
              <span className="text-app-muted font-normal text-[10px]">
                ({shop.reviewsCount})
              </span>
            </div>
          </div>

          {/* Description with fixed min-height for uniform layout */}
          <div className="min-h-[2.5rem]">
            <p className="text-xs text-app-muted line-clamp-2 leading-relaxed">
              {shop.description || (shop.categories?.length ? `Категории: ${shop.categories.slice(0, 3).join(", ")}` : "Качественный сервис и актуальные предложения")}
            </p>
          </div>

          {/* Address & Hours with uniform height */}
          <div className="space-y-1 text-[11px] text-app-muted pt-1 border-t border-app-border/60 min-h-[2.6rem] flex flex-col justify-center">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin size={12} className="shrink-0 text-app-muted" />
              <span className="truncate">{shop.address || "Адрес уточняется у администратора"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="shrink-0 text-app-muted" />
              <span>{shop.workingHours || "10:00 – 22:00"}</span>
            </div>
          </div>

          {/* Fixed height (64px) preview of featured items for uniform card heights */}
          <div className="pt-2">
            <div className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Sparkles size={10} className="text-amber-500" />
                <span>Популярные позиции:</span>
              </div>
              <span className="text-[10px] font-mono text-app-muted">
                {shop.servicesCount} поз.
              </span>
            </div>

            <div className="space-y-1.5 h-[62px]">
              {shop.featuredServices && shop.featuredServices.length > 0 ? (
                <>
                  {shop.featuredServices.slice(0, 2).map((srv) => (
                    <div
                      key={srv.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-app-card/70 border border-app-border/50"
                    >
                      <span className="truncate text-app-primary font-medium text-[11px]">
                        {srv.title}
                      </span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] shrink-0 ml-2">
                        {srv.price} {shop.currencySymbol || "₽"}
                      </span>
                    </div>
                  ))}
                  {shop.featuredServices.length === 1 && (
                    <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-app-card/40 border border-app-border/30 text-app-muted">
                      <span className="truncate text-[11px]">И другие позиции в меню</span>
                      <span className="text-[11px] font-mono">от 150 ₽</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-app-card/60 border border-app-border/40 text-app-muted">
                    <span className="truncate text-[11px]">Фирменное меню заведения</span>
                    <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      В меню
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-app-card/40 border border-app-border/30 text-app-muted">
                    <span className="truncate text-[11px]">Быстрый заказ через WebApp</span>
                    <span className="text-[10px] font-mono text-app-muted">Telegram</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions pinned to bottom */}
        <div className="mt-auto pt-3 border-t border-app-border flex items-center justify-between gap-2">
          <div className="text-[11px] font-mono text-app-muted">
            Позиций в меню: <span className="font-bold text-app-primary">{shop.servicesCount}</span>
          </div>

          <Link
            to={`/${shop.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-app-accent text-app-accent-fg hover:opacity-90 active:scale-[0.98] transition-all shadow-xs"
          >
            <span>В меню</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
