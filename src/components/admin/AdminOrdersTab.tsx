import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  X,
  ShoppingBag,
  Download,
  MapPin,
  Truck,
  Phone,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Store,
  Globe,
  ChevronDown,
  Check,
  Filter,
} from "lucide-react";
import { SpinnerLoader } from "../Skeleton";

interface OrderItem {
  title: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: "NEW" | "PENDING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  fulfillmentMethod?: string;
  comment?: string;
  items: string;
}

interface AdminOrdersTabProps {
  orders: Order[];
  selectedShop: any;
  orderFilter: string;
  setOrderFilter: (filter: any) => void;
  orderSearchQuery: string;
  setOrderSearchQuery: (query: string) => void;
  orderTypeFilter?: string;
  setOrderTypeFilter?: (filter: string) => void;
  ordersLoading: boolean;
  handleStatusChange: (id: string, status: string) => void;
  fetchOrders?: () => void;
}

const ORDER_TYPE_OPTIONS = [
  { value: "ALL", label: "Все виды", icon: Filter },
  { value: "courier", label: "Курьер", icon: Truck },
  { value: "pickup", label: "Самовывоз", icon: Store },
  { value: "online", label: "Онлайн-услуги", icon: Globe },
];

function CustomOrderTypeDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = ORDER_TYPE_OPTIONS.find((opt) => opt.value === value) || ORDER_TYPE_OPTIONS[0];
  const SelectedIcon = selectedOption.icon;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary flex items-center gap-2 transition-all cursor-pointer shadow-sm focus:outline-none"
      >
        <SelectedIcon size={13} className="text-app-muted shrink-0" />
        <span className="font-semibold">{selectedOption.label}</span>
        <ChevronDown size={13} className={`text-app-muted transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-app-card border border-app-border shadow-xl py-1 z-50 text-xs font-mono">
          {ORDER_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-app-surface text-app-primary font-semibold"
                    : "text-app-secondary hover:bg-app-hover hover:text-app-primary"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={13} className={isSelected ? "text-app-primary" : "text-app-muted"} />
                  <span>{option.label}</span>
                </div>
                {isSelected && <Check size={13} className="text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders,
  orderFilter,
  setOrderFilter,
  orderSearchQuery,
  setOrderSearchQuery,
  orderTypeFilter = "ALL",
  setOrderTypeFilter,
  ordersLoading,
  handleStatusChange,
}) => {
  // Export Orders CSV helper
  const handleExportCSV = () => {
    if (!orders || orders.length === 0) return;

    const headers = [
      "ID Заказа",
      "Дата",
      "Статус",
      "Клиент",
      "Телефон",
      "Способ получения",
      "Адрес доставки",
      "Сумма (₽)",
      "Товары",
    ];

    const rows = orders.map((o) => {
      let itemsStr = "";
      try {
        const parsed = JSON.parse(o.items);
        itemsStr = parsed.map((i: any) => `${i.title} x${i.quantity}`).join("; ");
      } catch {
        itemsStr = o.items || "";
      }

      return [
        o.id,
        new Date(o.createdAt).toLocaleString("ru-RU"),
        o.status,
        `"${(o.customerName || "").replace(/"/g, '""')}"`,
        `"${(o.customerPhone || "").replace(/"/g, '""')}"`,
        o.fulfillmentMethod || "courier",
        `"${(o.deliveryAddress || "").replace(/"/g, '""')}"`,
        o.totalAmount,
        `"${itemsStr.replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Filter bar */}
      <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm font-mono text-xs">
        {/* Status filters */}
        <div className="flex items-center gap-1 bg-app-card border border-app-border p-1 rounded-xl overflow-x-auto scrollbar-none">
          {[
            { id: "ALL", label: "Все" },
            { id: "NEW", label: "Новые" },
            { id: "PENDING", label: "В работе" },
            { id: "COMPLETED", label: "Выполнен" },
            { id: "CANCELLED", label: "Отменен" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setOrderFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                orderFilter === f.id
                  ? "bg-app-accent text-app-accent-fg font-bold shadow-sm"
                  : "text-app-muted hover:text-app-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="search"
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              placeholder="Поиск по ID, клиенту, телефону..."
              className="w-full bg-app-card border border-app-border rounded-xl pl-8 pr-7 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-accent search-input"
            />
            {orderSearchQuery && (
              <button
                onClick={() => setOrderSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Fulfillment type filter */}
          {setOrderTypeFilter && (
            <CustomOrderTypeDropdown
              value={orderTypeFilter}
              onChange={(val) => setOrderTypeFilter(val)}
            />
          )}

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-emerald-400 font-mono text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-40"
            title="Экспорт списка заказов в CSV файл"
          >
            <Download size={13} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Orders List */}
      {ordersLoading ? (
        <div className="py-16 text-center bg-app-surface border border-app-border rounded-2xl p-6">
          <SpinnerLoader size={24} className="mx-auto text-app-accent" />
          <p className="text-xs text-app-muted font-mono mt-2">Загрузка заказов...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <ShoppingBag size={28} className="mx-auto text-app-muted mb-2" />
          <p className="text-xs text-app-muted font-mono">Заказы пока не поступали.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            let parsedItems: OrderItem[] = [];
            try {
              parsedItems = JSON.parse(order.items);
            } catch {
              parsedItems = [];
            }

            return (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-4 shadow-sm"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-app-border pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-app-primary">
                        Заказ #{order.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          order.status === "NEW"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : order.status === "PENDING"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : order.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {order.status === "NEW"
                          ? "Новый"
                          : order.status === "PENDING"
                          ? "В работе"
                          : order.status === "COMPLETED"
                          ? "Выполнен"
                          : "Отменен"}
                      </span>
                      {(() => {
                        const method = order.fulfillmentMethod || (order.deliveryAddress ? "courier" : "pickup");
                        return (
                          <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-muted font-mono text-[10px] rounded-md flex items-center gap-1">
                            {method === "pickup" ? (
                              <>
                                <Store size={10} className="text-indigo-400" />
                                <span>Самовывоз</span>
                              </>
                            ) : method === "online" ? (
                              <>
                                <Globe size={10} className="text-sky-400" />
                                <span>Онлайн-услуги</span>
                              </>
                            ) : (
                              <>
                                <Truck size={10} className="text-emerald-400" />
                                <span>Курьер</span>
                              </>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[11px] text-app-muted font-mono mt-0.5 flex items-center gap-1">
                      <Clock size={11} />
                      <span>{new Date(order.createdAt).toLocaleString("ru-RU")}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-mono font-bold text-base text-emerald-400">
                      {order.totalPrice ?? (order as any).totalAmount ?? 0} ₽
                    </p>
                  </div>
                </div>

                {/* Details Body */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Customer Info */}
                  <div className="space-y-1.5 p-3 bg-app-card/60 border border-app-border rounded-xl">
                    <p className="text-app-muted text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <User size={11} />
                      <span>Информация о клиенте</span>
                    </p>
                    <p className="text-app-primary font-bold">
                      {order.customerName || "Без имени"}
                    </p>
                    {order.customerPhone && (
                      <p className="text-app-secondary flex items-center gap-1">
                        <Phone size={11} className="text-emerald-400" />
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="hover:underline"
                        >
                          {order.customerPhone}
                        </a>
                      </p>
                    )}
                    {order.deliveryAddress && (
                      <p className="text-app-secondary flex items-start gap-1 pt-1 border-t border-app-border/50">
                        <MapPin size={11} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{order.deliveryAddress}</span>
                      </p>
                    )}
                    {order.comment && (
                      <p className="text-amber-400/90 text-[11px] italic pt-1 border-t border-app-border/50 flex items-start gap-1">
                        <FileText size={11} className="shrink-0 mt-0.5" />
                        <span>«{order.comment}»</span>
                      </p>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="space-y-1.5 p-3 bg-app-card/60 border border-app-border rounded-xl">
                    <p className="text-app-muted text-[10px] uppercase font-bold tracking-wider">
                      Состав заказа ({parsedItems.length})
                    </p>
                    <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-none pr-1">
                      {parsedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-app-secondary border-b border-app-border/30 last:border-0 pb-1"
                        >
                          <span>
                            {item.title} <strong className="text-emerald-400">x{item.quantity}</strong>
                          </span>
                          <span className="text-app-primary font-bold">
                            {item.price * item.quantity} ₽
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="pt-3 border-t border-app-border flex items-center justify-between gap-2 flex-wrap font-mono text-xs">
                  <span className="text-[11px] text-app-muted">Изменить статус:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {order.status !== "PENDING" && (
                      <button
                        onClick={() => handleStatusChange(order.id, "PENDING")}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Clock size={12} />
                        <span>В работу</span>
                      </button>
                    )}
                    {order.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleStatusChange(order.id, "COMPLETED")}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 size={12} />
                        <span>Завершить</span>
                      </button>
                    )}
                    {order.status !== "CANCELLED" && (
                      <button
                        onClick={() => handleStatusChange(order.id, "CANCELLED")}
                        className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle size={12} />
                        <span>Отменить</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
