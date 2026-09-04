import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Clock, MapPin, Navigation, Phone as PhoneIcon, Gift, Store, Truck, Receipt, Sparkles, CreditCard, Send, ExternalLink, MessageCircle, Globe, Github, ShieldCheck, Music } from "lucide-react";
import { Shop, parseSocialLinks, parseDeliveryOptions, parseMusicSettings } from "../../types";
import { useScrollLock } from "../../hooks/useScrollLock";

interface ShopInfoModalProps {
  shop: Shop;
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacy?: () => void;
  onOpenMusic?: () => void;
}

export const ShopInfoModal: React.FC<ShopInfoModalProps> = ({ shop, isOpen, onClose, onOpenPrivacy, onOpenMusic }) => {
  useScrollLock(isOpen);

  const socials = parseSocialLinks(shop.socialLinks);
  const del = parseDeliveryOptions(shop.deliveryOptions);
  const musicSettings = parseMusicSettings(shop.musicSettings);
  const hasSoc = Boolean(socials.telegram || socials.instagram || socials.whatsapp || socials.vk || socials.website);
  const isDeliveryEnabled = del.enabled !== false;
  const hasDel = isDeliveryEnabled && Boolean(del.pickup !== false || del.courier !== false || del.shipping || del.pickupAddress);
  const hasCashback = Boolean(shop.cashbackPercent && Number(shop.cashbackPercent) > 0);
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
    <AnimatePresence>
      {isOpen && (
        <div 
          key="shop-info-modal-wrapper"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
        >
          <motion.div
            key="shop-info-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50"
          />
          <motion.div 
            key="shop-info-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="max-w-xl w-full max-h-[94vh] bg-app-modal border border-app-border rounded-3xl overflow-hidden shadow-2xl relative z-50 flex flex-col text-app-primary my-auto"
          >
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white keep-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-lg hover:scale-105 active:scale-95"
            title="Закрыть"
          >
            <X size={16} className="text-white keep-white stroke-[2.4]" />
          </button>

          {/* Banner / Header Image */}
          {shop.bannerUrl ? (
            <div className="h-36 sm:h-40 w-full relative bg-zinc-900 shrink-0 border-b border-app-border overflow-hidden">
              <img src={shop.bannerUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-4 sm:p-5">
                <div className="flex items-center gap-3 min-w-0 pr-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-bold text-base text-app-primary shrink-0 overflow-hidden shadow-xl border-2 border-white/20 ${
                    shop.logoUrl ? "bg-black/40" : "bg-app-surface"
                  }`}>
                    {shop.logoUrl ? (
                      <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      shop.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white keep-white truncate">{shop.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border backdrop-blur-md ${
                        shop.isOpen !== false 
                          ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/40" 
                          : "bg-rose-500/25 text-rose-300 border-rose-500/40"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${shop.isOpen !== false ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                        <span>{shop.isOpen !== false ? "Работает" : "Закрыто"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-app-border flex items-center justify-between shrink-0 bg-app-modal-header pr-14">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm text-app-primary shrink-0 overflow-hidden shadow-md border border-app-border ${
                  shop.logoUrl ? "bg-transparent" : "bg-app-card"
                }`}>
                  {shop.logoUrl ? (
                    <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    shop.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-app-primary">{shop.name}</h3>
                  <span className="text-[10px] font-mono text-emerald-500 font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{shop.isOpen !== false ? "Работает" : "Закрыто"}</span>
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
                <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">О заведении</span>
                <p className="text-xs text-app-secondary leading-relaxed whitespace-pre-line font-sans">{shop.description}</p>
              </div>
            )}

            {/* Contacts & Working Hours */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">Контакты и адрес</span>
              <div className="p-3 bg-app-card border border-app-border rounded-2xl space-y-2 text-xs text-app-secondary font-mono shadow-xs">
                {shop.workingHours && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-app-surface border border-app-border flex items-center justify-center text-app-muted shrink-0">
                      <Clock size={14} />
                    </div>
                    <div>
                      <span className="block text-[9px] text-app-muted uppercase font-sans">Режим работы</span>
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
                        <span className="block text-[9px] text-app-muted uppercase font-sans">Адрес</span>
                        <span className="text-app-primary font-semibold text-xs truncate block">{shop.address}</span>
                      </div>
                    </div>
                    <a
                      href={`https://yandex.ru/maps/?text=${encodeURIComponent(shop.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-app-surface text-app-primary border border-app-border text-[11px] font-bold shrink-0 hover:bg-app-hover hover:border-emerald-500/40 transition-all flex items-center gap-1 shadow-xs"
                    >
                      <Navigation size={11} className="text-emerald-500" />
                      <span>Карта</span>
                    </a>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center justify-between gap-2.5 pt-1.5 border-t border-app-border/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-app-surface border border-app-border flex items-center justify-center text-app-muted shrink-0">
                        <PhoneIcon size={14} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9px] text-app-muted uppercase font-sans">Телефон для связи</span>
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
                      <span>Позвонить</span>
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
                      {musicSettings.title || "Музыка заведения"}
                    </h4>
                    <p className="text-[10px] text-app-secondary leading-snug truncate">
                      {musicSettings.description || "Музыка которая играет у нас каждый день"}
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
                    Слушать
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
                  <h4 className="text-xs font-bold text-app-primary font-mono">Бонусная программа</h4>
                  <p className="text-[11px] text-app-secondary leading-snug font-sans font-medium mt-0.5">
                    Начисляем <strong className="text-app-primary font-mono">{shop.cashbackPercent}% кэшбэка</strong> с каждой покупки!
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Options */}
            {hasDel && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">Условия доставки и самовывоза</span>
                <div className="p-3 bg-app-card border border-app-border rounded-2xl space-y-1.5 text-xs font-mono text-app-secondary shadow-xs">
                  {del.pickup !== false && del.pickupAddress && (
                    <div className="flex items-center gap-2">
                      <Store size={13} className="text-app-muted shrink-0" />
                      <span>Пункт самовывоза: <strong className="text-app-primary">{del.pickupAddress}</strong></span>
                    </div>
                  )}
                  {del.courier !== false && (del.deliveryMinOrder || del.minOrder) && Number(del.deliveryMinOrder || del.minOrder) > 0 ? (
                    <div className="flex items-center gap-2">
                      <Truck size={13} className="text-app-muted shrink-0" />
                      <span>Минимальная сумма заказа: <strong className="text-app-primary">{del.deliveryMinOrder || del.minOrder} ₽</strong></span>
                    </div>
                  ) : null}
                  {del.courier !== false && (del.deliveryFee || del.deliveryFeeVal) && Number(del.deliveryFee || del.deliveryFeeVal) > 0 ? (
                    <div className="flex items-center gap-2">
                      <Receipt size={13} className="text-app-muted shrink-0" />
                      <span>Стоимость доставки: <strong className="text-app-primary">{del.deliveryFee || del.deliveryFeeVal} ₽</strong></span>
                    </div>
                  ) : null}
                  {del.courier !== false && del.freeDeliveryThreshold && Number(del.freeDeliveryThreshold) > 0 ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5 border-t border-app-border/40">
                      <Sparkles size={13} className="shrink-0" />
                      <span>Бесплатная доставка от {del.freeDeliveryThreshold} ₽</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Payment Instructions */}
            {shop.paymentInstructions && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">Инструкция по оплате</span>
                <div className="p-3 bg-app-card border border-app-border rounded-2xl space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-app-primary font-mono">
                    <CreditCard size={14} className="text-emerald-500 shrink-0" />
                    <span>Способ оплаты / Реквизиты</span>
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
                <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">Социальные сети и мессенджеры</span>
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
                      title="* Instagram принадлежит Meta Platforms Inc., признанной экстремистской организацией и запрещенной в РФ"
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
                      title="* WhatsApp принадлежит компании Meta Platforms Inc., признанной экстремистской организацией и запрещенной на территории РФ"
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
                      <span>ВКонтакте</span>
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
                      <span>Сайт</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Legal Hub */}
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[9px] font-mono text-app-muted uppercase tracking-wider block">Правовая информация и защита данных (РФ)</span>
              
              {onOpenPrivacy && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPrivacy();
                  }}
                  className="w-full p-2.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-2xl transition-all flex items-center justify-between group cursor-pointer shadow-xs hover:border-emerald-500/30"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                      <ShieldCheck size={14} />
                    </div>
                    <div className="text-left">
                      <span className="font-bold block text-xs">Правовой центр и 152-ФЗ</span>
                      <span className="text-[10px] text-app-muted font-normal block">Политика конфиденциальности, Оферта и Чеки (54-ФЗ)</span>
                    </div>
                  </div>
                  <ExternalLink size={13} className="text-app-muted group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              )}

              {/* Meta Disclaimer */}
              {(socials.instagram || socials.whatsapp) && (
                <div
                  className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-mono space-y-0.5 leading-tight"
                  style={{ color: "oklch(0.78 0.18 87.53)" }}
                >
                  <strong className="block font-bold">* Примечание о маркировке:</strong>
                  <p>
                    Instagram, WhatsApp и Facebook принадлежат компании Meta Platforms Inc., признанной экстремистской организацией и запрещенной на территории РФ.
                  </p>
                </div>
              )}
            </div>

            <button 
              onClick={onClose}
              className="w-full py-2.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-xs hover:border-app-border-hover active:scale-[0.99]"
            >
              Закрыть окно
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
