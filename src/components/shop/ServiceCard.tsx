import React from "react";
import { Heart, Plus, Minus } from "lucide-react";
import { Service } from "../../types";
import { useLanguage } from "../../context/LanguageContext";
import { ResponsiveImage } from "../common/ResponsiveImage";

interface ServiceCardProps {
  service: Service;
  qty?: number;
  quantity?: number;
  isFav?: boolean;
  isFavorite?: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenDetail?: (service: Service) => void;
  onSelectDetail?: (service: Service) => void;
  onAddToCart: (id: string) => void;
  onRemoveFromCart: (id: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = React.memo(({
  service,
  qty,
  quantity,
  isFav,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
  onSelectDetail,
  onAddToCart,
  onRemoveFromCart,
}) => {
  const { t } = useLanguage();
  const currentQty = quantity ?? qty ?? 0;
  const isFavoriteItem = isFavorite ?? isFav ?? false;
  const handleOpenDetail = onSelectDetail || onOpenDetail || (() => {});

  const isOutOfStock = service.isAvailable === false;
  const badges = service.badge ? service.badge.split(",").map((b) => b.trim()).filter(Boolean) : [];
  // Ensure badges do not duplicate category name or fulfillment terms like 'самовывоз'
  const promoBadge = badges.find((b) => {
    const lower = b.toLowerCase();
    if (lower.includes("самовывоз") || lower.includes("доставка") || lower.includes("pickup") || lower.includes("courier")) return false;
    if (service.category && lower === service.category.toLowerCase()) return false;
    return true;
  });

  return (
    <div 
      className={`rounded-2xl border overflow-hidden transition-all duration-150 flex flex-col justify-between group font-sans hover:shadow-md will-change-transform ${
        isOutOfStock 
          ? "bg-app-card/50 border-app-border/40 opacity-50" 
          : "bg-app-card border-app-border hover:border-app-border/80 hover:bg-app-card-hover"
      }`}
    >
      {service.imageUrl ? (
        <div className="relative">
          <div 
            onClick={() => handleOpenDetail(service)}
            className="h-44 sm:h-48 w-full overflow-hidden bg-app-surface border-b border-app-border relative cursor-pointer"
          >
            <ResponsiveImage
              src={service.imageUrl}
              alt={service.title}
              preset="card"
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
              referrerPolicy="no-referrer"
            />
            {promoBadge && (
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white uppercase tracking-wider shadow-xs">
                {promoBadge}
              </span>
            )}
          </div>
          {/* Favorite Heart Button over image */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(service.id);
            }}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white keep-white hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer z-10 shadow-xs"
            title={isFavoriteItem ? t("shop.remove_favorite", "Удалить из избранного") : t("shop.add_favorite", "В избранное")}
          >
            <Heart size={14} className={isFavoriteItem ? "fill-rose-500 text-rose-500" : "text-white keep-white"} />
          </button>
        </div>
      ) : (
        <div className="pt-3 px-4 flex justify-between items-center gap-2">
          {promoBadge ? (
            <span className="inline-block px-2 py-0.5 rounded-md bg-app-surface border border-app-border text-[9px] font-mono font-semibold text-app-secondary uppercase tracking-wider">
              {promoBadge}
            </span>
          ) : <div />}
          {/* Favorite Heart Button for card without image */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(service.id);
            }}
            className="w-8 h-8 rounded-xl bg-app-surface hover:bg-app-hover border border-app-border text-app-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            title={isFavoriteItem ? t("shop.remove_favorite", "Удалить из избранного") : t("shop.add_favorite", "В избранное")}
          >
            <Heart size={14} className={isFavoriteItem ? "fill-rose-500 text-rose-500" : "text-app-muted"} />
          </button>
        </div>
      )}

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          <h3 
            onClick={() => handleOpenDetail(service)}
            className={`text-sm sm:text-base font-semibold tracking-tight leading-snug line-clamp-2 cursor-pointer transition-colors ${
              isOutOfStock ? "text-app-muted" : "text-app-primary hover:text-emerald-500"
            }`}
          >
            {service.title}
          </h3>

          {service.description && (
            <p 
              onClick={() => handleOpenDetail(service)}
              className="text-app-secondary/80 text-xs leading-relaxed line-clamp-2 font-normal cursor-pointer"
            >
              {service.description}
            </p>
          )}

          {/* Clean Unboxed Metadata: Weight & Time */}
          {(service.weight || service.prepTime) && (
            <div 
              onClick={() => handleOpenDetail(service)}
              className="flex items-center gap-2 text-xs font-mono text-app-muted pt-0.5 cursor-pointer"
            >
              {service.weight && <span>{service.weight}</span>}
              {service.weight && service.prepTime && <span aria-hidden="true" className="text-app-border">·</span>}
              {service.prepTime && <span>{service.prepTime}</span>}
            </div>
          )}
        </div>
        
        {/* Bottom Price & Add Action Row */}
        <div className="flex justify-between items-center pt-3 border-t border-app-border/60 mt-auto">
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-base sm:text-lg font-bold text-app-primary">
              {service.price} ₽
            </span>
            {service.oldPrice && Number(service.oldPrice) > Number(service.price) && (
              <span className="text-xs text-app-muted line-through">
                {service.oldPrice} ₽
              </span>
            )}
          </div>

          <div>
            {isOutOfStock ? (
              <span className="text-xs text-app-muted font-mono">{t("common.unavailable", "Недоступно")}</span>
            ) : currentQty > 0 ? (
              <div className="h-9 flex items-center bg-app-surface rounded-xl p-0.5 border border-app-border shadow-2xs">
                <button 
                  type="button"
                  onClick={() => onRemoveFromCart(service.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-app-card text-app-primary hover:bg-app-hover active:scale-90 transition-all cursor-pointer"
                  aria-label="Уменьшить количество"
                >
                  <Minus size={13} />
                </button>
                <span className="text-xs font-mono font-bold min-w-[28px] text-center text-app-primary select-none tabular-nums">
                  {currentQty}
                </span>
                <button 
                  type="button"
                  onClick={() => onAddToCart(service.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-app-accent text-app-accent-fg hover:opacity-90 active:scale-90 transition-all cursor-pointer"
                  aria-label="Увеличить количество"
                >
                  <Plus size={13} />
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => handleOpenDetail(service)}
                className="h-9 px-3.5 sm:px-4 rounded-xl bg-app-accent text-app-accent-fg font-bold text-xs hover:opacity-90 active:scale-95 transition-all font-mono cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>{t("shop.choose", "Выбрать")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
