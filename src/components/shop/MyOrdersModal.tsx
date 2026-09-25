import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Clock, Hash, MapPin, FileText, ShoppingBag, Truck, Store, Package, Globe } from "lucide-react";
import { Order, OrderItem } from "../../types";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useLanguage } from "../../context/LanguageContext";

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  myOrders: Order[];
  myOrdersLoading: boolean;
  onReorder: (order: Order) => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({
  isOpen,
  onClose,
  myOrders,
  myOrdersLoading,
  onReorder,
}) => {
  const { t } = useLanguage();
  useScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div key="my-orders-modal-container" className="fixed inset-0 z-[9999]">
          <motion.div 
            key="my-orders-backdrop" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.12 }}
            onClick={onClose} 
            className="fixed inset-0 bg-black/70" 
          />
          <motion.div 
            key="my-orders-panel" 
            initial={{ x: "100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "100%" }} 
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }} 
            className="fixed inset-y-0 right-0 w-full max-w-md bg-app-modal border-l border-app-border z-[10000] flex flex-col shadow-2xl text-app-primary font-sans fast-panel-slide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-app-muted" />
                <h2 className="text-sm font-semibold tracking-tight text-app-primary">{t("orders.history_title", "История ваших заказов")}</h2>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="text-app-muted hover:text-app-primary transition-colors p-1.5 rounded-lg hover:bg-app-hover cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {myOrdersLoading ? (
                <div className="text-center py-16">
                  <p className="text-app-muted text-xs font-mono">{t("orders.loading", "Загрузка заказов...")}</p>
                </div>
              ) : myOrders.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-app-border rounded-2xl p-6">
                  <ShoppingBag size={28} className="mx-auto text-app-muted mb-2" />
                  <p className="text-app-muted text-xs font-mono">{t("orders.empty", "История заказов пуста.")}</p>
                </div>
              ) : (
                myOrders.map(order => {
                  let items: OrderItem[] = [];
                  try {
                    items = JSON.parse(order.items);
                    if (!Array.isArray(items)) items = [];
                  } catch {
                    items = [];
                  }

                  const method = order.fulfillmentMethod || (order.deliveryAddress ? "courier" : "pickup");

                  return (
                    <div key={order.id} className="p-4 border border-app-border rounded-2xl bg-app-card space-y-3 shadow-xs">
                      {/* Header */}
                      <div className="flex justify-between items-center text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-app-primary font-bold">#{order.id.slice(-6)}</span>
                          <span className="text-[10px] text-app-muted">
                            {new Date(order.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border ${
                          order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                          order.status === 'CONFIRMED' || order.status === 'IN_PROGRESS' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                          order.status === 'CANCELLED' ? 'bg-app-card text-app-muted border-app-border line-through' :
                          'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {order.status === 'COMPLETED' ? t("tracker.status_completed", "ЗАВЕРШЁН") :
                           order.status === 'CONFIRMED' || order.status === 'IN_PROGRESS' ? t("tracker.status_cooking", "В РАБОТЕ") :
                           order.status === 'CANCELLED' ? t("tracker.status_cancelled", "ОТМЕНЁН") : t("tracker.status_created", "В ОЖИДАНИИ")}
                        </span>
                      </div>

                      {/* Fulfillment & Details */}
                      <div className="space-y-1 text-xs font-mono pt-1 border-t border-app-border/40">
                        {/* Method */}
                        <div className="flex items-center gap-1.5 text-app-secondary text-[11px]">
                          {method === "courier" ? (
                            <Truck size={12} className="text-app-muted" />
                          ) : method === "shipping" ? (
                            <Package size={12} className="text-app-muted" />
                          ) : method === "online" ? (
                            <Globe size={12} className="text-app-muted" />
                          ) : (
                            <Store size={12} className="text-app-muted" />
                          )}
                          <span>
                            {method === "courier" ? t("checkout.courier", "Курьер") : method === "shipping" ? t("checkout.shipping", "Почта / СДЭК") : method === "online" ? t("checkout.online", "Онлайн") : t("orders.pickup_in_hall", "Самовывоз / В зале")}
                          </span>
                        </div>

                        {/* Preferred / Ready Time */}
                        {order.preferredTime && (
                          <div className="flex items-center gap-1.5 text-amber-500 text-[11px] font-semibold">
                            <Clock size={12} />
                            <span>{t("orders.time", "Время")}: {order.preferredTime}</span>
                          </div>
                        )}

                        {/* Table Number */}
                        {order.tableNumber && (
                          <div className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-semibold">
                            <Hash size={12} />
                            <span>{t("orders.table", "Столик")}: № {order.tableNumber}</span>
                          </div>
                        )}

                        {/* Delivery Address */}
                        {order.deliveryAddress && (
                          <div className="flex items-start gap-1.5 text-app-secondary text-[11px]">
                            <MapPin size={12} className="text-app-muted shrink-0 mt-0.5" />
                            <span className="leading-snug">{order.deliveryAddress}</span>
                          </div>
                        )}

                        {/* Note */}
                        {order.note && (
                          <div className="flex items-start gap-1.5 text-app-muted text-[11px] italic">
                            <FileText size={12} className="text-app-muted shrink-0 mt-0.5" />
                            <span>«{order.note}»</span>
                          </div>
                        )}
                      </div>

                      {/* Items List */}
                      {items.length > 0 && (
                        <div className="py-1.5 border-t border-app-border/40 space-y-1 text-xs font-sans">
                          {items.map((item, i) => (
                            <div key={i} className="flex justify-between text-app-secondary">
                              <span>
                                {item.title} <span className="font-mono text-app-primary font-bold">×{item.quantity}</span>
                              </span>
                              <span className="font-mono font-semibold">{item.price * item.quantity} ₽</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Total & Reorder */}
                      <div className="pt-2 border-t border-app-border/60 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-app-muted font-mono block">{t("orders.total", "Итого:")}</span>
                          <span className="text-base font-bold font-mono text-app-primary">{order.totalPrice} ₽</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => onReorder(order)} 
                          className="px-4 py-2 bg-app-secondary hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary font-semibold transition-colors cursor-pointer active:scale-95"
                        >
                          {t("orders.reorder", "Повторить заказ")}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
