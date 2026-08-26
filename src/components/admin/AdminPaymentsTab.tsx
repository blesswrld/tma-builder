import React, { useState, useEffect } from "react";
import { 
  CreditCard, QrCode, Ticket, RefreshCw, Search, Filter, 
  CheckCircle2, Clock, XCircle, AlertCircle, ExternalLink, 
  Copy, Check, ShieldCheck, Crown, DollarSign, Calendar, ArrowUpRight,
  Download, FileSpreadsheet, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useRealtimeEvent } from "../../context/RealtimeContext";

interface PaymentItem {
  id: string;
  userId: string;
  plan: string;
  amount: number;
  paymentMethod: string;
  status: "SUCCEEDED" | "PENDING" | "CANCELLED" | "FAILED" | string;
  yooPaymentId?: string | null;
  confirmationUrl?: string | null;
  qrUrl?: string | null;
  promocode?: string | null;
  metadata?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userName?: string;
}

interface AdminPaymentsTabProps {
  token: string | null;
  user: any;
  onOpenPlanModal: () => void;
  showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
}

export default function AdminPaymentsTab({
  token,
  user,
  onOpenPlanModal,
  showToast
}: AdminPaymentsTabProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCEEDED" | "PENDING" | "CANCELLED">("ALL");
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<PaymentItem | null>(null);
  const [checkingPaymentId, setCheckingPaymentId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPayments = async (silent = false) => {
    if (!token) return;
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/billing/history", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error("Error fetching payment history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // Realtime polling backup every 10 seconds
    const interval = setInterval(() => {
      fetchPayments(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  useRealtimeEvent(["PAYMENT_UPDATED", "PAYMENT_CREATED", "USER_UPDATED", "PLAN_UPDATED"], (event) => {
    if (event.type === "PAYMENT_UPDATED" && event.payload?.paymentId) {
      setPayments(prev => prev.map(p => p.id === event.payload.paymentId || p.yooPaymentId === event.payload.paymentId ? { ...p, ...event.payload, status: event.payload.status || p.status } : p));
    }
    fetchPayments(true);
  });

  const handleCheckStatus = async (paymentId: string) => {
    if (!token) return;
    setCheckingPaymentId(paymentId);
    try {
      const res = await fetch(`/api/billing/payment-status/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === "SUCCEEDED") {
          showToast("Платёж успешно подтверждён!", "success");
        } else {
          showToast(`Текущий статус платежа: ${data.status}`, "info");
        }
        fetchPayments(true);
      } else {
        showToast(data.error || "Не удалось проверить статус", "error");
      }
    } catch (err: any) {
      showToast("Ошибка соединения при проверке платежа", "error");
    } finally {
      setCheckingPaymentId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Скопировано в буфер обмена", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Metrics
  const totalCount = payments.length;
  const succeededPayments = payments.filter(p => p.status === "SUCCEEDED");
  const totalRevenue = succeededPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pendingCount = payments.filter(p => p.status === "PENDING").length;

  // Filtering by order number (payment ID / yooPaymentId), client email/name, plan, promocode, method
  const filteredPayments = payments.filter(p => {
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      p.id.toLowerCase().includes(q) ||
      (p.yooPaymentId && p.yooPaymentId.toLowerCase().includes(q)) ||
      (p.userEmail && p.userEmail.toLowerCase().includes(q)) ||
      (p.userName && p.userName.toLowerCase().includes(q)) ||
      (p.plan && p.plan.toLowerCase().includes(q)) ||
      (p.promocode && p.promocode.toLowerCase().includes(q)) ||
      (p.paymentMethod && p.paymentMethod.toLowerCase().includes(q));
    
    return matchesStatus && matchesSearch;
  });

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      showToast("Нет записей платежей для экспорта", "warning");
      return;
    }

    const headers = [
      "ID платежа",
      "ID ЮKassa",
      "Email клиента",
      "Имя клиента",
      "Тарифный план",
      "Сумма (руб)",
      "Способ оплаты",
      "Промокод",
      "Период",
      "Статус",
      "Дата создания",
      "Дата оплаты"
    ];

    const rows = filteredPayments.map(p => [
      `"${p.id || ""}"`,
      `"${p.yooPaymentId || ""}"`,
      `"${p.userEmail || ""}"`,
      `"${(p.userName || "").replace(/"/g, '""')}"`,
      `"${p.plan || ""}"`,
      p.amount || 0,
      `"${p.paymentMethod || ""}"`,
      `"${p.promocode || ""}"`,
      `"${getBillingCycleText(p)}"`,
      `"${p.status || ""}"`,
      `"${formatDate(p.createdAt)}"`,
      `"${p.paidAt ? formatDate(p.paidAt) : ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute("download", `payments_history_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Успешно экспортировано ${filteredPayments.length} записей в CSV`, "success");
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "card":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-app-card border border-app-border text-app-primary text-[11px] font-mono">
            <CreditCard size={12} className="text-indigo-400" />
            <span>Карта РФ</span>
          </span>
        );
      case "sbp":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-app-card border border-app-border text-app-primary text-[11px] font-mono">
            <QrCode size={12} className="text-emerald-400" />
            <span>СБП QR</span>
          </span>
        );
      case "promo":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-app-card border border-app-border text-app-primary text-[11px] font-mono">
            <Ticket size={12} className="text-amber-400" />
            <span>Промокод</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-app-card border border-app-border text-app-muted text-[11px] font-mono">
            <span>{method || "Онлайн"}</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-mono font-bold">
            <CheckCircle2 size={12} />
            <span>Оплачен</span>
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-mono font-bold">
            <Clock size={12} className="animate-spin" />
            <span>Ожидает</span>
          </span>
        );
      case "CANCELLED":
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-mono font-bold">
            <XCircle size={12} />
            <span>Отменён</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-app-card border border-app-border text-app-muted text-[11px] font-mono">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getBillingCycleText = (payment: PaymentItem) => {
    if (payment.metadata) {
      try {
        const meta = JSON.parse(payment.metadata);
        if (meta.billingCycle === "yearly") return "1 год (-20%)";
        if (meta.billingCycle === "monthly") return "1 месяц";
      } catch {}
    }
    return "Месячный";
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-app-surface border border-app-border p-5 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-mono text-app-primary">
              История платежей и подписок
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-app-muted mt-1 font-sans">
            Мониторинг статусов транзакций, тарифов и подтверждений в реальном времени
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-mono font-medium shadow-sm"
            title="Экспорт платежей в CSV для бухгалтерии"
          >
            <Download size={14} className="text-emerald-500" />
            <span className="hidden sm:inline">Экспорт в CSV</span>
          </button>

          <button
            type="button"
            onClick={() => fetchPayments()}
            disabled={refreshing}
            className="p-2.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-mono font-medium disabled:opacity-50"
            title="Обновить данные"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Обновить</span>
          </button>

          <button
            type="button"
            onClick={onOpenPlanModal}
            className="px-4 py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Crown size={14} />
            <span>Управление тарифом</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Active Plan */}
        <div className="p-4 bg-app-surface border border-app-border rounded-2xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-app-muted text-[11px]">
            <span>ТЕКУЩИЙ ТАРИФ</span>
            <Crown size={15} className="text-amber-400" />
          </div>
          <div className="text-lg font-bold text-app-primary uppercase flex items-center gap-2">
            <span>{user?.plan || "FREE"}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-app-card border border-app-border font-normal text-app-secondary">
              {user?.plan === "FREE" ? "Базовый" : "Премиум"}
            </span>
          </div>
          <p className="text-[11px] text-app-muted">
            {user?.subscriptionExpiresAt 
              ? `Активен до ${formatDate(user.subscriptionExpiresAt)}`
              : "Без ограничений по времени"}
          </p>
        </div>

        {/* Total Revenue */}
        <div className="p-4 bg-app-surface border border-app-border rounded-2xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-app-muted text-[11px]">
            <span>ОПЛАЧЕНО ВСЕГО</span>
            <DollarSign size={15} className="text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-app-primary">
            {totalRevenue.toLocaleString("ru-RU")} ₽
          </div>
          <p className="text-[11px] text-app-muted">
            За {succeededPayments.length} успешных транзакций
          </p>
        </div>

        {/* Pending Payments */}
        <div className="p-4 bg-app-surface border border-app-border rounded-2xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-app-muted text-[11px]">
            <span>В ОБРАБОТКЕ</span>
            <Clock size={15} className="text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-500 flex items-center gap-2">
            <span>{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse font-normal">
                Требуют проверки
              </span>
            )}
          </div>
          <p className="text-[11px] text-app-muted">
            Ожидают подтверждения банка
          </p>
        </div>

        {/* Total Transactions */}
        <div className="p-4 bg-app-surface border border-app-border rounded-2xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-app-muted text-[11px]">
            <span>ВСЕГО ТРАНЗАКЦИЙ</span>
            <Calendar size={15} className="text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-app-primary">
            {totalCount}
          </div>
          <p className="text-[11px] text-app-muted">
            Включая отменённые и тестовые
          </p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-app-surface border border-app-border p-4 rounded-2xl space-y-3 font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
            {(["ALL", "SUCCEEDED", "PENDING", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-app-accent text-app-accent-fg font-bold shadow-sm"
                    : "bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary border border-app-border"
                }`}
              >
                {st === "ALL" && `Все (${payments.length})`}
                {st === "SUCCEEDED" && `Успешные (${payments.filter(p => p.status === "SUCCEEDED").length})`}
                {st === "PENDING" && `Ожидающие (${payments.filter(p => p.status === "PENDING").length})`}
                {st === "CANCELLED" && `Отменённые (${payments.filter(p => p.status === "CANCELLED" || p.status === "FAILED").length})`}
              </button>
            ))}
          </div>

          {/* Search Box & Quick Export */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по номеру заказа, email..."
                className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary p-0.5 rounded-md"
                >
                  <XCircle size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-all cursor-pointer flex items-center justify-center text-xs font-mono font-medium shrink-0 md:hidden"
              title="Экспорт в CSV"
            >
              <Download size={14} className="text-emerald-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-app-surface border border-app-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-app-muted font-mono space-y-3">
            <RefreshCw size={24} className="animate-spin mx-auto text-app-accent" />
            <p className="text-xs">Загрузка истории платежей...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-app-card border border-app-border flex items-center justify-center text-app-muted mx-auto">
              <CreditCard size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold font-mono text-app-primary">
                Записи платежей не найдены
              </h3>
              <p className="text-xs text-app-muted max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL"
                  ? "Попробуйте изменить параметры фильтрации или поисковый запрос."
                  : "У вас пока нет транзакций. Выберите тарифный план для активации расширенных возможностей."}
              </p>
            </div>
            {!searchQuery && statusFilter === "ALL" && (
              <button
                type="button"
                onClick={onOpenPlanModal}
                className="px-4 py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Crown size={14} />
                <span>Выбрать тариф</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead>
                <tr className="border-b border-app-border bg-app-card/60 text-app-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">ID и Дата</th>
                  <th className="py-3 px-4">Тариф</th>
                  <th className="py-3 px-4">Сумма</th>
                  <th className="py-3 px-4">Способ</th>
                  <th className="py-3 px-4">Период</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/60 text-app-primary">
                {filteredPayments.map((p) => {
                  const isPending = p.status === "PENDING";
                  const isChecking = checkingPaymentId === p.id;

                  return (
                    <tr 
                      key={p.id}
                      className="hover:bg-app-card/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedPaymentDetails(p)}
                    >
                      {/* ID & Date */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-app-primary hover:text-app-accent transition-colors">
                            #{p.id.slice(0, 12)}...
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(p.id, p.id);
                            }}
                            className="p-1 text-app-muted hover:text-app-primary rounded transition-colors"
                            title="Скопировать полный ID"
                          >
                            {copiedId === p.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div className="text-[10px] text-app-muted mt-0.5">
                          {formatDate(p.createdAt)}
                        </div>
                        {p.userEmail && (
                          <div className="text-[10px] text-app-accent font-sans mt-0.5 truncate max-w-[160px]" title={p.userEmail}>
                            {p.userEmail}
                          </div>
                        )}
                      </td>

                      {/* Plan Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 font-bold ${
                          p.plan === "ENTERPRISE" ? "text-amber-400" : p.plan === "PRO" ? "text-indigo-400" : "text-app-muted"
                        }`}>
                          <Crown size={13} />
                          <span>{p.plan}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold text-app-primary">
                        {p.amount ? `${p.amount.toLocaleString("ru-RU")} ₽` : "0 ₽"}
                        {p.promocode && (
                          <div className="text-[10px] text-amber-500 font-normal">
                            Промокод: {p.promocode}
                          </div>
                        )}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4">
                        {getMethodBadge(p.paymentMethod)}
                      </td>

                      {/* Billing Cycle */}
                      <td className="py-3.5 px-4 text-app-secondary text-[11px]">
                        {getBillingCycleText(p)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(p.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => handleCheckStatus(p.id)}
                              disabled={isChecking}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <RefreshCw size={11} className={isChecking ? "animate-spin" : ""} />
                              <span>{isChecking ? "Проверка..." : "Проверить"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedPaymentDetails(p)}
                              className="px-2 py-1 text-app-muted hover:text-app-primary bg-app-card border border-app-border rounded-lg text-[11px] transition-colors cursor-pointer"
                            >
                              Детали
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
        )}
      </div>

      {/* Payment Details Modal */}
      <AnimatePresence>
        {selectedPaymentDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-app-modal border border-app-border rounded-3xl p-6 space-y-5 text-app-primary font-mono shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-app-border pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-app-card border border-app-border flex items-center justify-center text-app-accent">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-app-primary">
                      Детали платежа #{selectedPaymentDetails.id.slice(0, 10)}
                    </h3>
                    <p className="text-[11px] text-app-muted">
                      Информация о проведенной транзакции
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentDetails(null)}
                  className="p-1.5 rounded-xl text-app-muted hover:text-app-primary bg-app-card border border-app-border cursor-pointer transition-colors"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-app-surface border border-app-border rounded-2xl">
                  <div>
                    <span className="text-[10px] text-app-muted block">СТАТУС</span>
                    <div className="mt-1">{getStatusBadge(selectedPaymentDetails.status)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-app-muted block">СУММА</span>
                    <span className="font-bold text-sm text-app-primary mt-1 block">
                      {selectedPaymentDetails.amount ? `${selectedPaymentDetails.amount.toLocaleString("ru-RU")} ₽` : "0 ₽"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-app-surface border border-app-border rounded-2xl">
                  {selectedPaymentDetails.userEmail && (
                    <div className="flex justify-between py-1 border-b border-app-border/40">
                      <span className="text-app-muted">Клиент (Email):</span>
                      <span className="text-app-accent font-semibold">{selectedPaymentDetails.userEmail}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-app-border/40">
                    <span className="text-app-muted">Тарифный план:</span>
                    <span className="font-bold text-app-primary">{selectedPaymentDetails.plan}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-app-border/40">
                    <span className="text-app-muted">Способ оплаты:</span>
                    <span>{getMethodBadge(selectedPaymentDetails.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-app-border/40">
                    <span className="text-app-muted">Период:</span>
                    <span className="text-app-primary">{getBillingCycleText(selectedPaymentDetails)}</span>
                  </div>
                  {selectedPaymentDetails.promocode && (
                    <div className="flex justify-between py-1 border-b border-app-border/40">
                      <span className="text-app-muted">Применён промокод:</span>
                      <span className="text-amber-500 font-bold">{selectedPaymentDetails.promocode}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-app-border/40">
                    <span className="text-app-muted">Дата создания:</span>
                    <span className="text-app-primary">{formatDate(selectedPaymentDetails.createdAt)}</span>
                  </div>
                  {selectedPaymentDetails.paidAt && (
                    <div className="flex justify-between py-1">
                      <span className="text-app-muted">Дата оплаты:</span>
                      <span className="text-emerald-400">{formatDate(selectedPaymentDetails.paidAt)}</span>
                    </div>
                  )}
                </div>

                {selectedPaymentDetails.yooPaymentId && (
                  <div className="p-3 bg-app-surface border border-app-border rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-app-muted block">ID ЮKassa</span>
                      <span className="text-xs text-app-primary">{selectedPaymentDetails.yooPaymentId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedPaymentDetails.yooPaymentId!, "yoo")}
                      className="p-1.5 bg-app-card border border-app-border rounded-lg text-app-muted hover:text-app-primary transition-colors cursor-pointer"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                )}

                {selectedPaymentDetails.status === "PENDING" && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-500 text-xs font-bold">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>Платёж ожидает оплаты пользователем</span>
                    </div>
                    <p className="text-[11px] text-app-secondary font-sans">
                      После совершения перевода нажмите кнопку ниже для мгновенной синхронизации со шлюзом ЮKassa.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleCheckStatus(selectedPaymentDetails.id);
                        setSelectedPaymentDetails(null);
                      }}
                      className="w-full py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} />
                      <span>Проверить статус сейчас</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentDetails(null)}
                  className="w-full py-2.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
