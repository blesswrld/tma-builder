import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, X, Gift, CreditCard, Truck, Store, Globe, AlertCircle } from "lucide-react";
import { Shop, Service } from "../../types";
import { SpinnerLoader } from "../Skeleton";

interface CheckoutModalProps {
  shop: Shop;
  cart: { [key: string]: number };
  isOpen: boolean;
  onClose: () => void;
  promocodeInput: string;
  setPromocodeInput: (val: string) => void;
  handleValidatePromo: () => void;
  isValidatingPromo: boolean;
  promoError: string | null;
  appliedPromo: any;
  discountValue: number;
  tipPercent: number;
  setTipPercent: (val: number) => void;
  customTip: string;
  setCustomTip: (val: string) => void;
  tipAmount: number;
  totalPrice: number;
  finalTotalPrice: number;
  fulfillmentMethod: string;
  setFulfillmentMethod: (val: string) => void;
  isCourierDisabled: boolean;
  isPickupDisabled: boolean;
  isOnlineDisabled?: boolean;
  calculatedDeliveryFee: number;
  isDeliveryFree: boolean;
  deliveryMinOrderVal: number;
  freeDeliveryThreshVal: number;
  formData: {
    name: string;
    phone: string;
    deliveryAddress: string;
    tableNumber: string;
    preferredTime: string;
    note: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    phone: string;
    deliveryAddress: string;
    tableNumber: string;
    preferredTime: string;
    note: string;
  }>>;
  formErrors: { [key: string]: string };
  isSubmitting: boolean;
  handleSubmitOrder: (e: React.FormEvent) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  shop,
  cart,
  isOpen,
  onClose,
  promocodeInput,
  setPromocodeInput,
  handleValidatePromo,
  isValidatingPromo,
  promoError,
  appliedPromo,
  discountValue,
  tipPercent,
  setTipPercent,
  customTip,
  setCustomTip,
  tipAmount,
  totalPrice,
  finalTotalPrice,
  fulfillmentMethod,
  setFulfillmentMethod,
  isCourierDisabled,
  isPickupDisabled,
  isOnlineDisabled = false,
  calculatedDeliveryFee,
  isDeliveryFree,
  deliveryMinOrderVal,
  freeDeliveryThreshVal,
  formData,
  setFormData,
  formErrors,
  isSubmitting,
  handleSubmitOrder,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md z-50"
      />
      <motion.div 
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="fixed inset-y-0 right-0 w-full max-w-md bg-app-modal border-l border-app-border z-50 flex flex-col shadow-2xl text-app-primary font-sans"
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-app-muted" />
            <h2 className="text-sm font-semibold tracking-tight text-app-primary">Корзина</h2>
          </div>
          <button onClick={onClose} className="text-app-muted hover:text-app-primary transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-3">Товары</h3>
            <div className="space-y-3">
              {Object.entries(cart).map(([id, qty]) => {
                const service = (shop?.services || []).find((s: Service) => s.id === id);
                if (!service) return null;
                return (
                  <div key={id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-app-card border border-app-border">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-app-muted">{qty}×</span>
                      <span className="font-medium text-app-primary">{service.title}</span>
                    </div>
                    <span className="font-mono font-semibold text-app-primary">{service.price * Number(qty)} ₽</span>
                  </div>
                );
              })}
            </div>

            {/* Promocode section */}
            <div className="mt-6 pt-4 border-t border-app-border space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promocodeInput}
                  onChange={e => setPromocodeInput(e.target.value.toUpperCase())}
                  placeholder="Промокод"
                  className="flex-1 bg-app-input border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={handleValidatePromo}
                  disabled={isValidatingPromo || !promocodeInput.trim()}
                  className="px-4 bg-app-secondary hover:bg-app-hover text-app-primary text-xs rounded-xl transition-colors disabled:opacity-50 font-mono flex items-center justify-center gap-1.5"
                >
                  {isValidatingPromo && <SpinnerLoader size={12} />}
                  {isValidatingPromo ? "Проверка..." : "Применить"}
                </button>
              </div>
              {promoError && <p className="text-xs text-rose-400 font-mono">{promoError}</p>}
              {appliedPromo && (
                <div className="flex justify-between items-center text-xs font-mono text-emerald-500">
                  <span>Промокод {appliedPromo.code} применён</span>
                  <span>-{discountValue} ₽</span>
                </div>
              )}
            </div>

            {/* Tipping Options Section */}
            <div className="mt-6 pt-4 border-t border-app-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">Чаевые персоналу</span>
                {tipAmount > 0 && <span className="text-xs font-mono text-amber-500 font-bold">+{tipAmount} ₽</span>}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 5, 10, 15].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setTipPercent(p);
                      setCustomTip("");
                    }}
                    className={`py-2 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
                      tipPercent === p && !customTip 
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold shadow-sm" 
                        : "bg-app-surface text-app-secondary border-app-border hover:text-app-primary hover:bg-app-hover"
                    }`}
                  >
                    {p === 0 ? "Без чаевых" : `${p}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-app-border space-y-1.5 font-mono">
              <div className="flex justify-between items-center text-xs text-app-muted">
                <span>Товары ({(Object.values(cart) as number[]).reduce((acc, qty) => acc + (qty || 0), 0)})</span>
                <span>{totalPrice} ₽</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-500">
                  <span>Скидка</span>
                  <span>-{discountValue} ₽</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-500">
                  <span>Чаевые</span>
                  <span>+{tipAmount} ₽</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs text-sky-400">
                <span>Доставка</span>
                <span>
                  {fulfillmentMethod === "courier"
                    ? (calculatedDeliveryFee === 0 
                        ? (isDeliveryFree ? "Бесплатно (акция)" : "Бесплатно") 
                        : `+${calculatedDeliveryFee} ₽`)
                    : "0 ₽ (Самовывоз)"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-app-border text-base font-bold text-app-primary">
                <span className="text-xs text-app-muted uppercase font-normal">К оплате</span>
                <span>{finalTotalPrice} ₽</span>
              </div>

              {Boolean(shop.cashbackPercent) && (
                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-amber-400 font-semibold bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  <div className="flex items-center gap-1.5">
                    <Gift size={13} className="shrink-0" />
                    <span>Бонус за заказ ({shop.cashbackPercent}%)</span>
                  </div>
                  <span>+{Math.round((finalTotalPrice * (shop.cashbackPercent || 5)) / 100)} ₽</span>
                </div>
              )}
            </div>
          </div>

          {shop.paymentInstructions && (
            <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-app-primary font-mono">
                <CreditCard size={14} className="text-amber-500 shrink-0" />
                <span>Инструкции по оплате</span>
              </div>
              <p className="text-xs text-app-secondary leading-relaxed font-sans whitespace-pre-line bg-app-surface p-2.5 rounded-xl border border-app-border/60">
                {shop.paymentInstructions}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-3">Способ получения и данные</h3>
            
            {/* Fulfillment Method Selector */}
            <div className="grid grid-cols-3 gap-2 mb-3 font-mono text-xs">
              <button
                type="button"
                disabled={isCourierDisabled}
                onClick={() => !isCourierDisabled && setFulfillmentMethod("courier")}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isCourierDisabled
                    ? "bg-app-card/30 text-app-muted/40 border-app-border/40 cursor-not-allowed opacity-40 select-none"
                    : fulfillmentMethod === "courier"
                    ? "bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sm cursor-pointer"
                    : "bg-app-card text-app-muted border-app-border hover:bg-app-hover hover:text-app-primary cursor-pointer"
                }`}
                title={isCourierDisabled ? "Доставка недоступна для выбранных позиций" : undefined}
              >
                <Truck size={14} />
                <span>Курьер</span>
              </button>
              <button
                type="button"
                disabled={isPickupDisabled}
                onClick={() => !isPickupDisabled && setFulfillmentMethod("pickup")}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isPickupDisabled
                    ? "bg-app-card/30 text-app-muted/40 border-app-border/40 cursor-not-allowed opacity-40 select-none"
                    : fulfillmentMethod === "pickup"
                    ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-sm cursor-pointer"
                    : "bg-app-card text-app-muted border-app-border hover:bg-app-hover hover:text-app-primary cursor-pointer"
                }`}
                title={isPickupDisabled ? "Самовывоз недоступен для выбранных позиций" : undefined}
              >
                <Store size={14} />
                <span>Самовывоз</span>
              </button>
              <button
                type="button"
                disabled={isOnlineDisabled}
                onClick={() => !isOnlineDisabled && setFulfillmentMethod("online")}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isOnlineDisabled
                    ? "bg-app-card/30 text-app-muted/40 border-app-border/40 cursor-not-allowed opacity-40 select-none"
                    : fulfillmentMethod === "online"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm cursor-pointer"
                    : "bg-app-card text-app-muted border-app-border hover:bg-app-hover hover:text-app-primary cursor-pointer"
                }`}
                title={isOnlineDisabled ? "Онлайн недоступен для выбранных позиций" : undefined}
              >
                <Globe size={14} />
                <span>Онлайн</span>
              </button>
            </div>

            {formErrors.general && (
              <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-mono flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formErrors.general}</span>
              </div>
            )}

            <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-3">
              {fulfillmentMethod === "courier" && (
                <div>
                  <input 
                    type="text" 
                    maxLength={120}
                    value={formData.deliveryAddress} 
                    onChange={e => setFormData(p => ({ ...p, deliveryAddress: e.target.value }))} 
                    placeholder="Адрес доставки (город, улица, дом, квартира) *" 
                    className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors font-sans" 
                  />
                  {formErrors.deliveryAddress && <p className="text-[11px] text-rose-400 mt-1 font-mono">{formErrors.deliveryAddress}</p>}
                  
                  {deliveryMinOrderVal > 0 && totalPrice < deliveryMinOrderVal && (
                    <p className="text-[11px] text-amber-400 mt-1 font-mono">
                      Минимальный заказ для доставки: {deliveryMinOrderVal} ₽ (не хватает {deliveryMinOrderVal - totalPrice} ₽)
                    </p>
                  )}
                  {isDeliveryFree ? (
                    <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                      ✓ Бесплатная доставка при заказе от {freeDeliveryThreshVal} ₽ применены!
                    </p>
                  ) : freeDeliveryThreshVal > 0 ? (
                    <p className="text-[11px] text-app-muted mt-1 font-mono">
                      Добавьте ещё на {freeDeliveryThreshVal - totalPrice} ₽ для бесплатной доставки!
                    </p>
                  ) : null}
                </div>
              )}

              {fulfillmentMethod === "pickup" && (
                <div className="p-3 bg-app-card border border-app-border rounded-xl text-xs space-y-1 font-sans">
                  <span className="font-bold text-app-primary font-mono block">Пункт самовывоза:</span>
                  <p className="text-app-secondary">
                    {shop.address || "Адрес заведения"}
                  </p>
                </div>
              )}

              <div>
                <input 
                  type="text" 
                  maxLength={50}
                  value={formData.name} 
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} 
                  placeholder="Ваше имя *" 
                  className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors" 
                />
                {formErrors.name && <p className="text-[11px] text-rose-400 mt-1 font-mono">{formErrors.name}</p>}
              </div>
              <div>
                <input 
                  type="tel" 
                  maxLength={20}
                  value={formData.phone} 
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} 
                  placeholder="Номер телефона *" 
                  className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors font-mono" 
                />
                {formErrors.phone && <p className="text-[11px] text-rose-400 mt-1 font-mono">{formErrors.phone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  maxLength={30}
                  value={formData.tableNumber} 
                  onChange={e => setFormData(p => ({ ...p, tableNumber: e.target.value }))} 
                  placeholder="№ стола (опционально)" 
                  className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors" 
                />
                <input 
                  type="text" 
                  maxLength={30}
                  value={formData.preferredTime} 
                  onChange={e => setFormData(p => ({ ...p, preferredTime: e.target.value }))} 
                  placeholder="Желаемое время" 
                  className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors" 
                />
              </div>
              <div className="relative">
                <textarea 
                  rows={2} 
                  maxLength={300}
                  value={formData.note} 
                  onChange={e => setFormData(p => ({ ...p, note: e.target.value }))} 
                  placeholder="Комментарий к заказу (до 300 символов)..." 
                  className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors resize-none" 
                />
                <span className="absolute bottom-2 right-2 text-[10px] font-mono text-app-muted pointer-events-none">
                  {formData.note.length}/300
                </span>
              </div>
            </form>
          </div>
        </div>
        
        <div className="p-6 border-t border-app-border bg-app-bg">
          <button
            form="checkout-form"
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-app-accent text-app-accent-fg font-bold text-xs rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2.5 font-mono uppercase tracking-wider cursor-pointer shadow-lg"
          >
            {isSubmitting ? (
              <>
                <SpinnerLoader size={16} />
                <span>Обработка заказа...</span>
              </>
            ) : (
              <>
                <ShoppingBag size={16} className="text-app-accent-fg" />
                <span>Подтвердить заказ ({finalTotalPrice} ₽)</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
