import React from "react";
import { motion } from "motion/react";
import { Heart, Store, Truck, Clock, Scale, Plus, Minus } from "lucide-react";
import { Service } from "../../types";

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

export const ServiceCard: React.FC<ServiceCardProps> = ({
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
  const currentQty = quantity ?? qty ?? 0;
  const isFavoriteItem = isFavorite ?? isFav ?? false;
  const handleOpenDetail = onSelectDetail || onOpenDetail || (() => {});

  const isOutOfStock = service.isAvailable === false;
  const badges = service.badge ? service.badge.split(",").map(b => b.trim()).filter(Boolean) : [];

  const f = service.fulfillment || "courier,pickup";
  const hasCourier = f.includes("courier");
  const hasPickup = f.includes("pickup");

  return (
    <motion.div 
      layout
      className={`rounded-2xl border overflow-hidden transition-all flex flex-col justify-between group ${
        isOutOfStock 
          ? "bg-app-surface/50 border-app-border/40 opacity-50" 
          : "bg-app-surface border-app-border hover:border-app-border hover:bg-app-card-hover"
      }`}
    >
      {service.imageUrl ? (
        <div className="relative">
          <div 
            onClick={() => handleOpenDetail(service)}
            className="h-40 w-full overflow-hidden bg-app-surface border-b border-app-border relative cursor-pointer"
          >
            <img
              src={service.imageUrl}
              alt={service.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
              referrerPolicy="no-referrer"
            />
            {service.category && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 border border-white/20 text-[9px] font-mono text-white keep-white uppercase tracking-wider backdrop-blur-md shadow-sm">
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
            title={isFavoriteItem ? "Удалить из избранного" : "В избранное"}
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
            title={isFavoriteItem ? "Удалить из избранного" : "В избранное"}
          >
            <Heart size={14} className={isFavoriteItem ? "fill-rose-500 text-rose-500" : "text-app-muted"} />
          </button>
        </div>
      )}

      <div className="p-5 pt-2 flex-1 flex flex-col justify-between">
        <div className="space-y-2 mb-4">
          <div 
            onClick={() => handleOpenDetail(service)}
            className="flex justify-between items-start gap-3 cursor-pointer"
          >
            <h3 className={`text-sm font-semibold tracking-tight hover:underline ${isOutOfStock ? "text-app-muted" : "text-app-primary"}`}>
              {service.title}
            </h3>
            <div className="flex flex-col items-end shrink-0">
              {service.oldPrice && Number(service.oldPrice) > Number(service.price) && (
                <span className="text-[10px] font-mono text-app-muted line-through leading-none mb-1">
                  {service.oldPrice} ₽
                </span>
              )}
              <span className="text-xs font-mono font-bold text-app-primary px-2.5 py-1 rounded-lg bg-app-card">
                {service.price} ₽
              </span>
            </div>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 py-0.5">
              {badges.map(badge => (
                <span key={badge} className="px-2 py-0.5 rounded-md bg-app-badge text-app-primary font-mono text-[9px]">
                  {badge}
                </span>
              ))}
            </div>
          )}

          {/* Fulfillment restriction badge */}
          {!hasCourier && (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-mono">
                <Store size={11} /> Только самовывоз
              </span>
            </div>
          )}
          {!hasPickup && (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded-md text-[10px] font-mono">
                <Truck size={11} /> Только доставка
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
                <span className="inline-flex items-center gap-1 bg-app-card px-2.5 py-1 rounded-lg text-app-secondary">
                  <Clock size={11} className="text-amber-500 shrink-0" />
                  <span>{service.prepTime}</span>
                </span>
              )}
              {service.weight && (
                <span className="inline-flex items-center gap-1 bg-app-card px-2.5 py-1 rounded-lg text-app-secondary">
                  <Scale size={11} className="text-sky-500 shrink-0" />
                  <span>{service.weight}</span>
                </span>
              )}
              {service.tags && (
                <div className="flex flex-wrap gap-1 items-center">
                  {service.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="text-app-muted hover:text-app-primary transition-colors">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-auto pt-4 border-t border-app-border">
          <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">
            {currentQty > 0 ? `В корзине: ${currentQty}` : ""}
          </span>

          <div>
            {isOutOfStock ? (
              <span className="text-xs text-app-muted font-mono">Недоступно</span>
            ) : currentQty > 0 ? (
              <div className="flex items-center gap-2 bg-app-card rounded-xl p-1 border border-app-border">
                <button 
                  onClick={() => onRemoveFromCart(service.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-secondary text-app-primary hover:bg-app-hover transition-colors cursor-pointer"
                >
                  <Minus size={12} />
                </button>
                <span className="text-xs font-mono font-bold w-5 text-center text-app-primary">{currentQty}</span>
                <button 
                  onClick={() => onAddToCart(service.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-accent text-app-accent-fg hover:bg-app-hover transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => handleOpenDetail(service)}
                className="px-4 py-1.5 rounded-xl bg-app-accent text-app-accent-fg font-medium text-xs hover:bg-app-hover transition-all font-mono cursor-pointer"
              >
                Выбрать
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
