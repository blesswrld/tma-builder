import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  ShoppingBag,
  Download,
  MapPin,
  Truck,
  Package,
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
  Printer,
  Copy,
  Trash2,
  RotateCcw,
  MessageCircle,
  Hash,
  Sparkles,
  Calendar,
  LayoutList,
  Table as TableIcon,
} from "lucide-react";
import { SpinnerLoader } from "../Skeleton";

interface OrderItem {
  id?: string;
  title: string;
  quantity: number;
  price: number;
  note?: string;
}

interface Order {
  id: string;
  shopId?: string;
  status: "NEW" | "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  createdAt: string;
  totalPrice?: number;
  totalAmount?: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string | null;
  tableNumber?: string | null;
  preferredTime?: string | null;
  fulfillmentMethod?: "courier" | "pickup" | "shipping" | "online" | string | null;
  note?: string | null;
  comment?: string | null;
  items: string;
}

interface AdminOrdersTabProps {
  orders: Order[];
  allOrders?: Order[];
  selectedShop: any;
  orderFilter: string;
  setOrderFilter: (filter: any) => void;
  orderSearchQuery: string;
  setOrderSearchQuery: (query: string) => void;
  orderTypeFilter?: string;
  setOrderTypeFilter?: (filter: string) => void;
  ordersLoading: boolean;
  handleStatusChange: (id: string, status: string) => void;
  handleDeleteOrder?: (id: string) => void;
  fetchOrders?: () => void;
}

const ORDER_TYPE_OPTIONS = [
  { value: "ALL", label: "Все виды", icon: Filter },
  { value: "courier", label: "Курьер", icon: Truck },
  { value: "pickup", label: "Самовывоз / Зал", icon: Store },
  { value: "shipping", label: "Почта / СДЭК", icon: Package },
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
        className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary flex items-center gap-2 transition-all cursor-pointer shadow-xs focus:outline-none"
      >
        <SelectedIcon size={13} className="text-app-muted shrink-0" />
        <span className="font-semibold">{selectedOption.label}</span>
        <ChevronDown size={13} className={`text-app-muted transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-app-card border border-app-border shadow-xl py-1 z-50 text-xs font-mono">
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
                {isSelected && <Check size={13} className="text-app-primary shrink-0" />}
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
  allOrders,
  selectedShop,
  orderFilter,
  setOrderFilter,
  orderSearchQuery,
  setOrderSearchQuery,
  orderTypeFilter = "ALL",
  setOrderTypeFilter,
  ordersLoading,
  handleStatusChange,
  handleDeleteOrder,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    return (localStorage.getItem("admin_orders_view_mode") as "cards" | "table") || "cards";
  });
  const [visibleCount, setVisibleCount] = useState<number>(50);

  // Reset pagination on filter / search changes
  useEffect(() => {
    setVisibleCount(50);
  }, [orderFilter, orderTypeFilter, orderSearchQuery]);

  const handleViewModeChange = (mode: "cards" | "table") => {
    setViewMode(mode);
    localStorage.setItem("admin_orders_view_mode", mode);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Export Orders CSV with all comprehensive fields
  const handleExportCSV = () => {
    const listToExport = allOrders && allOrders.length > 0 ? allOrders : orders;
    if (!listToExport || listToExport.length === 0) return;

    const headers = [
      "ID Заказа",
      "Дата и время",
      "Статус",
      "Клиент",
      "Телефон",
      "Способ получения",
      "Номер стола / Зал",
      "Время готовности / Доставки",
      "Адрес доставки / ПВЗ",
      "Комментарий клиента",
      "Состав заказа",
      "Итоговая сумма (₽)",
    ];

    const rows = listToExport.map((o) => {
      let itemsStr = "";
      try {
        const parsed = JSON.parse(o.items);
        if (Array.isArray(parsed)) {
          itemsStr = parsed.map((i: any) => `${i.title} (x${i.quantity})${i.note ? ` [${i.note}]` : ''}`).join("; ");
        } else {
          itemsStr = o.items || "";
        }
      } catch {
        itemsStr = o.items || "";
      }

      const method = o.fulfillmentMethod || (o.deliveryAddress ? "courier" : "pickup");
      const methodLabel = method === "courier" ? "Курьер" : method === "shipping" ? "Почта / СДЭК" : method === "online" ? "Онлайн" : "Самовывоз / В зале";
      const totalSum = o.totalPrice ?? o.totalAmount ?? 0;

      return [
        o.id,
        new Date(o.createdAt).toLocaleString("ru-RU"),
        o.status,
        `"${(o.customerName || "").replace(/"/g, '""')}"`,
        `"${(o.customerPhone || "").replace(/"/g, '""')}"`,
        methodLabel,
        `"${(o.tableNumber || "").replace(/"/g, '""')}"`,
        `"${(o.preferredTime || "").replace(/"/g, '""')}"`,
        `"${(o.deliveryAddress || "").replace(/"/g, '""')}"`,
        `"${(o.note || o.comment || "").replace(/"/g, '""')}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        totalSum,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_${selectedShop?.slug || "export"}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick stats calculations based on ALL orders
  const sourceOrders = allOrders !== undefined ? allOrders : orders;
  const totalOrdersCount = sourceOrders.length;
  const pendingCount = sourceOrders.filter(o => o.status === "PENDING" || o.status === "NEW").length;
  const inProgressCount = sourceOrders.filter(o => o.status === "CONFIRMED" || o.status === "IN_PROGRESS").length;
  const completedCount = sourceOrders.filter(o => o.status === "COMPLETED").length;
  const cancelledCount = sourceOrders.filter(o => o.status === "CANCELLED").length;
  const totalRevenue = sourceOrders
    .filter(o => o.status === "COMPLETED")
    .reduce((acc, o) => acc + (Number(o.totalPrice ?? o.totalAmount) || 0), 0);

  const displayedOrders = orders.slice(0, visibleCount);
  const hasMore = orders.length > visibleCount;

  const renderStatusBadge = (status: string) => {
    const isPending = status === "PENDING" || status === "NEW";
    const isConfirmed = status === "CONFIRMED" || status === "IN_PROGRESS";
    const isCompleted = status === "COMPLETED";
    const isCancelled = status === "CANCELLED";

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border whitespace-nowrap transition-colors ${
          isPending
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
            : isConfirmed
            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-semibold"
            : isCompleted
            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            : "bg-app-card text-app-muted border-app-border line-through opacity-70"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isPending
              ? "bg-amber-500 animate-pulse"
              : isConfirmed
              ? "bg-sky-500"
              : isCompleted
              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]"
              : "bg-app-muted"
          }`}
        />
        {isPending
          ? "В ожидании"
          : isConfirmed
          ? "В работе"
          : isCompleted
          ? "Выполнен"
          : "Отменен"}
      </span>
    );
  };

  const renderFulfillmentBadge = (order: Order) => {
    const method = order.fulfillmentMethod || (order.deliveryAddress ? "courier" : "pickup");
    return (
      <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-secondary font-mono text-[10px] rounded-md inline-flex items-center gap-1">
        {method === "pickup" ? (
          <>
            <Store size={11} className="text-app-muted" />
            <span>Самовывоз / В зале</span>
          </>
        ) : method === "shipping" ? (
          <>
            <Package size={11} className="text-app-muted" />
            <span>Почта / СДЭК</span>
          </>
        ) : method === "online" ? (
          <>
            <Globe size={11} className="text-app-muted" />
            <span>Онлайн-услуга</span>
          </>
        ) : (
          <>
            <Truck size={11} className="text-app-muted" />
            <span>Курьер</span>
          </>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Mini Overview Metric Chips - Clean Monochrome / Theme Palette */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
          <span className="text-app-muted">Всего заказов:</span>
          <span className="font-bold text-app-primary">{totalOrdersCount}</span>
        </div>
        <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
          <span className="text-app-secondary font-medium">В ожидании:</span>
          <span className="font-bold text-app-primary">{pendingCount}</span>
        </div>
        <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
          <span className="text-app-secondary font-medium">Выполнено:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</span>
        </div>
        <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
          <span className="text-app-muted">Выручка (вып.):</span>
          <span className="font-bold text-app-primary">{totalRevenue.toLocaleString("ru-RU")} ₽</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs font-mono text-xs">
        {/* Status filters with persistent counts */}
        <div className="flex items-center gap-1 bg-app-card border border-app-border p-1 rounded-xl overflow-x-auto scrollbar-none">
          {[
            { id: "ALL", label: "Все", count: totalOrdersCount },
            { id: "PENDING", label: "В ожидании", count: pendingCount },
            { id: "CONFIRMED", label: "В работе", count: inProgressCount },
            { id: "COMPLETED", label: "Выполнен", count: completedCount },
            { id: "CANCELLED", label: "Отменен", count: cancelledCount },
          ].map((f) => {
            const isCurrent = orderFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setOrderFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isCurrent
                    ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                    : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isCurrent
                      ? "bg-app-accent-fg/20 text-app-accent-fg"
                      : "bg-app-surface border border-app-border text-app-muted"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-1 md:max-w-xl justify-end">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="search"
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              placeholder="Поиск (клиент, стол, адрес, тел.)..."
              className="w-full bg-app-card border border-app-border rounded-xl pl-8 pr-7 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-accent search-input font-sans"
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

          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center bg-app-card border border-app-border p-0.5 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => handleViewModeChange("cards")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                viewMode === "cards"
                  ? "bg-app-surface text-app-primary font-bold shadow-xs"
                  : "text-app-muted hover:text-app-primary hover:bg-app-hover"
              }`}
              title="Вид: Список карточек"
            >
              <LayoutList size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("table")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                viewMode === "table"
                  ? "bg-app-surface text-app-primary font-bold shadow-xs"
                  : "text-app-muted hover:text-app-primary hover:bg-app-hover"
              }`}
              title="Вид: Таблица"
            >
              <TableIcon size={14} />
            </button>
          </div>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={totalOrdersCount === 0}
            className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-40"
            title="Экспорт списка заказов в CSV файл со всеми полями"
          >
            <Download size={13} className="text-app-muted" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Orders View */}
      {ordersLoading ? (
        <div className="py-16 text-center bg-app-surface border border-app-border rounded-2xl p-6">
          <SpinnerLoader size={24} className="mx-auto text-app-accent" />
          <p className="text-xs text-app-muted font-mono mt-2">Загрузка заказов...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <ShoppingBag size={28} className="mx-auto text-app-muted mb-2" />
          <p className="text-xs text-app-muted font-mono">Заказы не найдены в данной категории.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-app-border bg-app-surface shadow-xs">
            <table className="w-full text-left text-xs font-mono divide-y divide-app-border">
              <thead className="bg-app-card/70 text-app-muted font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">№ и Дата</th>
                  <th className="px-4 py-3">Клиент</th>
                  <th className="px-4 py-3">Получение</th>
                  <th className="px-4 py-3">Состав заказа</th>
                  <th className="px-4 py-3">Сумма</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/50">
                {displayedOrders.map((order) => {
                  let parsedItems: OrderItem[] = [];
                  try {
                    parsedItems = JSON.parse(order.items);
                    if (!Array.isArray(parsedItems)) parsedItems = [];
                  } catch {
                    parsedItems = [];
                  }

                  const totalSum = order.totalPrice ?? order.totalAmount ?? 0;
                  const isPending = order.status === "PENDING" || order.status === "NEW";
                  const isConfirmed = order.status === "CONFIRMED" || order.status === "IN_PROGRESS";
                  const isCompleted = order.status === "COMPLETED";
                  const isCancelled = order.status === "CANCELLED";
                  const rawDigitsPhone = (order.customerPhone || "").replace(/[^0-9]/g, "");

                  return (
                    <tr key={order.id} className="hover:bg-app-card/60 transition-colors">
                      {/* 1. ID & Date */}
                      <td className="px-4 py-3.5 align-top space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-app-primary">
                          <span>#{order.id.slice(-8)}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.id, `tbl-id-${order.id}`)}
                            className="text-app-muted hover:text-app-primary p-0.5 rounded transition-colors cursor-pointer"
                            title="Скопировать полный ID"
                          >
                            {copiedField === `tbl-id-${order.id}` ? (
                              <Check size={11} className="text-app-primary" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-app-muted">
                          {new Date(order.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}{" "}
                          {new Date(order.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>

                      {/* 2. Customer */}
                      <td className="px-4 py-3.5 align-top space-y-1">
                        <p className="font-sans font-bold text-app-primary text-xs">
                          {order.customerName || "Без имени"}
                        </p>
                        {order.customerPhone && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <a
                              href={`tel:${order.customerPhone}`}
                              className="text-app-muted hover:text-app-primary hover:underline"
                            >
                              {order.customerPhone}
                            </a>
                            {rawDigitsPhone && (
                              <a
                                href={`https://wa.me/${rawDigitsPhone.startsWith("8") ? "7" + rawDigitsPhone.slice(1) : rawDigitsPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-0.5 text-app-muted hover:text-emerald-500"
                                title="Написать в WhatsApp"
                              >
                                <MessageCircle size={12} />
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 3. Fulfillment */}
                      <td className="px-4 py-3.5 align-top space-y-1">
                        <div>{renderFulfillmentBadge(order)}</div>
                        {order.tableNumber && (
                          <p className="text-[10px] text-app-primary font-semibold">
                            Стол № {order.tableNumber}
                          </p>
                        )}
                        {order.preferredTime && (
                          <p className="text-[10px] text-app-muted flex items-center gap-1">
                            <Clock size={10} />
                            <span>к {order.preferredTime}</span>
                          </p>
                        )}
                        {order.deliveryAddress && (
                          <p className="text-[10px] text-app-muted font-sans line-clamp-2 max-w-xs">
                            {order.deliveryAddress}
                          </p>
                        )}
                      </td>

                      {/* 4. Items */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-1 max-w-xs">
                          {parsedItems.slice(0, 3).map((it, i) => (
                            <div key={i} className="text-[11px] font-sans flex justify-between gap-2">
                              <span className="text-app-primary line-clamp-1">
                                {it.title} <span className="text-app-muted font-mono">×{it.quantity}</span>
                              </span>
                              <span className="font-mono text-app-secondary shrink-0">{it.price * it.quantity} ₽</span>
                            </div>
                          ))}
                          {parsedItems.length > 3 && (
                            <p className="text-[10px] text-app-muted font-mono">
                              + еще {parsedItems.length - 3} поз.
                            </p>
                          )}
                          {(order.note || order.comment) && (
                            <p className="text-[10px] text-app-muted italic pt-0.5 line-clamp-1">
                              «{order.note || order.comment}»
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 5. Total Price */}
                      <td className="px-4 py-3.5 align-top font-bold text-sm text-app-primary whitespace-nowrap">
                        {totalSum.toLocaleString("ru-RU")} ₽
                      </td>

                      {/* 6. Status Badge */}
                      <td className="px-4 py-3.5 align-top">
                        {renderStatusBadge(order.status)}
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(order)}
                            className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-lg transition-colors cursor-pointer"
                            title="Печать чека"
                          >
                            <Printer size={13} />
                          </button>

                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "CONFIRMED")}
                              className="px-2 py-1 bg-app-card hover:bg-app-hover border border-app-border text-app-primary text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              В работу
                            </button>
                          )}

                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "COMPLETED")}
                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer shadow-2xs"
                            >
                              Завершить
                            </button>
                          )}

                          {!isCancelled && !isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "CANCELLED")}
                              className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Отменить заказ"
                            >
                              <XCircle size={13} />
                            </button>
                          )}

                          {(isCompleted || isCancelled) && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "PENDING")}
                              className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary rounded-lg transition-colors cursor-pointer"
                              title="Вернуть в ожидание"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}

                          {handleDeleteOrder && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1.5 text-app-muted hover:text-rose-500 hover:bg-app-hover rounded-lg transition-colors cursor-pointer"
                              title="Удалить заказ"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (Table View) */}
          {hasMore && (
            <div className="p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs font-mono text-xs">
              <div className="flex items-center gap-3 text-app-muted">
                <span>
                  Показано <span className="font-bold text-app-primary">{Math.min(visibleCount, orders.length)}</span> из{" "}
                  <span className="font-bold text-app-primary">{orders.length}</span> заказов
                </span>
                <div className="w-24 h-1.5 bg-app-card border border-app-border rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="h-full bg-app-accent rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((visibleCount / orders.length) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 50)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <ChevronDown size={14} className="text-app-muted" />
                  <span>Загрузить еще (+50)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(orders.length)}
                  className="px-3 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary rounded-xl transition-all cursor-pointer text-[11px]"
                >
                  Показать все
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="space-y-3.5">
          {displayedOrders.map((order, idx) => {
            let parsedItems: OrderItem[] = [];
            try {
              parsedItems = JSON.parse(order.items);
              if (!Array.isArray(parsedItems)) parsedItems = [];
            } catch {
              parsedItems = [];
            }

            const totalSum = order.totalPrice ?? order.totalAmount ?? 0;
            const isPending = order.status === "PENDING" || order.status === "NEW";
            const isConfirmed = order.status === "CONFIRMED" || order.status === "IN_PROGRESS";
            const isCompleted = order.status === "COMPLETED";
            const isCancelled = order.status === "CANCELLED";

            const rawDigitsPhone = (order.customerPhone || "").replace(/[^0-9]/g, "");

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                className="p-5 rounded-2xl bg-app-surface border border-app-border hover:border-app-border/80 transition-all shadow-xs space-y-4"
              >
                {/* Header Row: ID, Status, Method, Date, Price */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border/70 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-app-primary flex items-center gap-1.5">
                        <span>Заказ #{order.id.slice(-8)}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(order.id, `id-${order.id}`)}
                          className="text-app-muted hover:text-app-primary p-0.5 rounded transition-colors cursor-pointer"
                          title="Скопировать полный ID заказа"
                        >
                          {copiedField === `id-${order.id}` ? (
                            <Check size={12} className="text-app-primary" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </span>

                      {/* Status badge - Bright vivid green for completed */}
                      {renderStatusBadge(order.status)}

                      {/* Fulfillment Method Tag */}
                      {renderFulfillmentBadge(order)}
                    </div>

                    {/* Date & Time */}
                    <p className="text-[11px] text-app-muted font-mono flex items-center gap-1.5">
                      <Calendar size={11} className="text-app-muted" />
                      <span>{new Date(order.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                  </div>

                  {/* Total Sum */}
                  <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between">
                    <span className="text-[10px] font-mono uppercase text-app-muted tracking-wider sm:block hidden">
                      Итого к оплате
                    </span>
                    <p className="font-mono font-bold text-lg text-app-primary">
                      {totalSum.toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </div>

                {/* Main Information Grid - Strict Clean Palette */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs font-mono">
                  {/* Card 1: Customer Contact Info */}
                  <div className="p-3.5 bg-app-card/60 border border-app-border rounded-xl space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <p className="text-app-muted text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                        <User size={11} className="text-app-muted" />
                        <span>Данные заказчика</span>
                      </p>
                      <p className="text-app-primary font-bold text-sm font-sans">
                        {order.customerName || "Без имени"}
                      </p>
                      {order.customerPhone && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="text-app-primary font-mono text-xs hover:underline flex items-center gap-1"
                          >
                            <Phone size={11} className="text-app-muted" />
                            <span>{order.customerPhone}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.customerPhone || "", `phone-${order.id}`)}
                            className="text-app-muted hover:text-app-primary p-0.5 rounded cursor-pointer transition-colors"
                            title="Скопировать номер"
                          >
                            {copiedField === `phone-${order.id}` ? (
                              <Check size={11} className="text-app-primary" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick WhatsApp Link - Subtle theme styling */}
                    {rawDigitsPhone && (
                      <div className="pt-2 border-t border-app-border/40 flex items-center gap-2">
                        <a
                          href={`https://wa.me/${rawDigitsPhone.startsWith("8") ? "7" + rawDigitsPhone.slice(1) : rawDigitsPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-app-surface hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary text-[10px] font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <MessageCircle size={11} className="text-app-muted" />
                          <span>Написать в WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Parameters Filled by Customer (READY TIME, TABLE #, ADDRESS, COMMENT) */}
                  <div className="p-3.5 bg-app-card/60 border border-app-border rounded-xl space-y-2.5">
                    <p className="text-app-muted text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Sparkles size={11} className="text-app-muted" />
                      <span>Параметры выполнения</span>
                    </p>

                    {/* PREFERRED / READY TIME */}
                    {order.preferredTime ? (
                      <div className="p-2.5 bg-app-surface border border-app-border rounded-lg space-y-0.5">
                        <span className="text-[10px] text-app-muted font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock size={11} className="text-app-muted" />
                          <span>Время готовности / доставки:</span>
                        </span>
                        <p className="text-xs font-semibold text-app-primary font-sans">
                          {order.preferredTime}
                        </p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-app-muted flex items-center gap-1 py-1">
                        <Clock size={11} />
                        <span>Время: Как можно скорее</span>
                      </div>
                    )}

                    {/* TABLE / SEAT NUMBER */}
                    {order.tableNumber && (
                      <div className="p-2.5 bg-app-surface border border-app-border rounded-lg space-y-0.5">
                        <span className="text-[10px] text-app-muted font-bold uppercase tracking-wider flex items-center gap-1">
                          <Hash size={11} className="text-app-muted" />
                          <span>Номер стола / Зал:</span>
                        </span>
                        <p className="text-xs font-semibold text-app-primary font-sans">
                          Столик № {order.tableNumber}
                        </p>
                      </div>
                    )}

                    {/* DELIVERY ADDRESS / CDEK POINT */}
                    {order.deliveryAddress && (
                      <div className="p-2.5 bg-app-surface border border-app-border rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-app-muted font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-app-muted" />
                            <span>Адрес / ПВЗ:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.deliveryAddress || "", `addr-${order.id}`)}
                            className="text-app-muted hover:text-app-primary p-0.5 rounded cursor-pointer transition-colors"
                            title="Скопировать адрес"
                          >
                            {copiedField === `addr-${order.id}` ? (
                              <Check size={11} className="text-app-primary" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-app-primary font-sans leading-relaxed">
                          {order.deliveryAddress}
                        </p>
                      </div>
                    )}

                    {/* CUSTOMER ORDER NOTE / COMMENT */}
                    {(order.note || order.comment) && (
                      <div className="p-2.5 bg-app-surface border border-app-border rounded-lg space-y-0.5">
                        <span className="text-[10px] text-app-muted font-bold uppercase tracking-wider flex items-center gap-1">
                          <FileText size={11} className="text-app-muted" />
                          <span>Пожелания к заказу:</span>
                        </span>
                        <p className="text-[11px] text-app-secondary font-sans italic">
                          «{order.note || order.comment}»
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Items in Order */}
                  <div className="p-3.5 bg-app-card/60 border border-app-border rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-app-muted text-[10px] uppercase font-bold tracking-wider pb-1.5 border-b border-app-border/40">
                        <span>Состав заказа</span>
                        <span>{parsedItems.length} поз.</span>
                      </div>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-none pr-1 mt-2">
                        {parsedItems.map((item, iIdx) => (
                          <div
                            key={iIdx}
                            className="border-b border-app-border/30 last:border-0 pb-1.5 text-xs space-y-0.5"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-app-primary font-sans font-medium leading-tight">
                                {item.title}{" "}
                                <span className="font-mono text-app-muted font-semibold">
                                  × {item.quantity}
                                </span>
                              </span>
                              <span className="font-mono font-bold text-app-primary shrink-0">
                                {item.price * item.quantity} ₽
                              </span>
                            </div>
                            {item.note && (
                              <p className="text-[10px] text-app-muted font-sans italic pl-1 border-l border-app-border">
                                Примечание: {item.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-app-border/40 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-app-muted">Сумма позиций:</span>
                      <span className="text-app-primary font-mono">{totalSum} ₽</span>
                    </div>
                  </div>
                </div>

                {/* Status Action & Print Toolbar */}
                <div className="pt-3 border-t border-app-border/70 flex items-center justify-between gap-2 flex-wrap font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    {/* Print Slip Button */}
                    <button
                      type="button"
                      onClick={() => setReceiptOrder(order)}
                      className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Печать товарного чека / талона заказа"
                    >
                      <Printer size={12} className="text-app-muted" />
                      <span>Печать чека</span>
                    </button>

                    {/* Delete Order Button */}
                    {handleDeleteOrder && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-xl transition-colors cursor-pointer"
                        title="Удалить заказ"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Status Change Workflow Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, "CONFIRMED")}
                        className="px-3.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                      >
                        <Clock size={12} className="text-app-muted" />
                        <span>В работу</span>
                      </button>
                    )}

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, "COMPLETED")}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
                      >
                        <CheckCircle2 size={13} />
                        <span>Завершить заказ</span>
                      </button>
                    )}

                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, "CANCELLED")}
                        className="px-3.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary font-medium rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                      >
                        <XCircle size={12} />
                        <span>Отменить</span>
                      </button>
                    )}

                    {(isCompleted || isCancelled) && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, "PENDING")}
                        className="px-3.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary font-medium rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                        title="Вернуть заказ в статус ожидания"
                      >
                        <RotateCcw size={12} className="text-app-muted" />
                        <span>Вернуть в ожидание</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Pagination Controls (Cards View) */}
          {hasMore && (
            <div className="p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs font-mono text-xs">
              <div className="flex items-center gap-3 text-app-muted">
                <span>
                  Показано <span className="font-bold text-app-primary">{Math.min(visibleCount, orders.length)}</span> из{" "}
                  <span className="font-bold text-app-primary">{orders.length}</span> заказов
                </span>
                <div className="w-24 h-1.5 bg-app-card border border-app-border rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="h-full bg-app-accent rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((visibleCount / orders.length) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 50)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <ChevronDown size={14} className="text-app-muted" />
                  <span>Загрузить еще (+50)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(orders.length)}
                  className="px-3 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary rounded-xl transition-all cursor-pointer text-[11px]"
                >
                  Показать все
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRINT RECEIPT / KITCHEN TICKET MODAL */}
      <AnimatePresence>
        {receiptOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReceiptOrder(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="relative w-full max-w-md bg-white text-black p-6 rounded-2xl shadow-2xl z-50 font-mono space-y-4 print:shadow-none print:border-0"
            >
              {/* Receipt Header */}
              <div className="text-center border-b border-dashed border-gray-400 pb-3 space-y-1">
                <h3 className="font-bold text-base uppercase tracking-wider">
                  {selectedShop?.name || "Товарный чек"}
                </h3>
                <p className="text-xs text-gray-600">
                  {selectedShop?.address || "Заказ клиента"}
                </p>
                {selectedShop?.phone && (
                  <p className="text-xs text-gray-600">Тел: {selectedShop.phone}</p>
                )}
                <div className="text-[11px] text-gray-500 pt-1">
                  Заказ #{receiptOrder.id.slice(-8)} • {new Date(receiptOrder.createdAt).toLocaleString("ru-RU")}
                </div>
              </div>

              {/* Customer & Parameters Details */}
              <div className="space-y-1.5 text-xs border-b border-dashed border-gray-400 pb-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Клиент:</span>
                  <span className="font-bold">{receiptOrder.customerName || "—"}</span>
                </div>
                {receiptOrder.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Телефон:</span>
                    <span className="font-bold">{receiptOrder.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Способ:</span>
                  <span className="font-bold">
                    {receiptOrder.fulfillmentMethod === "courier"
                      ? "Курьер"
                      : receiptOrder.fulfillmentMethod === "shipping"
                      ? "Почта / СДЭК"
                      : receiptOrder.fulfillmentMethod === "online"
                      ? "Онлайн"
                      : "Самовывоз / В зале"}
                  </span>
                </div>
                {receiptOrder.tableNumber && (
                  <div className="flex justify-between bg-gray-100 p-1.5 rounded font-bold">
                    <span>🪑 Столик в зале:</span>
                    <span>№ {receiptOrder.tableNumber}</span>
                  </div>
                )}
                {receiptOrder.preferredTime && (
                  <div className="flex justify-between bg-gray-100 p-1.5 rounded font-bold">
                    <span>⏰ Время готовности:</span>
                    <span>{receiptOrder.preferredTime}</span>
                  </div>
                )}
                {receiptOrder.deliveryAddress && (
                  <div className="pt-1">
                    <span className="text-gray-600 block text-[10px]">Адрес доставки / ПВЗ:</span>
                    <span className="font-bold">{receiptOrder.deliveryAddress}</span>
                  </div>
                )}
                {(receiptOrder.note || receiptOrder.comment) && (
                  <div className="pt-1 bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="text-gray-600 block text-[10px]">Комментарий заказчика:</span>
                    <span className="italic">{receiptOrder.note || receiptOrder.comment}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2 border-b border-dashed border-gray-400 pb-3 text-xs">
                <div className="flex justify-between font-bold text-[10px] uppercase text-gray-500">
                  <span>Наименование</span>
                  <span>Сумма</span>
                </div>
                {(() => {
                  try {
                    const items = JSON.parse(receiptOrder.items);
                    return Array.isArray(items) ? (
                      items.map((it: any, i: number) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex justify-between">
                            <span>
                              {it.title} × {it.quantity}
                            </span>
                            <span className="font-bold">{it.price * it.quantity} ₽</span>
                          </div>
                          {it.note && (
                            <p className="text-[10px] text-gray-500 italic pl-2">
                              • {it.note}
                            </p>
                          )}
                        </div>
                      ))
                    ) : null;
                  } catch {
                    return <p>{receiptOrder.items}</p>;
                  }
                })()}
              </div>

              {/* Receipt Total */}
              <div className="flex justify-between items-center text-sm font-bold pt-1">
                <span>ИТОГО К ОПЛАТЕ:</span>
                <span className="text-base">
                  {(receiptOrder.totalPrice ?? receiptOrder.totalAmount ?? 0).toLocaleString("ru-RU")} ₽
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 print:hidden">
                <button
                  type="button"
                  onClick={() => setReceiptOrder(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer size={13} />
                  <span>Печать на принтере</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
