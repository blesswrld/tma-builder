import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Clock, MapPin, Navigation, Phone as PhoneIcon, Gift, Store, Truck, Receipt, Sparkles, CreditCard, Send, ExternalLink, MessageCircle, Globe, Github, ShieldCheck } from "lucide-react";
import { Shop, parseSocialLinks, parseDeliveryOptions } from "../../types";

interface ShopInfoModalProps {
  shop: Shop;
  isOpen: boolean;
  onClose: () => void;
}

export const ShopInfoModal: React.FC<ShopInfoModalProps> = ({ shop, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const socials = parseSocialLinks(shop.socialLinks);
  const del = parseDeliveryOptions(shop.deliveryOptions);
  const hasSoc = Boolean(socials.telegram || socials.instagram || socials.whatsapp || socials.vk || socials.website);
  const hasDel = Boolean(del.pickup || del.courier || del.shipping || del.pickupAddress || del.deliveryMinOrder || del.deliveryFee);

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-hidden"
      >
        <motion.div 
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="max-w-lg w-full max-h-[90vh] bg-app-modal border border-app-border rounded-3xl overflow-hidden shadow-2xl relative flex flex-col text-app-primary my-auto"
        >
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="absolute top-3.5 right-3.5 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white keep-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-lg"
            title="Закрыть"
          >
            <X size={18} className="text-white keep-white" />
          </button>

          {/* Banner / Header Image */}
          {shop.bannerUrl ? (
            <div className="h-44 w-full relative bg-zinc-900 shrink-0 border-b border-app-border overflow-hidden">
              <img src={shop.bannerUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-5">
                <div className="flex items-center gap-3.5 min-w-0 pr-10">
                  <div className="w-12 h-12 rounded-2xl bg-app-surface flex items-center justify-center font-mono font-bold text-base text-app-primary shrink-0 overflow-hidden shadow-lg">
                    {shop.logoUrl ? (
                      <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      shop.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold tracking-tight text-white keep-white truncate">{shop.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                        shop.isOpen !== false 
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                          : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${shop.isOpen !== false ? "bg-emerald-400" : "bg-rose-400"}`} />
                        <span>{shop.isOpen !== false ? "Работает" : "Закрыто"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 pb-4 border-b border-app-border flex items-center justify-between shrink-0 bg-app-modal-header pr-14">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-app-card flex items-center justify-center font-mono font-bold text-sm text-app-primary shrink-0 overflow-hidden">
                  {shop.logoUrl ? (
                    <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    shop.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-app-primary">{shop.name}</h3>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold block">
                    {shop.isOpen !== false ? "● Работает" : "○ Закрыто"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-5 scrollbar-none">
            {/* Description */}
            {shop.description && (
              <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-1">
                <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">О заведении</span>
                <p className="text-xs text-app-secondary leading-relaxed whitespace-pre-line">{shop.description}</p>
              </div>
            )}

            {/* Contacts & Working Hours */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">Контакты и адрес</span>
              <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-2.5 text-xs text-app-secondary font-mono">
                {shop.workingHours && (
                  <div className="flex items-center gap-2.5">
                    <Clock size={15} className="text-amber-500 shrink-0" />
                    <div>
                      <span className="block text-[9px] text-app-muted uppercase">Режим работы</span>
                      <span className="text-app-primary font-medium">{shop.workingHours}</span>
                    </div>
                  </div>
                )}
                {shop.address && (
                  <div className="flex items-start gap-2.5 pt-1 border-t border-app-border/60">
                    <MapPin size={15} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-[9px] text-app-muted uppercase">Адрес</span>
                      <span className="text-app-primary font-medium block">{shop.address}</span>
                    </div>
                    <a
                      href={`https://yandex.ru/maps/?text=${encodeURIComponent(shop.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold shrink-0 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                    >
                      <Navigation size={11} />
                      <span>Карта</span>
                    </a>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-2.5 pt-1 border-t border-app-border/60">
                    <PhoneIcon size={15} className="text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-[9px] text-app-muted uppercase">Телефон для связи</span>
                      <a href={`tel:${shop.phone}`} className="text-app-primary font-medium hover:underline block">
                        {shop.phone}
                      </a>
                    </div>
                    <a
                      href={`tel:${shop.phone}`}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold shrink-0 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                    >
                      <PhoneIcon size={11} />
                      <span>Вызов</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Cashback Bonus System */}
            {Boolean(shop.cashbackPercent) && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Gift size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-400 font-mono">Бонусная программа</h4>
                  <p className="text-[11px] text-app-secondary leading-snug font-sans">
                    Начисляем <strong className="text-amber-400 font-mono">{shop.cashbackPercent}% кэшбэка</strong> на ваш бонусный счёт с каждой покупки!
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Options */}
            {hasDel && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">Условия доставки и самовывоза</span>
                <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-2 text-xs font-mono text-app-secondary">
                  {del.pickupAddress && (
                    <div className="flex items-center gap-2">
                      <Store size={14} className="text-indigo-400 shrink-0" />
                      <span>Пункт самовывоза: {del.pickupAddress}</span>
                    </div>
                  )}
                  {(del.deliveryMinOrder || del.minOrder) && (
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-sky-400 shrink-0" />
                      <span>Минимальная сумма заказа: {del.deliveryMinOrder || del.minOrder} ₽</span>
                    </div>
                  )}
                  {(del.deliveryFee || del.deliveryFeeVal) && (
                    <div className="flex items-center gap-2">
                      <Receipt size={14} className="text-emerald-400 shrink-0" />
                      <span>Стоимость доставки: {del.deliveryFee || del.deliveryFeeVal} ₽</span>
                    </div>
                  )}
                  {del.freeDeliveryThreshold ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <Sparkles size={14} className="shrink-0" />
                      <span>Бесплатная доставка от {del.freeDeliveryThreshold} ₽</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Payment Instructions */}
            {shop.paymentInstructions && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">Инструкция по оплате</span>
                <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-app-primary font-mono">
                    <CreditCard size={15} className="text-amber-500 shrink-0" />
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
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">Социальные сети и мессенджеры</span>
                <div className="grid grid-cols-2 gap-2">
                  {socials.telegram && (
                    <a
                      href={socials.telegram.startsWith("http") ? socials.telegram : `https://t.me/${socials.telegram.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 px-3 bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Send size={14} />
                      <span>Telegram</span>
                    </a>
                  )}
                  {socials.instagram && (
                    <a
                      href={socials.instagram.startsWith("http") ? socials.instagram : `https://instagram.com/${socials.instagram}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 px-3 bg-pink-500/15 text-pink-400 border border-pink-500/30 hover:bg-pink-500/25 font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={14} />
                      <span>Instagram</span>
                    </a>
                  )}
                  {socials.whatsapp && (
                    <a
                      href={socials.whatsapp.startsWith("http") ? socials.whatsapp : `https://wa.me/${socials.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 px-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  {socials.vk && (
                    <a
                      href={socials.vk.startsWith("http") ? socials.vk : `https://vk.com/${socials.vk}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 px-3 bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Globe size={14} />
                      <span>ВКонтакте</span>
                    </a>
                  )}
                  {socials.website && (
                    <a
                      href={socials.website.startsWith("http") ? socials.website : `https://${socials.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="col-span-2 py-2.5 px-3 bg-app-card text-app-primary border border-app-border hover:bg-app-hover font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Globe size={14} />
                      <span>Официальный сайт</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Open Source / Security */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">Безопасность и открытый код</span>
              <a
                href="https://github.com/blesswrld/tma-builder"
                target="_blank"
                rel="noreferrer"
                className="w-full p-3 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-2xl transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-white shrink-0">
                    <Github size={15} />
                  </div>
                  <div>
                    <span className="font-bold block text-xs">Исходный код приложения</span>
                    <span className="text-[10px] text-app-muted font-normal block">github.com/blesswrld/tma-builder</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-[11px] font-bold">
                  <ShieldCheck size={14} />
                  <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-3 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-bold rounded-2xl transition-colors cursor-pointer"
            >
              Закрыть окно
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
