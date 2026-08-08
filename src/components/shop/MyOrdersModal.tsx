import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Order } from "../../types";

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
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-md z-50" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed inset-y-0 right-0 w-full max-w-md bg-app-modal border-l border-app-border z-50 flex flex-col shadow-2xl text-app-primary font-sans">
        <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header">
          <h2 className="text-sm font-semibold tracking-tight text-app-primary">История заказов</h2>
          <button onClick={onClose} className="text-app-muted hover:text-app-primary transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {myOrdersLoading ? (
            <p className="text-app-muted text-xs font-mono text-center py-10">Загрузка заказов...</p>
          ) : myOrders.length === 0 ? (
            <p className="text-app-muted text-xs font-mono text-center py-10">История заказов пуста.</p>
          ) : (
            myOrders.map(order => (
              <div key={order.id} className="p-4 border border-app-border rounded-2xl bg-app-card space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-app-muted">#{order.id.slice(-6)}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                    order.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30' :
                    order.status === 'CONFIRMED' ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30' :
                    order.status === 'IN_PROGRESS' ? 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30' :
                    order.status === 'CANCELLED' ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30' :
                    'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                  }`}>
                    {order.status === 'COMPLETED' ? 'ЗАВЕРШЁН' :
                     order.status === 'CONFIRMED' ? 'ПОДТВЕРЖДЁН' :
                     order.status === 'IN_PROGRESS' ? 'В РАБОТЕ' :
                     order.status === 'CANCELLED' ? 'ОТМЕНЁН' : 'В ОЖИДАНИИ'}
                  </span>
                </div>
                <div className="text-base font-bold font-mono text-app-primary">{order.totalPrice} ₽</div>
                <button onClick={() => onReorder(order)} className="w-full py-2 bg-app-secondary hover:bg-app-hover rounded-xl text-xs font-mono text-app-primary transition-colors">
                  Повторить заказ
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
