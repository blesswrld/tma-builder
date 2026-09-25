import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Clock,
  MapPin,
  Phone as PhoneIcon,
  Send,
  ExternalLink,
  MessageCircle,
  Globe,
  Truck,
  Store,
  Receipt,
  Sparkles,
  CreditCard,
  Music,
  Gift,
  ShieldCheck,
  Navigation
} from "lucide-react";
import { Shop, parseSocialLinks, parseDeliveryOptions, parseMusicSettings } from "../../types";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useLanguage } from "../../context/LanguageContext";
import { ResponsiveImage } from "../common/ResponsiveImage";
import { ShopVideosSection } from "./ShopVideosSection";

interface ShopInfoModalProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacy?: () => void;
  onOpenMusic?: () => void;
  onOpenMap?: () => void;
}

export const ShopInfoModal: React.FC<ShopInfoModalProps> = ({
  shop,
  isOpen,
  onClose,
  onOpenPrivacy,
  onOpenMusic,
  onOpenMap,
}) => {
  useScrollLock(isOpen);
  const { t } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!shop) return null;

  const socials = parseSocialLinks(shop.socialLinks);
  const del = parseDeliveryOptions(shop.deliveryOptions);
  const musicSettings = parseMusicSettings(shop.musicSettings);

  const hasSoc = Boolean(
    socials.telegram ||
    socials.instagram ||
    socials.whatsapp ||
    socials.vk ||
    socials.website
  );

  const hasDel = Boolean(
    del.enabled !== false && (
      del.pickupAddress ||
      (del.courier !== false && (del.deliveryMinOrder || del.minOrder)) ||
      (del.courier !== false && (del.deliveryFee || del.deliveryFeeVal)) ||
      (del.courier !== false && del.freeDeliveryThreshold)
    )
  );

  const hasMusic = Boolean(
    musicSettings.enabled !== false && (
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
    )
  );

  const hasCashback = Boolean(shop.cashbackPercent && Number(shop.cashbackPercent) > 0);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 bg-black/70"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-app-card border border-app-border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-[10000] font-sans fast-panel-slide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button Top Right */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-app-surface/90 hover:bg-app-hover border border-app-border flex items-center justify-center text-app-muted hover:text-app-primary transition-all cursor-pointer shadow-xs"
              title={t("common.close", "Закрыть")}
            >
              <X size={15} />
            </button>

            {/* Modal Header with Banner */}
            {shop.bannerUrl ? (
              <div className="relative h-28 w-full bg-app-surface shrink-0 overflow-hidden">
                <ResponsiveImage
                  src={shop.bannerUrl}
                  alt={shop.name}
                  preset="banner"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10 pointer-events-none" />
                <div className="absolute bottom-3 left-4 right-14 flex items-end gap-3 pointer-events-none">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-base shrink-0 overflow-hidden shadow-lg border-2 border-white/30 ${
                    shop.logoUrl ? "bg-transparent" : "bg-black/80 text-white"
                  }`}>
                    {shop.logoUrl ? (
                      <ResponsiveImage
                        src={shop.logoUrl}
                        alt={shop.name}
                        preset="avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      shop.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">{shop.name}</h3>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{shop.isOpen !== false ? t("shop.open", "Открыто") : t("shop.closed", "Закрыто")}</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border-b border-app-border flex items-center justify-between shrink-0 bg-app-modal-header pr-14">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 overflow-hidden shadow-md border border-app-border dark:border-white/10 ${
                    shop.logoUrl ? "bg-transparent" : "bg-app-card dark:bg-zinc-800 text-app-primary dark:text-white"
                  }`}>
                    {shop.logoUrl ? (
                      <ResponsiveImage
                        src={shop.logoUrl}
                        alt={shop.name}
                        preset="avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      shop.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-app-primary dark:text-white truncate">{shop.name}</h3>
                    <span className="text-[10px] font-mono text-emerald-500 font-semibold flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{shop.isOpen !== false ? t("shop.open", "Открыто") : t("shop.closed", "Закрыто")}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 scrollbar-none">
              {/* Description */}
              {shop.description && (
                <div className="p-3 bg-app-card border border-app-border rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">{t("shop.about", "О заведении")}</span>
                  <p className="text-xs text-app-secondary leading-relaxed whitespace-pre-line font-sans">{shop.description}</p>
                </div>
              )}

              {/* Videos about the venue and services */}
              {Boolean(shop.videos) && (
                <ShopVideosSection videos={shop.videos} />
              )}

              {/* Contacts & Working Hours */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">{t("shop.contacts_address", "Контакты и адрес")}</span>
                <div className="p-3 bg-app-card border border-app-border rounded-2xl space-y-2 text-xs text-app-secondary font-mono shadow-xs">
                  {shop.workingHours && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-app-surface border border-app-border flex items-center justify-center text-app-muted shrink-0">
                        <Clock size={14} />
                      </div>
                      <div>
                        <span className="block text-[9px] text-app-muted uppercase font-sans">{t("shop.working_hours", "Режим работы")}</span>
                        <span className="text-app-primary font-semibold text-xs">{shop.workingHours}</span>
                      </div>
                    </div>
                  )}
                  {shop.address && (
                    <div className="flex items-center justify-between gap-2.5 pt-1.5 border-t border-app-border/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-app-surface border border-app-border flex items-center justify-center text-app-muted shrink-0">
                          <MapPin size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[9px] text-app-muted uppercase font-sans">{t("shop.address", "Адрес")}</span>
                          <span className="text-app-primary font-semibold text-xs truncate block">{shop.address}</span>
                        </div>
                      </div>
                      {onOpenMap ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenMap();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-app-surface text-app-primary border border-app-border text-[11px] font-bold shrink-0 hover:bg-app-hover hover:border-emerald-500/40 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Navigation size={11} className="text-emerald-500" />
                          <span>{t("shop.map", "Карта")}</span>
                        </button>
                      ) : (
                        <a
                          href={`https://yandex.ru/maps/?text=${encodeURIComponent(shop.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-app-surface text-app-primary border border-app-border text-[11px] font-bold shrink-0 hover:bg-app-hover hover:border-emerald-500/40 transition-all flex items-center gap-1 shadow-xs"
                        >
                          <Navigation size={11} className="text-emerald-500" />
                          <span>{t("shop.map", "Карта")}</span>
                        </a>
                      )}
                    </div>
                  )}
                  {shop.phone && (
                    <div className="flex items-center justify-between gap-2.5 pt-1.5 border-t border-app-border/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-app-surface border border-app-border flex items-center justify-center text-app-muted shrink-0">
                          <PhoneIcon size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[9px] text-app-muted uppercase font-sans">{t("shop.phone_contact", "Телефон для связи")}</span>
                          <a href={`tel:${shop.phone}`} className="text-app-primary font-semibold text-xs hover:underline block truncate">
                            {shop.phone}
                          </a>
                        </div>
                      </div>
                      <a
                        href={`tel:${shop.phone}`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold shrink-0 hover:bg-emerald-500/20 transition-all flex items-center gap-1 shadow-xs"
                      >
                        <PhoneIcon size={11} />
                        <span>{t("shop.call", "Позвонить")}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Music / Atmosphere */}
              {hasMusic && (
                <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs">
                      <Music size={17} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-app-primary font-mono truncate">
                        {musicSettings.title || t("shop.tracks", "Музыка салона")}
                      </h4>
                      <p className="text-[10px] text-app-secondary leading-snug truncate">
                        {musicSettings.description || t("shop.tracks_desc", "Фоновая музыка заведения")}
                      </p>
                    </div>
                  </div>

                  {onOpenMusic && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setTimeout(() => onOpenMusic(), 150);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm hover:scale-105 active:scale-95"
                    >
                      {t("shop.listen", "Слушать")}
                    </button>
                  )}
                </div>
              )}

              {/* Cashback Bonus System */}
              {hasCashback && (
                <div className="p-3 bg-app-card border border-app-border rounded-2xl flex items-center gap-2.5 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-app-surface border border-app-border text-app-primary flex items-center justify-center shrink-0">
                    <Gift size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-app-primary font-mono">{t("shop.bonus_program", "Бонусная программа")}</h4>
                    <p className="text-[11px] text-app-secondary leading-snug font-sans font-medium mt-0.5">
                      {t("shop.cashback_benefit", "Начисляем")} <strong className="text-app-primary font-mono">{shop.cashbackPercent}% {t("shop.cashback", "Кэшбэк")}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Options */}
              {hasDel && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">{t("shop.delivery_terms", "Условия доставки и самовывоза")}</span>
                  <div className="p-3 bg-app-card border border-app-border rounded-2xl space-y-1.5 text-xs font-mono text-app-secondary shadow-xs">
                    {del.pickup !== false && del.pickupAddress && (
                      <div className="flex items-center gap-2">
                        <Store size={13} className="text-app-muted shrink-0" />
                        <span>{t("shop.pickup_point", "Пункт самовывоза")}: <strong className="text-app-primary">{del.pickupAddress}</strong></span>
                      </div>
                    )}
                    {del.courier !== false && (del.deliveryMinOrder || del.minOrder) && Number(del.deliveryMinOrder || del.minOrder) > 0 ? (
                      <div className="flex items-center gap-2">
                        <Truck size={13} className="text-app-muted shrink-0" />
                        <span>{t("shop.min_order", "Минимальная сумма")}: <strong className="text-app-primary">{del.deliveryMinOrder || del.minOrder} ₽</strong></span>
                      </div>
                    ) : null}
                    {del.courier !== false && (del.deliveryFee || del.deliveryFeeVal) && Number(del.deliveryFee || del.deliveryFeeVal) > 0 ? (
                      <div className="flex items-center gap-2">
                        <Receipt size={13} className="text-app-muted shrink-0" />
                        <span>{t("shop.delivery_fee", "Стоимость доставки")}: <strong className="text-app-primary">{del.deliveryFee || del.deliveryFeeVal} ₽</strong></span>
                      </div>
                    ) : null}
                    {del.courier !== false && del.freeDeliveryThreshold && Number(del.freeDeliveryThreshold) > 0 ? (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5 border-t border-app-border/40">
                        <Sparkles size={13} className="shrink-0" />
                        <span>{t("shop.free_delivery_from", "Бесплатная доставка от")} {del.freeDeliveryThreshold} ₽</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Payment Instructions */}
              {shop.paymentInstructions && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">{t("shop.payment_guide", "Инструкция по оплате")}</span>
                  <div className="p-3 bg-app-card border border-app-border rounded-2xl space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-app-primary font-mono">
                      <CreditCard size={14} className="text-emerald-500 shrink-0" />
                      <span>{t("shop.payment_method", "Способ оплаты")}</span>
                    </div>
                    <p className="text-xs text-app-secondary leading-relaxed font-sans whitespace-pre-line bg-app-surface p-2.5 rounded-xl border border-app-border/60">
                      {shop.paymentInstructions}
                    </p>
                  </div>
                </div>
              )}

              {/* Social links */}
              {hasSoc && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">{t("shop.social_networks", "Социальные сети и мессенджеры")}</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {socials.telegram && (
                      <a
                        href={socials.telegram.startsWith("http") ? socials.telegram : `https://t.me/${socials.telegram.replace("@", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-2.5 bg-app-card text-app-primary border border-app-border hover:bg-app-hover font-mono text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.01]"
                      >
                        <Send size={13} className="text-sky-500" />
                        <span>Telegram</span>
                      </a>
                    )}
                    {socials.instagram && (
                      <a
                        href={socials.instagram.startsWith("http") ? socials.instagram : `https://instagram.com/${socials.instagram}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-2.5 bg-app-card text-app-primary border border-app-border hover:bg-app-hover font-mono text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.01]"
                      >
                        <ExternalLink size={13} className="text-pink-500" />
                        <span>Instagram*</span>
                      </a>
                    )}
                    {socials.whatsapp && (
                      <a
                        href={socials.whatsapp.startsWith("http") ? socials.whatsapp : `https://wa.me/${socials.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-2.5 bg-app-card text-app-primary border border-app-border hover:bg-app-hover font-mono text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.01]"
                      >
                        <MessageCircle size={13} className="text-emerald-500" />
                        <span>WhatsApp*</span>
                      </a>
                    )}
                    {socials.vk && (
                      <a
                        href={socials.vk.startsWith("http") ? socials.vk : `https://vk.com/${socials.vk}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-2.5 bg-app-card text-app-primary border border-app-border hover:bg-app-hover font-mono text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.01]"
                      >
                        <Globe size={13} className="text-blue-500" />
                        <span>{t("common.vkontakte", "ВКонтакте")}</span>
                      </a>
                    )}
                    {socials.website && (
                      <a
                        href={socials.website.startsWith("http") ? socials.website : `https://${socials.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="col-span-2 sm:col-span-1 py-2 px-2.5 bg-app-card text-app-primary border border-app-border hover:bg-app-hover font-mono text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.01]"
                      >
                        <Globe size={13} className="text-emerald-500" />
                        <span>{t("common.website", "Сайт")}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button 
                onClick={onClose}
                className="w-full py-2.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-medium rounded-2xl transition-all cursor-pointer shadow-xs hover:border-app-border-hover active:scale-[0.99]"
              >
                {t("common.close", "Закрыть")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
