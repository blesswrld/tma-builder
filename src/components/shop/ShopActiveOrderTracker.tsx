import React from "react";
import { Order } from "../../types";

interface ShopActiveOrderTrackerProps {
  activeOrder: Order | null;
  onOpenMyOrders: () => void;
}

export const getOrderStatusInfo = (status: string) => {
  switch (status) {
    case "NEW":
    case "PENDING":
      return {
        label: "В ОЖИДАНИИ",
        textClass: "text-amber-500",
        bgBadge: "from-amber-500/10 via-amber-500/5 to-amber-500/10 border-amber-500/30",
        barColor: "bg-amber-500",
        progressWidth: "w-1/4",
        dotColor: "bg-amber-500",
        dotPing: "bg-amber-400",
        isPulse: true,
      };
    case "CONFIRMED":
      return {
        label: "ПОДТВЕРЖДЁН",
        textClass: "text-blue-400",
        bgBadge: "from-blue-500/10 via-indigo-500/5 to-blue-500/10 border-blue-500/30",
        barColor: "bg-blue-500",
        progressWidth: "w-2/4",
        dotColor: "bg-blue-500",
        dotPing: "bg-blue-400",
        isPulse: true,
      };
    case "IN_PROGRESS":
      return {
        label: "В РАБОТЕ",
        textClass: "text-indigo-400",
        bgBadge: "from-indigo-500/10 via-purple-500/5 to-indigo-500/10 border-indigo-500/30",
        barColor: "bg-indigo-500",
        progressWidth: "w-3/4",
        dotColor: "bg-indigo-500",
        dotPing: "bg-indigo-400",
        isPulse: true,
      };
    case "COMPLETED":
      return {
        label: "ЗАВЕРШЁН",
        textClass: "text-emerald-400",
        bgBadge: "from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 border-emerald-500/30",
        barColor: "bg-emerald-500",
        progressWidth: "w-full",
        dotColor: "bg-emerald-500",
        dotPing: "bg-emerald-400",
        isPulse: false,
      };
    case "CANCELLED":
      return {
        label: "ОТМЕНЁН",
        textClass: "text-rose-400",
        bgBadge: "from-rose-500/10 via-rose-500/5 to-rose-500/10 border-rose-500/30",
        barColor: "bg-rose-500",
        progressWidth: "w-full",
        dotColor: "bg-rose-500",
        dotPing: "bg-rose-400",
        isPulse: false,
      };
    default:
      return {
        label: status ? status.toUpperCase() : "В ОЖИДАНИИ",
        textClass: "text-amber-500",
        bgBadge: "from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border-amber-500/30",
        barColor: "bg-amber-500",
        progressWidth: "w-1/2",
        dotColor: "bg-amber-500",
        dotPing: "bg-amber-400",
        isPulse: true,
      };
  }
};

export const ShopActiveOrderTracker: React.FC<ShopActiveOrderTrackerProps> = ({
  activeOrder,
  onOpenMyOrders,
}) => {
  if (!activeOrder || !activeOrder.id) return null;

  const orderIdShort = (activeOrder.id || "").slice(-6).toUpperCase();
  const info = getOrderStatusInfo(activeOrder.status);

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r ${info.bgBadge} border space-y-3 shadow-sm transition-all duration-300`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {info.isPulse && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${info.dotPing} opacity-75`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${info.dotColor}`}></span>
          </span>
          <span className="text-xs font-bold font-mono text-app-primary">
            Активный заказ #{orderIdShort}
          </span>
        </div>
        <span className={`text-xs font-mono font-bold uppercase tracking-wider ${info.textClass}`}>
          {info.label}
        </span>
      </div>
      <div className="w-full bg-app-card h-1.5 rounded-full overflow-hidden border border-app-border">
        <div 
          className={`h-full ${info.barColor} transition-all duration-500 ${info.progressWidth}`} 
        />
      </div>
      <div className="flex justify-between items-center text-[11px] font-mono text-app-muted">
        <span>Сумма: {activeOrder.totalPrice} ₽</span>
        <button onClick={onOpenMyOrders} className="text-app-primary font-bold underline hover:text-amber-500 transition-colors">
          Детали заказа →
        </button>
      </div>
    </div>
  );
};
