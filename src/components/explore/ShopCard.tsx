import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Star,
  Heart,
  ChevronRight,
  ArrowUpRight,
  Store,
  MessageSquare,
} from "lucide-react";
import { PublicShop } from "../../types";
import { ResponsiveImage } from "../common/ResponsiveImage";
import { useTheme } from "../../context/ThemeContext";

interface ShopCardProps {
  shop: PublicShop;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenChat?: (shop: PublicShop) => void;
  viewMode?: "grid" | "list";
}

export const ShopCard: React.FC<ShopCardProps> = ({
  shop,
  isFavorite,
  onToggleFavorite,
  onOpenChat,
  viewMode = "grid",
}) => {
  const { designMode } = useTheme();
  const isAtelier = designMode === "atelier";

  const hasDelivery = Boolean(
    shop.deliveryOptions &&
      (shop.deliveryOptions.enabled ||
        shop.deliveryOptions.courier ||
        shop.deliveryOptions.shipping)
  );

  const bannerImg = shop.bannerUrl || "";

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`group relative bg-app-surface border border-app-border hover:border-app-secondary/40 p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
          isAtelier ? "rounded-3xl shadow-sm" : "rounded-xl"
        }`}
      >
        {/* Banner / Avatar Thumbnail */}
        <Link
          to={`/${shop.slug}`}
          className={`relative w-full sm:w-44 h-28 overflow-hidden shrink-0 bg-app-bg border border-app-border block ${
            isAtelier ? "rounded-2xl" : "rounded-lg"
          }`}
        >
          {bannerImg ? (
            <ResponsiveImage
              src={bannerImg}
              alt={shop.name}
              preset="thumbnail"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-app-bg text-app-muted">
              <Store size={22} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Status Indicator */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/75 text-white text-[10px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                shop.isOpen ? "bg-emerald-400" : "bg-zinc-400"
              }`}
            />
            <span>{shop.isOpen ? "Открыто" : "Закрыто"}</span>
          </div>
        </Link>

        {/* Info Column */}
        <div className="flex-1 min-w-0 space-y-1.5 w-full">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to={`/${shop.slug}`}
              className={`font-bold text-app-primary hover:text-emerald-500 transition-colors truncate ${
                isAtelier ? "font-editorial text-xl tracking-tight" : "text-base"
              }`}
            >
              {shop.name}
            </Link>
            <div className="flex items-center gap-1 font-mono text-xs font-semibold text-app-primary tabular-nums">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span>{shop.avgRating.toFixed(1)}</span>
              <span className="text-app-muted font-normal">
                ({shop.reviewsCount})
              </span>
            </div>
          </div>

          {shop.description && (
            <p className="text-xs text-app-secondary line-clamp-1">
              {shop.description}
            </p>
          )}

          {/* Unboxed Metadata Row with · Separators */}
          <div className="flex items-center gap-2 text-xs text-app-muted flex-wrap pt-0.5 font-mono">
            <span>{shop.workingHours || "10:00 – 22:00"}</span>
            {shop.address && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[240px] font-sans">{shop.address}</span>
              </>
            )}
            {hasDelivery && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-app-secondary font-sans">Доставка</span>
              </>
            )}
            {shop.cashbackPercent && shop.cashbackPercent > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Кэшбэк {shop.cashbackPercent}%
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right Actions Column */}
        <div className="w-full sm:w-auto shrink-0 flex items-center justify-end gap-2 pt-2 sm:pt-0 sm:self-center">
          {onOpenChat && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenChat(shop);
              }}
              className="h-8 w-8 rounded-lg border border-app-border bg-app-bg hover:bg-app-hover text-app-muted hover:text-app-primary flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Написать продавцу"
            >
              <MessageSquare size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(shop.id);
            }}
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              isFavorite
                ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                : "bg-app-bg hover:bg-app-hover border-app-border text-app-muted hover:text-rose-500"
            }`}
            title={isFavorite ? "Удалить из избранного" : "В избранное"}
          >
            <Heart size={14} className={isFavorite ? "fill-current" : ""} />
          </button>

          <Link
            to={`/${shop.slug}`}
            className={`inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold bg-app-accent text-app-accent-fg hover:opacity-90 transition-all whitespace-nowrap ${
              isAtelier ? "font-editorial text-sm tracking-wide rounded-full" : ""
            }`}
          >
            <span>{isAtelier ? "Витрина резиденции" : "Открыть меню"}</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      </motion.div>
    );
  }

  /* ==========================================================================
     EDITORIAL ATELIER CARD (Warm Luxury Lookbook & Tasting Menu Layout)
     ========================================================================== */
  if (isAtelier) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="group relative flex flex-col h-full bg-app-surface border border-app-border hover:border-amber-500/40 rounded-3xl p-3.5 transition-all shadow-sm hover:shadow-md"
      >
        {/* Framed Editorial Photograph with Soft Inner Radius */}
        <Link
          to={`/${shop.slug}`}
          className="relative h-48 w-full rounded-2xl overflow-hidden bg-app-bg border border-app-border block"
        >
          {bannerImg ? (
            <ResponsiveImage
              src={bannerImg}
              alt={shop.name}
              preset="banner"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-900 to-stone-800 text-stone-400">
              <Store size={30} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Top Bar Over Image */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10.5px] font-mono border border-white/15">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  shop.isOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"
                }`}
              />
              <span>{shop.isOpen ? "Открыто" : "Закрыто"}</span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(shop.id);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
                isFavorite
                  ? "bg-rose-500 text-white border-rose-500"
                  : "bg-black/65 hover:bg-black/85 text-white border-white/20"
              }`}
              title={isFavorite ? "В избранном" : "Добавить в избранное"}
            >
              <Heart size={14} className={isFavorite ? "fill-current" : ""} />
            </button>
          </div>

          {/* Floating Monogram Crest */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-app-surface border-2 border-amber-200/40 overflow-hidden shrink-0 flex items-center justify-center font-editorial font-bold text-base text-app-primary shadow-md">
                {shop.logoUrl ? (
                  <ResponsiveImage
                    src={shop.logoUrl}
                    alt={shop.name}
                    preset="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  shop.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-editorial italic text-amber-200/90 tracking-wider keep-white">
                  {hasDelivery ? "Собственная доставка" : "Бутик · Самовывоз"}
                </div>
                <div className="text-xs font-mono text-white/95 truncate keep-white">
                  /{shop.slug}
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Editorial Body */}
        <div className="pt-4 px-1.5 pb-1 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            {/* Title & Serif Rating */}
            <div className="flex items-baseline justify-between gap-2">
              <Link
                to={`/${shop.slug}`}
                className="font-editorial font-bold text-2xl text-app-primary hover:opacity-80 transition-opacity line-clamp-1 leading-tight"
                title={shop.name}
              >
                {shop.name}
              </Link>

              <div className="flex items-center gap-1 text-xs font-mono font-semibold text-app-primary shrink-0 tabular-nums">
                <Star size={12} className="fill-amber-500 text-amber-500" />
                <span>{shop.avgRating.toFixed(1)}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-app-secondary line-clamp-2 leading-relaxed">
              {shop.description ||
                (shop.categories?.length
                  ? shop.categories.slice(0, 3).join(" · ")
                  : "Авторская коллекция блюд и сервисов с онлайн-заказом")}
            </p>

            {/* Tasting Menu Preview with Dotted Leaders */}
            <div className="pt-2.5 border-t border-dashed border-app-border space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-editorial italic text-app-muted">
                <span>Избранные позиции</span>
                <span className="font-mono not-italic text-[10px] tabular-nums">{shop.servicesCount} поз.</span>
              </div>

              {shop.featuredServices && shop.featuredServices.length > 0 ? (
                shop.featuredServices.slice(0, 2).map((srv) => (
                  <div
                    key={srv.id}
                    className="flex items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-app-secondary font-medium">
                      {srv.title}
                    </span>
                    <span className="flex-1 border-b border-dotted border-app-border min-w-[16px]" />
                    <span className="font-editorial font-bold text-sm text-app-primary shrink-0 tabular-nums">
                      {srv.price} {shop.currencySymbol || "₽"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between py-0.5 text-xs text-app-muted font-editorial italic">
                  <span>Открыть полную карту зала</span>
                  <span>→</span>
                </div>
              )}
            </div>
          </div>

          {/* Editorial Footer */}
          <div className="pt-3 border-t border-app-border flex items-center justify-between gap-2 mt-auto">
            <span className="text-[11px] text-app-muted truncate max-w-[150px]">
              {shop.address || shop.workingHours || "10:00 – 22:00"}
            </span>

            <div className="flex items-center gap-1.5">
              {onOpenChat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenChat(shop);
                  }}
                  className="w-8 h-8 rounded-full border border-app-border bg-app-bg hover:bg-app-hover text-app-muted hover:text-app-primary flex items-center justify-center transition-colors cursor-pointer"
                  title="Написать заведению"
                >
                  <MessageSquare size={13} />
                </button>
              )}

              <Link
                to={`/${shop.slug}`}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full font-editorial font-bold text-sm tracking-wide bg-app-accent text-app-accent-fg hover:opacity-90 transition-all whitespace-nowrap shadow-2xs"
              >
                <span>Посетить</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Swiss Architectural Grid Card
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="group relative flex flex-col h-full bg-app-surface border border-app-border hover:border-app-secondary/45 rounded-xl overflow-hidden transition-colors"
    >
      {/* Visual Header (16:9 / 4:3 Proportion) */}
      <Link
        to={`/${shop.slug}`}
        className="relative h-44 w-full overflow-hidden bg-app-bg border-b border-app-border block"
      >
        {bannerImg ? (
          <ResponsiveImage
            src={bannerImg}
            alt={shop.name}
            preset="banner"
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-400">
            <Store size={28} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

        {/* Top Row Over Image: Status + Favorite */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 text-white text-[11px] font-mono font-medium border border-white/10">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                shop.isOpen ? "bg-emerald-400" : "bg-zinc-400"
              }`}
            />
            <span>{shop.isOpen ? "Открыто" : "Закрыто"}</span>
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(shop.id);
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border ${
              isFavorite
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-black/65 hover:bg-black/85 text-white border-white/15"
            }`}
            title={isFavorite ? "В избранном" : "Добавить в избранное"}
          >
            <Heart size={14} className={isFavorite ? "fill-current" : ""} />
          </button>
        </div>

        {/* Bottom Left Over Image: Logo + Unboxed Terms */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-app-surface border border-white/20 overflow-hidden shrink-0 flex items-center justify-center font-mono font-bold text-xs text-app-primary">
              {shop.logoUrl ? (
                <ResponsiveImage
                  src={shop.logoUrl}
                  alt={shop.name}
                  preset="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                shop.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-[11px] font-mono text-white/90 truncate keep-white">
              {hasDelivery ? "Доставка" : "Самовывоз"}
              {shop.cashbackPercent && shop.cashbackPercent > 0
                ? ` · Кэшбэк ${shop.cashbackPercent}%`
                : ""}
            </div>
          </div>
        </div>
      </Link>

      {/* Card Body: Swiss Typography & Hairline Dividers */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-2">
          {/* Title & Tabular Rating */}
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/${shop.slug}`}
              className="font-bold text-base text-app-primary hover:text-emerald-500 transition-colors line-clamp-1"
              title={shop.name}
            >
              {shop.name}
            </Link>

            <div className="flex items-center gap-1 font-mono text-xs font-semibold text-app-primary shrink-0 tabular-nums">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span>{shop.avgRating.toFixed(1)}</span>
              <span className="text-app-muted font-normal text-[11px]">
                ({shop.reviewsCount})
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-app-secondary line-clamp-2 leading-relaxed min-h-[2.25rem]">
            {shop.description ||
              (shop.categories?.length
                ? shop.categories.slice(0, 3).join(" · ")
                : "Актуальный каталог и быстрый заказ онлайн")}
          </p>

          {/* Unboxed Metadata: Hours · Address */}
          <div className="pt-2 border-t border-app-border text-[11px] text-app-muted flex items-center gap-1.5 truncate font-mono">
            <span className="shrink-0">{shop.workingHours || "10:00 – 22:00"}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate font-sans">
              {shop.address || "Онлайн-заказ"}
            </span>
          </div>

          {/* Featured Services Hairline Table (No Nested Boxes) */}
          <div className="pt-2 border-t border-app-border space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-app-muted">
              <span>Позиции меню</span>
              <span className="tabular-nums">{shop.servicesCount} поз.</span>
            </div>

            <div className="divide-y divide-app-subtle">
              {shop.featuredServices && shop.featuredServices.length > 0 ? (
                shop.featuredServices.slice(0, 2).map((srv) => (
                  <div
                    key={srv.id}
                    className="flex items-center justify-between py-1 text-xs"
                  >
                    <span className="truncate text-app-secondary text-[11.5px]">
                      {srv.title}
                    </span>
                    <span className="font-mono font-semibold text-app-primary text-[11.5px] shrink-0 ml-2 tabular-nums">
                      {srv.price} {shop.currencySymbol || "₽"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between py-1 text-xs text-app-muted">
                  <span className="truncate text-[11.5px]">Смотреть полное меню</span>
                  <span className="font-mono text-[11px]">Каталог</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="pt-3 border-t border-app-border flex items-center justify-between gap-2 mt-auto">
          <span className="text-[11px] font-mono text-app-muted tabular-nums">
            /{shop.slug}
          </span>

          <div className="flex items-center gap-1.5">
            {onOpenChat && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenChat(shop);
                }}
                className="w-8 h-8 rounded-lg border border-app-border bg-app-bg hover:bg-app-hover text-app-muted hover:text-app-primary flex items-center justify-center transition-colors cursor-pointer"
                title="Написать заведению"
              >
                <MessageSquare size={13} />
              </button>
            )}

            <Link
              to={`/${shop.slug}`}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-app-accent text-app-accent-fg hover:opacity-90 transition-all whitespace-nowrap"
            >
              <span>В меню</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
