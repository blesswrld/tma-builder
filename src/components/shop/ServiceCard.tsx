import React from "react";
import { motion } from "motion/react";
import { Heart, Store, Truck, Clock, Scale, Plus, Minus } from "lucide-react";
import { Service } from "../../types";
import { useLanguage } from "../../context/LanguageContext";

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

  const f = service.fulfillment || "courier,pickup";
  const hasCourier = f.includes("courier");
  const hasPickup = f.includes("pickup");

  return (
    <div 
      className={`rounded-2xl border overflow-hidden transition-all duration-150 flex flex-col justify-between group font-sans hover:shadow-md hover:-translate-y-0.5 will-change-transform ${
        isOutOfStock 
          ? "bg-app-card/50 border-app-border/40 opacity-50" 
          : "bg-app-card border-app-border hover:border-app-border hover:bg-app-card-hover"
      }`}
    >
      {service.imageUrl ? (
        <div className="relative">
          <div 
            onClick={() => handleOpenDetail(service)}
            className="h-40 sm:h-44 w-full overflow-hidden bg-app-surface border-b border-app-border relative cursor-pointer"
          >
            <img
              src={service.imageUrl}
              alt={service.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
              referrerPolicy="no-referrer"
            />
            {service.category && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 border border-white/20 text-[9px] font-mono text-white keep-white uppercase tracking-wider backdrop-blur-md shadow-xs">
                {service.category}
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
            className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white keep-white hover:scale-110 transition-transform cursor-pointer z-10"
            title={isFavoriteItem ? t("shop.remove_favorite", "Удалить из избранного") : t("shop.add_favorite", "В избранное")}
          >
            <Heart size={14} className={isFavoriteItem ? "fill-rose-500 text-rose-500" : "text-white keep-white"} />
          </button>
        </div>
      ) : (
        <div className="pt-3.5 px-4 flex justify-between items-center gap-2">
          {service.category ? (
            <span className="inline-block px-2 py-0.5 rounded-md bg-app-card border border-app-border text-[9px] font-mono text-app-muted uppercase tracking-wider">
              {service.category}
            </span>
          ) : <div />}
          {/* Favorite Heart Button for card without image */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(service.id);
            }}
            className="p-1.5 rounded-xl bg-app-card hover:bg-app-hover border border-app-border text-app-primary hover:scale-105 transition-all cursor-pointer shrink-0"
            title={isFavoriteItem ? t("shop.remove_favorite", "Удалить из избранного") : t("shop.add_favorite", "В избранное")}
          >
            <Heart size={14} className={isFavoriteItem ? "fill-rose-500 text-rose-500" : "text-app-muted"} />
          </button>
        </div>
      )}

      <div className="p-4 sm:p-5 pt-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2 mb-3.5">
          <div 
            onClick={() => handleOpenDetail(service)}
            className="flex justify-between items-start gap-2.5 cursor-pointer"
          >
            <h3 className={`text-sm font-semibold tracking-tight hover:underline leading-snug line-clamp-2 ${isOutOfStock ? "text-app-muted" : "text-app-primary"}`}>
              {service.title}
            </h3>
            <div className="flex flex-col items-end shrink-0">
              {service.oldPrice && Number(service.oldPrice) > Number(service.price) && (
                <span className="text-[10px] font-mono text-app-muted line-through leading-none mb-1">
                  {service.oldPrice} ₽
                </span>
              )}
              <span className="h-7 px-2.5 rounded-lg bg-app-surface border border-app-border text-xs font-mono font-bold text-app-primary flex items-center justify-center shrink-0 shadow-2xs">
                {service.price} ₽
              </span>
            </div>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 py-0.5">
              {badges.map((badge) => (
                <span key={badge} className="px-2 py-0.5 rounded-md bg-app-badge text-app-primary font-mono text-[9px]">
                  {badge}
                </span>
              ))}
            </div>
          )}

          {/* Fulfillment restriction badge */}
          {!hasCourier && (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 bg-app-card text-app-secondary border border-app-border px-2 py-0.5 rounded-md text-[10px] font-mono">
                <Store size={11} className="text-app-muted" /> {t("shop.pickup_only", "Только самовывоз")}
              </span>
            </div>
          )}
          {!hasPickup && (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 bg-app-card text-app-secondary border border-app-border px-2 py-0.5 rounded-md text-[10px] font-mono">
                <Truck size={11} className="text-app-muted" /> {t("shop.delivery_only", "Только доставка")}
              </span>
            </div>
          )}

          {service.description && (
            <p 
              onClick={() => handleOpenDetail(service)}
              className="text-app-secondary text-xs leading-relaxed line-clamp-2 font-normal cursor-pointer"
            >
              {service.description}
            </p>
          )}

          {/* Additional Meta Details: Time, Weight, Tags */}
          {(service.prepTime || service.weight || service.tags) && (
            <div 
              onClick={() => handleOpenDetail(service)}
              className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-app-muted cursor-pointer"
            >
              {service.prepTime && (
                <span className="inline-flex items-center gap-1 bg-app-card border border-app-border px-2 py-0.5 rounded-lg text-app-secondary">
                  <Clock size={11} className="text-app-muted shrink-0" />
                  <span>{service.prepTime}</span>
                </span>
              )}
              {service.weight && (
                <span className="inline-flex items-center gap-1 bg-app-card border border-app-border px-2 py-0.5 rounded-lg text-app-secondary">
                  <Scale size={11} className="text-app-muted shrink-0" />
                  <span>{service.weight}</span>
                </span>
              )}
              {service.tags && (
                <div className="flex flex-wrap gap-1 items-center">
                  {service.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="text-app-muted hover:text-app-primary transition-colors">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-auto pt-3.5 border-t border-app-border">
          <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">
            {currentQty > 0 ? `${t("shop.in_cart", "В корзине")}: ${currentQty}` : ""}
          </span>

          <div>
            {isOutOfStock ? (
              <span className="text-xs text-app-muted font-mono">{t("common.unavailable", "Недоступно")}</span>
            ) : currentQty > 0 ? (
              <div className="h-8 flex items-center gap-1 sm:gap-1.5 bg-app-surface rounded-xl p-0.5 border border-app-border">
                <button 
                  type="button"
                  onClick={() => onRemoveFromCart(service.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-card text-app-primary hover:bg-app-hover active:scale-90 transition-all duration-75 cursor-pointer"
                >
                  <Minus size={13} />
                </button>
                <span className="text-xs font-mono font-bold w-6 text-center text-app-primary select-none">{currentQty}</span>
                <button 
                  type="button"
                  onClick={() => onAddToCart(service.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-accent text-app-accent-fg hover:opacity-90 active:scale-90 transition-all duration-75 cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => handleOpenDetail(service)}
                className="h-8 px-4 rounded-xl bg-app-accent text-app-accent-fg font-bold text-xs hover:opacity-90 active:scale-95 transition-all duration-75 font-mono cursor-pointer shadow-2xs flex items-center justify-center"
              >
                {t("shop.choose", "Выбрать")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
