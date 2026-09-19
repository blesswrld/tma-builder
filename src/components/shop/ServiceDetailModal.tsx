import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Store, Truck, Clock, Scale, Heart, Plus } from "lucide-react";
import { Service } from "../../types";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useLanguage } from "../../context/LanguageContext";

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
  const { t } = useLanguage();
  useScrollLock(Boolean(service));
  const [detailItemNote, setDetailItemNote] = useState("");

  const badges = service?.badge ? service.badge.split(",").map(b => b.trim()).filter(Boolean) : [];
  const f = service?.fulfillment || "courier,pickup";
  const hasCourier = f.includes("courier");
  const hasPickup = f.includes("pickup");

  let galleryImages: string[] = [];
  if (service?.gallery) {
    try {
      galleryImages = typeof service.gallery === "string" ? JSON.parse(service.gallery) : service.gallery;
    } catch {}
  }

  return (
    <AnimatePresence>
      {service && (
        <div key="service-detail-container" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            key="service-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={() => {
              onClose();
              setDetailItemNote("");
            }}
            className="fixed inset-0 bg-black/75 z-50"
          />
          <motion.div
            key="service-detail-panel"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md w-full bg-app-modal border border-app-border rounded-3xl overflow-hidden text-app-primary shadow-2xl flex flex-col max-h-[90vh] relative z-50 fast-panel-slide"
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
                    {t("service.category", "Категория")}: {service.category}
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
              <div className="p-3 bg-app-card border border-app-border rounded-xl flex items-center gap-2.5 text-xs text-app-secondary font-mono font-medium">
                <Store size={16} className="shrink-0 text-app-muted" />
                <span>{t("service.pickup_only_notice", "Только самовывоз или оказание услуги в заведении (доставка недоступна).")}</span>
              </div>
            )}
            {!hasPickup && (
              <div className="p-3 bg-app-card border border-app-border rounded-xl flex items-center gap-2.5 text-xs text-app-secondary font-mono font-medium">
                <Truck size={16} className="shrink-0 text-app-muted" />
                <span>{t("service.courier_only_notice", "Только курьерская доставка (самовывоз недоступен).")}</span>
              </div>
            )}

            {/* Meta details: Time, Weight, Tags */}
            {(service.prepTime || service.weight || service.tags) && (
              <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                {service.prepTime && (
                  <div className="p-2.5 bg-app-card rounded-xl flex items-center gap-2 border border-app-border">
                    <Clock size={16} className="text-app-muted shrink-0" />
                    <div>
                      <span className="block text-[9px] font-mono text-app-muted uppercase">{t("service.time", "Время")}</span>
                      <span className="text-xs font-semibold text-app-primary">{service.prepTime}</span>
                    </div>
                  </div>
                )}
                {service.weight && (
                  <div className="p-2.5 bg-app-card rounded-xl flex items-center gap-2 border border-app-border">
                    <Scale size={16} className="text-app-muted shrink-0" />
                    <div>
                      <span className="block text-[9px] font-mono text-app-muted uppercase">{t("service.weight_volume", "Вес / Объём")}</span>
                      <span className="text-xs font-semibold text-app-primary">{service.weight}</span>
                    </div>
                  </div>
                )}
                {service.tags && (
                  <div className="col-span-2 p-2.5 bg-app-card rounded-xl space-y-1 border border-app-border">
                    <span className="block text-[9px] font-mono text-app-muted uppercase">{t("service.tags", "Теги")}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {service.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="text-xs font-mono text-app-muted hover:text-app-primary transition-colors">
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
                <label className="text-[10px] font-mono text-app-muted uppercase">{t("service.photo_gallery", "Галерея фотографий")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.map((imgUrl, idx) => (
                    <div key={idx} className="h-20 rounded-xl overflow-hidden border border-app-border bg-app-card">
                      <img src={imgUrl} alt={`${t("service.photo", "Фото")} ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Note for Item */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-mono text-app-muted uppercase">{t("service.wishes_label", "Пожелания к блюду / позиции")}</label>
              <input
                type="text"
                value={detailItemNote}
                onChange={e => setDetailItemNote(e.target.value)}
                placeholder={t("service.wishes_placeholder", "Например: без лука, погорячее...")}
                className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors font-sans"
              />
            </div>
          </div>

          <div className="p-6 border-t border-app-border bg-app-bg flex gap-3">
            <button
              type="button"
              onClick={() => {
                onToggleFavorite(service.id);
              }}
              className="p-3 rounded-2xl bg-app-surface border border-app-border hover:bg-app-hover text-app-primary active:scale-95 transition-all duration-75 shrink-0 cursor-pointer"
              title={t("service.to_favorites", "В избранное")}
            >
              <Heart size={18} className={isFavorite ? "fill-rose-500 text-rose-500" : "text-app-muted"} />
            </button>
            <button
              type="button"
              onClick={() => {
                onAddToCart(service.id, detailItemNote);
                onClose();
                setDetailItemNote("");
                onShowToast(`"${service.title}" ${t("cart.added_to_cart_msg", "добавлено в корзину")}`, "success");
              }}
              className="flex-1 py-3 bg-app-accent text-app-accent-fg font-bold font-mono text-xs uppercase rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-75 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus size={16} />
              <span>{t("service.to_cart", "В корзину")} • {service.price} ₽</span>
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
