import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Store, Truck, Clock, Scale, Heart, Plus } from "lucide-react";
import { Service } from "../../types";

interface ServiceDetailModalProps {
  service: Service | null;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (id: string, note?: string) => void;
  onShowToast: (msg: string, type: "success" | "error" | "warning") => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  isFavorite,
  onClose,
  onToggleFavorite,
  onAddToCart,
  onShowToast,
}) => {
  const [detailItemNote, setDetailItemNote] = useState("");

  if (!service) return null;

  const badges = service.badge ? service.badge.split(",").map(b => b.trim()).filter(Boolean) : [];
  const f = service.fulfillment || "courier,pickup";
  const hasCourier = f.includes("courier");
  const hasPickup = f.includes("pickup");

  let galleryImages: string[] = [];
  if (service.gallery) {
    try {
      galleryImages = typeof service.gallery === "string" ? JSON.parse(service.gallery) : service.gallery;
    } catch {}
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="max-w-md w-full bg-app-modal border border-app-border rounded-3xl overflow-hidden text-app-primary shadow-2xl flex flex-col max-h-[90vh]"
        >
          {service.imageUrl ? (
            <div className="relative h-56 w-full shrink-0">
              <img
                src={service.imageUrl}
                alt={service.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => {
                  onClose();
                  setDetailItemNote("");
                }}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white keep-white hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X size={18} className="text-white keep-white" />
              </button>
            </div>
          ) : (
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-app-modal-header">
              <h3 className="text-base font-bold text-app-primary">{service.title}</h3>
              <button
                onClick={() => {
                  onClose();
                  setDetailItemNote("");
                }}
                className="text-app-muted hover:text-app-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-lg font-bold text-app-primary">{service.title}</h2>
                {service.category && (
                  <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">
                    Категория: {service.category}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end shrink-0">
                {service.oldPrice && Number(service.oldPrice) > Number(service.price) && (
                  <span className="text-xs font-mono text-app-muted line-through mb-0.5">
                    {service.oldPrice} ₽
                  </span>
                )}
                <span className="text-base font-bold font-mono text-app-primary px-3 py-1 bg-app-card border border-app-border rounded-xl">
                  {service.price} ₽
                </span>
              </div>
            </div>

            {/* Dietary & Custom Badges in Modal */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {badges.map(badge => (
                  <span key={badge} className="px-2.5 py-1 rounded-lg bg-app-badge text-app-primary font-mono text-xs border border-app-border font-medium">
                    {badge}
                  </span>
                ))}
              </div>
            )}

            {service.description && (
              <p className="text-xs text-app-secondary leading-relaxed">
                {service.description}
              </p>
            )}

            {/* Fulfillment constraint info */}
            {!hasCourier && (
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-mono font-medium">
                <Store size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Только самовывоз или оказание услуги в заведении (доставка недоступна).</span>
              </div>
            )}
            {!hasPickup && (
              <div className="p-3 bg-sky-500/15 border border-sky-500/30 rounded-xl flex items-center gap-2.5 text-xs text-sky-900 dark:text-sky-200 font-mono font-medium">
                <Truck size={16} className="shrink-0 text-sky-600 dark:text-sky-400" />
                <span>Только курьерская доставка (самовывоз недоступен).</span>
              </div>
            )}

            {/* Meta details: Time, Weight, Tags */}
            {(service.prepTime || service.weight || service.tags) && (
              <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                {service.prepTime && (
                  <div className="p-2.5 bg-app-card rounded-xl flex items-center gap-2">
                    <Clock size={16} className="text-amber-500 shrink-0" />
                    <div>
                      <span className="block text-[9px] font-mono text-app-muted uppercase">Время</span>
                      <span className="text-xs font-semibold text-app-primary">{service.prepTime}</span>
                    </div>
                  </div>
                )}
                {service.weight && (
                  <div className="p-2.5 bg-app-card rounded-xl flex items-center gap-2">
                    <Scale size={16} className="text-sky-500 shrink-0" />
                    <div>
                      <span className="block text-[9px] font-mono text-app-muted uppercase">Вес / Объём</span>
                      <span className="text-xs font-semibold text-app-primary">{service.weight}</span>
                    </div>
                  </div>
                )}
                {service.tags && (
                  <div className="col-span-2 p-2.5 bg-app-card rounded-xl space-y-1">
                    <span className="block text-[9px] font-mono text-app-muted uppercase">Теги</span>
                    <div className="flex flex-wrap gap-1.5">
                      {service.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="text-xs font-mono text-app-accent">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Gallery Photos */}
            {Array.isArray(galleryImages) && galleryImages.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-mono text-app-muted uppercase">Галерея фотографий</label>
                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.map((imgUrl, idx) => (
                    <div key={idx} className="h-20 rounded-xl overflow-hidden border border-app-border bg-app-card">
                      <img src={imgUrl} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Note for Item */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-mono text-app-muted uppercase">Пожелания к блюду / позиции</label>
              <input
                type="text"
                value={detailItemNote}
                onChange={e => setDetailItemNote(e.target.value)}
                placeholder="Например: без лука, погорячее..."
                className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors font-sans"
              />
            </div>
          </div>

          <div className="p-6 border-t border-app-border bg-app-bg flex gap-3">
            <button
              onClick={() => {
                onToggleFavorite(service.id);
              }}
              className="p-3 rounded-2xl bg-app-surface border border-app-border hover:bg-app-hover text-app-primary transition-colors shrink-0"
              title="В избранное"
            >
              <Heart size={18} className={isFavorite ? "fill-rose-500 text-rose-500" : "text-app-muted"} />
            </button>
            <button
              onClick={() => {
                onAddToCart(service.id, detailItemNote);
                onClose();
                setDetailItemNote("");
                onShowToast(`"${service.title}" добавлено в корзину`, "success");
              }}
              className="flex-1 py-3 bg-app-accent text-app-accent-fg font-bold font-mono text-xs uppercase rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus size={16} />
              <span>В корзину • {service.price} ₽</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
