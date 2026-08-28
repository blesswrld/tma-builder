import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, X, Gift, CreditCard, Truck, Store, Package, Globe, AlertCircle, Clock, FileText, User, Phone, MapPin, Hash } from "lucide-react";
import { Shop, Service } from "../../types";
import { SpinnerLoader } from "../Skeleton";
import { useScrollLock } from "../../hooks/useScrollLock";
import CityDropdown from "../CityDropdown";
import { formatPhoneInputLive } from "../../lib/validation";

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
  isShippingDisabled?: boolean;
  isOnlineDisabled?: boolean;
  calculatedDeliveryFee: number;
  isDeliveryFree: boolean;
  deliveryMinOrderVal: number;
  freeDeliveryThreshVal: number;
  formData: {
    name: string;
    phone: string;
    city?: string;
    deliveryAddress: string;
    tableNumber: string;
    preferredTime: string;
    note: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    phone: string;
    city?: string;
    deliveryAddress: string;
    tableNumber: string;
    preferredTime: string;
    note: string;
  }>>;
  formErrors: { [key: string]: string };
  isSubmitting: boolean;
  handleSubmitOrder: (e: React.FormEvent) => void;
  onOpenPrivacy?: () => void;
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
  isShippingDisabled = false,
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
  onOpenPrivacy,
}) => {
  useScrollLock(isOpen);

  // Parse delivery options from shop
  const deliveryOpts: any = shop.deliveryOptions
    ? typeof shop.deliveryOptions === "string"
      ? (() => {
          try {
            return JSON.parse(shop.deliveryOptions);
          } catch {
            return {};
          }
        })()
      : shop.deliveryOptions
    : {};

  const hasCourierConfigured = deliveryOpts?.enabled !== false && deliveryOpts?.courier !== false;
  const hasPickupConfigured = deliveryOpts?.enabled !== false && deliveryOpts?.pickup !== false;
  const hasShippingConfigured = deliveryOpts?.enabled !== false && Boolean(deliveryOpts?.shipping);

  const availableOptionsCount = (hasCourierConfigured ? 1 : 0) + (hasPickupConfigured ? 1 : 0) + (hasShippingConfigured ? 1 : 0);
  const gridColsClass = availableOptionsCount >= 3 ? "grid-cols-3" : availableOptionsCount === 2 ? "grid-cols-2" : "grid-cols-1";

  // Handle phone input with live CIS mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhoneInputLive(raw);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="checkout-modal-container" className="fixed inset-0 z-50">
          <motion.div 
            key="checkout-backdrop"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50"
          />
          <motion.div 
            key="checkout-panel"
            initial={{ x: "100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "100%" }} 
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-app-modal border-l border-app-border z-50 flex flex-col shadow-2xl text-app-primary font-sans"
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-app-muted" />
                <h2 className="text-sm font-semibold tracking-tight text-app-primary">Оформление заказа</h2>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="text-app-muted hover:text-app-primary transition-colors p-1.5 rounded-lg hover:bg-app-hover cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
              {/* Order Items Summary */}
              <div>
                <h3 className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-3">Состав заказа</h3>
                <div className="space-y-2.5">
                  {Object.entries(cart).map(([id, qty]) => {
                    const service = (shop?.services || []).find((s: Service) => s.id === id);
                    if (!service) return null;
                    return (
                      <div key={id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-app-card border border-app-border">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="font-mono text-app-muted shrink-0 font-bold">{qty}×</span>
                          <span className="font-medium text-app-primary truncate">{service.title}</span>
                        </div>
                        <span className="font-mono font-semibold text-app-primary shrink-0">{service.price * Number(qty)} ₽</span>
                      </div>
                    );
                  })}
                </div>

                {/* Promocode section */}
                <div className="mt-5 pt-4 border-t border-app-border space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promocodeInput}
                      onChange={e => setPromocodeInput(e.target.value.toUpperCase())}
                      placeholder="Промокод на скидку"
                      className="flex-1 bg-app-input border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleValidatePromo}
                      disabled={isValidatingPromo || !promocodeInput.trim()}
                      className="px-4 bg-app-secondary hover:bg-app-hover text-app-primary text-xs rounded-xl transition-colors disabled:opacity-50 font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isValidatingPromo && <SpinnerLoader size={12} />}
                      {isValidatingPromo ? "Проверка..." : "Применить"}
                    </button>
                  </div>
                  {promoError && <p className="text-xs text-rose-500 font-mono">{promoError}</p>}
                  {appliedPromo && (
                    <div className="flex justify-between items-center text-xs font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                      <span>✓ Промокод {appliedPromo.code} применён</span>
                      <span className="font-semibold">-{discountValue} ₽</span>
                    </div>
                  )}
                </div>

                {/* Tipping Options Section */}
                <div className="mt-5 pt-4 border-t border-app-border space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">Чаевые заведению</span>
                    {tipAmount > 0 && <span className="text-xs font-mono text-app-primary font-bold">+{tipAmount} ₽</span>}
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
                            ? "bg-app-accent text-app-accent-fg border-app-accent font-bold shadow-sm" 
                            : "bg-app-surface text-app-secondary border-app-border hover:text-app-primary hover:bg-app-hover"
                        }`}
                      >
                        {p === 0 ? "0%" : `${p}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Totals Breakdown */}
                <div className="mt-4 pt-4 border-t border-app-border space-y-1.5 font-mono">
                  <div className="flex justify-between items-center text-xs text-app-muted">
                    <span>Товары ({(Object.values(cart) as number[]).reduce((acc, qty) => acc + (qty || 0), 0)})</span>
                    <span>{totalPrice} ₽</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-500">
                      <span>Скидка</span>
                      <span className="font-semibold">-{discountValue} ₽</span>
                    </div>
                  )}
                  {tipAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-app-primary">
                      <span>Чаевые</span>
                      <span className="font-semibold">+{tipAmount} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs text-app-muted">
                    <span>Доставка</span>
                    <span className="text-app-primary font-medium">
                      {fulfillmentMethod === "courier"
                        ? (calculatedDeliveryFee === 0 
                            ? (isDeliveryFree ? "Бесплатно (акция)" : "Бесплатно") 
                            : `+${calculatedDeliveryFee} ₽`)
                        : fulfillmentMethod === "shipping"
                        ? (calculatedDeliveryFee > 0 ? `+${calculatedDeliveryFee} ₽` : "0 ₽ (Почта / СДЭК)")
                        : fulfillmentMethod === "online"
                        ? "Онлайн (0 ₽)"
                        : "0 ₽ (Самовывоз)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-app-border text-base font-bold text-app-primary">
                    <span className="text-xs text-app-muted uppercase font-normal">Итого к оплате</span>
                    <span>{finalTotalPrice} ₽</span>
                  </div>

                  {Boolean(shop.cashbackPercent && Number(shop.cashbackPercent) > 0) && (
                    <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-app-primary font-semibold bg-app-card p-2.5 rounded-xl border border-app-border">
                      <div className="flex items-center gap-1.5">
                        <Gift size={13} className="shrink-0 text-app-muted" />
                        <span>Бонусы за заказ ({shop.cashbackPercent}%)</span>
                      </div>
                      <span>+{Math.round((finalTotalPrice * Number(shop.cashbackPercent)) / 100)} ₽</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Instructions */}
              {shop.paymentInstructions && (
                <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-app-primary font-mono">
                    <CreditCard size={14} className="text-app-muted shrink-0" />
                    <span>Инструкции по оплате</span>
                  </div>
                  <p className="text-xs text-app-secondary leading-relaxed font-sans whitespace-pre-line bg-app-surface p-2.5 rounded-xl border border-app-border/60">
                    {shop.paymentInstructions}
                  </p>
                </div>
              )}

              {/* Delivery / Fulfillment Section */}
              <div>
                <h3 className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-3">Способ получения и данные</h3>
                
                {/* Fulfillment Method Selector */}
                <div className={`grid ${gridColsClass} gap-2 mb-4 font-mono text-xs`}>
                  {hasCourierConfigured && (
                    <button
                      type="button"
                      disabled={isCourierDisabled}
                      onClick={() => !isCourierDisabled && setFulfillmentMethod("courier")}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isCourierDisabled
                          ? "bg-app-card/30 text-app-muted/40 border-app-border/40 cursor-not-allowed opacity-40 select-none"
                          : fulfillmentMethod === "courier"
                          ? "bg-app-accent text-app-accent-fg border-app-accent shadow-sm cursor-pointer"
                          : "bg-app-card text-app-muted border-app-border hover:bg-app-hover hover:text-app-primary cursor-pointer"
                      }`}
                      title={isCourierDisabled ? "Доставка курьером недоступна" : undefined}
                    >
                      <Truck size={14} />
                      <span>Курьер</span>
                    </button>
                  )}

                  {hasPickupConfigured && (
                    <button
                      type="button"
                      disabled={isPickupDisabled}
                      onClick={() => !isPickupDisabled && setFulfillmentMethod("pickup")}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isPickupDisabled
                          ? "bg-app-card/30 text-app-muted/40 border-app-border/40 cursor-not-allowed opacity-40 select-none"
                          : fulfillmentMethod === "pickup"
                          ? "bg-app-accent text-app-accent-fg border-app-accent shadow-sm cursor-pointer"
                          : "bg-app-card text-app-muted border-app-border hover:bg-app-hover hover:text-app-primary cursor-pointer"
                      }`}
                      title={isPickupDisabled ? "Самовывоз недоступен" : undefined}
                    >
                      <Store size={14} />
                      <span>Самовывоз</span>
                    </button>
                  )}

                  {hasShippingConfigured && (
                    <button
                      type="button"
                      disabled={isShippingDisabled}
                      onClick={() => !isShippingDisabled && setFulfillmentMethod("shipping")}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isShippingDisabled
                          ? "bg-app-card/30 text-app-muted/40 border-app-border/40 cursor-not-allowed opacity-40 select-none"
                          : fulfillmentMethod === "shipping"
                          ? "bg-app-accent text-app-accent-fg border-app-accent shadow-sm cursor-pointer"
                          : "bg-app-card text-app-muted border-app-border hover:bg-app-hover hover:text-app-primary cursor-pointer"
                      }`}
                      title={isShippingDisabled ? "Доставка Почтой / СДЭК недоступна" : undefined}
                    >
                      <Package size={14} />
                      <span>Почта / СДЭК</span>
                    </button>
                  )}

                  {!hasShippingConfigured && isOnlineDisabled === false && !hasCourierConfigured && (
                    <button
                      type="button"
                      disabled={isOnlineDisabled}
                      onClick={() => !isOnlineDisabled && setFulfillmentMethod("online")}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isOnlineDisabled
                          ? "bg-app-card/30 text-app-muted/40 border-app-border/40 cursor-not-allowed opacity-40 select-none"
                          : fulfillmentMethod === "online"
                          ? "bg-app-accent text-app-accent-fg border-app-accent shadow-sm cursor-pointer"
                          : "bg-app-card text-app-muted border-app-border hover:bg-app-hover hover:text-app-primary cursor-pointer"
                      }`}
                      title={isOnlineDisabled ? "Онлайн недоступен для выбранных позиций" : undefined}
                    >
                      <Globe size={14} />
                      <span>Онлайн</span>
                    </button>
                  )}
                </div>

                {formErrors.general && (
                  <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-mono font-medium flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{formErrors.general}</span>
                  </div>
                )}

                {/* Form without native browser bubbles */}
                <form id="checkout-form" onSubmit={handleSubmitOrder} noValidate className="space-y-4">
                  {/* COURIER DELIVERY FIELDS */}
                  {fulfillmentMethod === "courier" && (
                    <div className="space-y-3 p-3.5 bg-app-card/50 border border-app-border rounded-2xl">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-app-primary font-mono">
                        <Truck size={14} className="text-app-muted" />
                        <span>Адрес курьерской доставки</span>
                      </div>

                      {/* City Dropdown Selection */}
                      <CityDropdown
                        value={formData.city || ""}
                        onChange={(selectedCity) => {
                          setFormData(prev => ({ ...prev, city: selectedCity }));
                        }}
                        error={formErrors.city}
                        label="Город доставки"
                        placeholder="Выберите город доставки..."
                        required
                      />

                      {/* Street & House */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-app-muted flex items-center gap-1">
                          <MapPin size={12} className="text-app-muted" />
                          <span>Улица, номер дома, корпус</span>
                          <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <input 
                          type="text" 
                          maxLength={120}
                          value={formData.deliveryAddress} 
                          onChange={e => setFormData(p => ({ ...p, deliveryAddress: e.target.value }))} 
                          placeholder="Например: ул. Пушкина, д. 15, корп. 2" 
                          className={`w-full bg-app-input border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none transition-colors font-sans ${
                            formErrors.deliveryAddress
                              ? "border-rose-500/60 ring-1 ring-rose-500/20 bg-rose-500/5"
                              : "border-app-border focus:border-app-border/80"
                          }`} 
                        />
                        {formErrors.deliveryAddress && (
                          <p className="text-[11px] text-rose-400 mt-1 font-mono flex items-center gap-1">
                            <AlertCircle size={12} />
                            <span>{formErrors.deliveryAddress}</span>
                          </p>
                        )}
                      </div>

                      {/* Desired Delivery Time */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-app-muted flex items-center gap-1">
                          <Clock size={12} className="text-app-muted" />
                          <span>Желаемое время доставки</span>
                        </label>
                        <input 
                          type="text" 
                          maxLength={40}
                          value={formData.preferredTime} 
                          onChange={e => setFormData(p => ({ ...p, preferredTime: e.target.value }))} 
                          placeholder="Как можно скорее или укажите время (напр. к 19:30)" 
                          className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border/80 transition-colors font-sans" 
                        />
                      </div>

                      {deliveryMinOrderVal > 0 && totalPrice < deliveryMinOrderVal && (
                        <div className="mt-2 p-2.5 bg-app-card border border-app-border rounded-xl text-app-primary text-[11px] font-mono flex items-center gap-1.5">
                          <AlertCircle size={13} className="text-app-muted shrink-0" />
                          <span>Минимальный заказ для доставки: {deliveryMinOrderVal} ₽ (не хватает {deliveryMinOrderVal - totalPrice} ₽)</span>
                        </div>
                      )}
                      {isDeliveryFree ? (
                        <p className="text-[11px] text-emerald-500 font-semibold mt-1 font-mono">
                          ✓ Бесплатная доставка при заказе от {freeDeliveryThreshVal} ₽ применена!
                        </p>
                      ) : freeDeliveryThreshVal > 0 ? (
                        <p className="text-[11px] text-app-muted mt-1 font-mono">
                          💡 Добавьте ещё на {freeDeliveryThreshVal - totalPrice} ₽ для бесплатной доставки!
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* SHIPPING / CDEK / RUSSIAN POST FIELDS */}
                  {fulfillmentMethod === "shipping" && (
                    <div className="space-y-3 p-3.5 bg-app-card/50 border border-app-border rounded-2xl">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-app-primary font-mono">
                        <Package size={14} className="text-app-muted" />
                        <span>Доставка Почтой России / СДЭК</span>
                      </div>

                      {/* City Dropdown Selection */}
                      <CityDropdown
                        value={formData.city || ""}
                        onChange={(selectedCity) => {
                          setFormData(prev => ({ ...prev, city: selectedCity }));
                        }}
                        error={formErrors.city}
                        label="Город получения посылки"
                        placeholder="Выберите город назначения..."
                        required
                      />

                      {/* Postal Index or CDEK Address */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-app-muted flex items-center gap-1">
                          <MapPin size={12} className="text-app-muted" />
                          <span>Почтовый индекс (6 цифр) или адрес ПВЗ СДЭК</span>
                          <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <input 
                          type="text" 
                          maxLength={150}
                          value={formData.deliveryAddress} 
                          onChange={e => setFormData(p => ({ ...p, deliveryAddress: e.target.value }))} 
                          placeholder="Например: 364000 или ПВЗ СДЭК ул. Мира, 10" 
                          className={`w-full bg-app-input border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none transition-colors font-sans ${
                            formErrors.deliveryAddress
                              ? "border-rose-500/60 ring-1 ring-rose-500/20 bg-rose-500/5"
                              : "border-app-border focus:border-app-border/80"
                          }`} 
                        />
                        {formErrors.deliveryAddress && (
                          <p className="text-[11px] text-rose-400 mt-1 font-mono flex items-center gap-1">
                            <AlertCircle size={12} />
                            <span>{formErrors.deliveryAddress}</span>
                          </p>
                        )}
                        <p className="text-[10px] text-app-muted font-mono leading-relaxed pt-0.5">
                          📦 Для отправки укажите 6-значный индекс вашего почтового отделения или адрес/код пункта выдачи СДЭК.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PICKUP FIELDS */}
                  {fulfillmentMethod === "pickup" && (
                    <div className="space-y-3 p-3.5 bg-app-card/50 border border-app-border rounded-2xl">
                      <div className="p-3 bg-app-surface border border-app-border rounded-xl text-xs space-y-1 font-sans">
                        <span className="font-bold text-app-primary font-mono block flex items-center gap-1.5">
                          <Store size={14} className="text-app-muted" />
                          <span>Пункт самовывоза заведения:</span>
                        </span>
                        <p className="text-app-secondary">
                          {shop.address || "Адрес заведения уточняется"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-app-muted flex items-center gap-1">
                            <Hash size={12} className="text-app-muted" />
                            <span>№ стола / места</span>
                          </label>
                          <input 
                            type="text" 
                            maxLength={30}
                            value={formData.tableNumber} 
                            onChange={e => setFormData(p => ({ ...p, tableNumber: e.target.value }))} 
                            placeholder="Если заказ в зале" 
                            className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border/80 transition-colors" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-app-muted flex items-center gap-1">
                            <Clock size={12} className="text-app-muted" />
                            <span>Время готовности</span>
                          </label>
                          <input 
                            type="text" 
                            maxLength={30}
                            value={formData.preferredTime} 
                            onChange={e => setFormData(p => ({ ...p, preferredTime: e.target.value }))} 
                            placeholder="К какому времени" 
                            className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border/80 transition-colors" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CUSTOMER CONTACT FIELDS */}
                  <div className="space-y-3 p-3.5 bg-app-card/50 border border-app-border rounded-2xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-app-primary font-mono">
                      <User size={14} className="text-app-muted" />
                      <span>{fulfillmentMethod === "shipping" ? "Данные получателя (по паспорту)" : "Контактные данные"}</span>
                    </div>

                    {/* Customer Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-app-muted flex items-center gap-1">
                        <User size={12} className="text-app-muted" />
                        <span>{fulfillmentMethod === "shipping" ? "ФИО получателя полностью" : "Ваше имя"}</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input 
                        type="text" 
                        maxLength={60}
                        value={formData.name} 
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} 
                        placeholder={fulfillmentMethod === "shipping" ? "Иванов Иван Иванович" : "Как к вам обращаться"} 
                        className={`w-full bg-app-input border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none transition-colors font-sans ${
                          formErrors.name
                            ? "border-rose-500/60 ring-1 ring-rose-500/20 bg-rose-500/5"
                            : "border-app-border focus:border-app-border/80"
                        }`} 
                      />
                      {formErrors.name && (
                        <p className="text-[11px] text-rose-400 mt-1 font-mono flex items-center gap-1">
                          <AlertCircle size={12} />
                          <span>{formErrors.name}</span>
                        </p>
                      )}
                    </div>

                    {/* Customer Phone with live CIS mask */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-app-muted flex items-center gap-1">
                        <Phone size={12} className="text-app-muted" />
                        <span>Номер телефона</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input 
                        type="tel" 
                        maxLength={22}
                        value={formData.phone} 
                        onChange={handlePhoneChange} 
                        placeholder="+7 (999) 000-00-00" 
                        className={`w-full bg-app-input border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none transition-colors font-mono ${
                          formErrors.phone
                            ? "border-rose-500/60 ring-1 ring-rose-500/20 bg-rose-500/5"
                            : "border-app-border focus:border-app-border/80"
                        }`} 
                      />
                      {formErrors.phone && (
                        <p className="text-[11px] text-rose-400 mt-1 font-mono flex items-center gap-1">
                          <AlertCircle size={12} />
                          <span>{formErrors.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Note */}
                  <div className="space-y-1 p-3.5 bg-app-card/50 border border-app-border rounded-2xl">
                    <label className="text-[11px] font-mono text-app-muted flex items-center gap-1">
                      <FileText size={12} className="text-app-muted" />
                      <span>Комментарий к заказу</span>
                    </label>
                    <div className="relative">
                      <textarea 
                        rows={2} 
                        maxLength={300}
                        value={formData.note} 
                        onChange={e => setFormData(p => ({ ...p, note: e.target.value }))} 
                        placeholder="Пожелания к заказу, код домофона, ориентир или детали..." 
                        className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border/80 transition-colors resize-none font-sans" 
                      />
                      <span className="absolute bottom-2 right-2 text-[10px] font-mono text-app-muted pointer-events-none">
                        {formData.note.length}/300
                      </span>
                    </div>
                  </div>
                </form>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-t border-app-border bg-app-bg pb-safe space-y-2.5 shrink-0">
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

              {onOpenPrivacy && (
                <p className="text-[10px] text-app-muted text-center font-mono leading-tight">
                  Оформляя заказ, вы соглашаетесь с{" "}
                  <button
                    type="button"
                    onClick={onOpenPrivacy}
                    className="underline hover:text-app-primary text-app-secondary cursor-pointer transition-colors"
                  >
                    Политикой конфиденциальности
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
