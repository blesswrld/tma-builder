import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Search,
  ExternalLink,
  Store,
  Tag,
  Clock,
  Sparkles,
  Filter
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface ModerationService {
  id: string;
  shopId: string;
  title: string;
  price: number;
  oldPrice?: number | null;
  description?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  moderationStatus?: "APPROVED" | "PENDING" | "REJECTED";
  moderationReason?: string | null;
  isVip?: boolean;
  createdAt: string;
  shop?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
}

export const ModerationPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [services, setServices] = useState<ModerationService[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectModalService, setRejectModalService] = useState<ModerationService | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isModeratorOrAdmin = Boolean(
    user && (
      user.role === "MODERATOR" ||
      user.role === "ADMIN" ||
      user.role === "DEVELOPER" ||
      user.email?.toLowerCase().trim() === "gelgaev.dev@mail.ru" ||
      user.email?.toLowerCase().trim() === "roninfortnite71@gmail.com"
    )
  );

  const fetchModerationItems = useCallback(async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/moderation/services?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (e) {
      console.error("Failed to load moderation items:", e);
    } finally {
      setIsFetching(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!isLoading && isModeratorOrAdmin) {
      fetchModerationItems();
    }
  }, [isLoading, isModeratorOrAdmin, fetchModerationItems]);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/moderation/services/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchModerationItems();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalService) return;
    setActionLoadingId(rejectModalService.id);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/moderation/services/${rejectModalService.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason || "Не соответствует правилам платформы" })
      });
      if (res.ok) {
        setRejectModalService(null);
        setRejectReason("");
        fetchModerationItems();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center text-app-muted font-mono text-xs">
        Загрузка панели модерации...
      </div>
    );
  }

  if (!isModeratorOrAdmin) {
    return (
      <div className="min-h-screen bg-app-bg text-app-primary flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert size={48} className="text-rose-500 mb-4 animate-bounce" />
        <h1 className="text-xl font-bold mb-2">Доступ ограничен</h1>
        <p className="text-app-muted text-sm max-w-md mb-6">
          Панель модерации доступна строго главному администратору (gelgaev.dev@mail.ru) и назначенным модераторам.
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono"
        >
          Вернуться на главную
        </Link>
      </div>
    );
  }

  const filteredServices = services.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.shop?.name && s.shop.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-app-bg text-app-primary transition-colors flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-app-surface border-b border-app-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-secondary hover:text-app-primary transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-primary">
                <Shield size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">Модерация объявлений</h1>
                <p className="text-[11px] text-app-muted font-mono">
                  {user?.role === "ADMIN" || user?.email?.toLowerCase() === "gelgaev.dev@mail.ru" ? "Главный администратор" : "Модератор платформы"}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchModerationItems}
            disabled={isFetching}
            className="p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-secondary hover:text-app-primary transition-colors cursor-pointer"
            title="Обновить список"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin text-app-primary" : ""} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === "PENDING"
                ? "bg-app-surface border-app-border-focus ring-1 ring-app-border-focus text-app-primary shadow-xs"
                : "bg-app-card border-app-border hover:border-app-border-focus text-app-secondary"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-app-muted">Ожидают проверки</span>
              <Clock size={16} className="text-app-muted" />
            </div>
            <div className="text-2xl font-bold font-mono text-app-primary">{counts.pending}</div>
          </button>

          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === "APPROVED"
                ? "bg-app-surface border-app-border-focus ring-1 ring-app-border-focus text-app-primary shadow-xs"
                : "bg-app-card border-app-border hover:border-app-border-focus text-app-secondary"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-app-muted">Одобрено</span>
              <CheckCircle size={16} className="text-app-muted" />
            </div>
            <div className="text-2xl font-bold font-mono text-app-primary">{counts.approved}</div>
          </button>

          <button
            onClick={() => setStatusFilter("REJECTED")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === "REJECTED"
                ? "bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-xs"
                : "bg-app-card border-app-border hover:border-rose-500/30 text-app-secondary"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-app-muted">Отклонено</span>
              <XCircle size={16} className="text-rose-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-400">{counts.rejected}</div>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию услуги, магазину или описанию..."
              className="w-full pl-10 pr-4 py-2 bg-app-card border border-app-border rounded-xl text-xs sm:text-sm text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-border-focus"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-app-card p-1 rounded-xl border border-app-border text-xs font-mono">
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "PENDING" ? "bg-app-accent text-app-accent-fg font-semibold" : "text-app-muted hover:text-app-primary"
              }`}
            >
              На модерации
            </button>
            <button
              onClick={() => setStatusFilter("APPROVED")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "APPROVED" ? "bg-app-accent text-app-accent-fg font-semibold" : "text-app-muted hover:text-app-primary"
              }`}
            >
              Одобрено
            </button>
            <button
              onClick={() => setStatusFilter("REJECTED")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "REJECTED" ? "bg-rose-600 text-white font-semibold" : "text-app-muted hover:text-rose-400"
              }`}
            >
              Отклонено
            </button>
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "ALL" ? "bg-app-accent text-app-accent-fg font-semibold" : "text-app-muted hover:text-app-primary"
              }`}
            >
              Все
            </button>
          </div>
        </div>

        {/* Listing cards */}
        {isFetching ? (
          <div className="p-12 text-center text-app-muted font-mono text-xs">
            Загрузка объявлений на модерации...
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 bg-app-surface border border-dashed border-app-border rounded-3xl text-center space-y-3">
            <ShieldCheck size={36} className="text-app-muted mx-auto" />
            <div className="font-semibold text-sm">Нет объявлений с выбранным статусом</div>
            <div className="text-xs text-app-muted max-w-sm mx-auto">
              Все проверено! Новые позиции появятся здесь сразу же при создании продавцами.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="bg-app-surface border border-app-border rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-app-border-hover transition-all shadow-xs"
              >
                <div className="space-y-3">
                  {/* Shop header */}
                  {service.shop && (
                    <div className="flex items-center justify-between pb-2 border-b border-app-border/60">
                      <div className="flex items-center gap-2">
                        {service.shop.logoUrl ? (
                          <img
                            src={service.shop.logoUrl}
                            alt=""
                            className="w-6 h-6 rounded-md object-cover border border-app-border"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-app-card border border-app-border flex items-center justify-center text-app-muted">
                            <Store size={12} />
                          </div>
                        )}
                        <span className="text-xs font-semibold text-app-primary truncate max-w-[160px]">
                          {service.shop.name}
                        </span>
                      </div>
                      <Link
                        to={`/${service.shop.slug}`}
                        target="_blank"
                        className="text-[11px] text-app-muted hover:text-app-primary flex items-center gap-1 font-mono"
                      >
                        <span>Магазин</span>
                        <ExternalLink size={10} />
                      </Link>
                    </div>
                  )}

                  {/* Service image & badges */}
                  <div className="relative aspect-video rounded-xl bg-app-card border border-app-border overflow-hidden">
                    {service.imageUrl ? (
                      <img
                        src={service.imageUrl}
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-app-muted text-xs font-mono">
                        Без фото
                      </div>
                    )}
                    {service.isVip && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-app-card/90 backdrop-blur-xs text-app-primary border border-app-border text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                        <Sparkles size={10} />
                        <span>VIP</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          service.moderationStatus === "APPROVED"
                            ? "bg-app-card/95 text-app-primary border border-app-border"
                            : service.moderationStatus === "REJECTED"
                            ? "bg-rose-600 text-white"
                            : "bg-app-card/95 text-app-muted border border-app-border"
                        }`}
                      >
                        {service.moderationStatus === "APPROVED"
                          ? "Одобрено"
                          : service.moderationStatus === "REJECTED"
                          ? "Отклонено"
                          : "На проверке"}
                      </span>
                    </div>
                  </div>

                  {/* Service info */}
                  <div>
                    <h3 className="font-bold text-sm text-app-primary leading-snug line-clamp-1">
                      {service.title}
                    </h3>
                    <div className="text-xs text-app-muted line-clamp-2 mt-1 min-h-[32px]">
                      {service.description || "Без описания"}
                    </div>
                  </div>

                  {/* Price & category */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-bold font-mono text-app-primary text-sm">
                      {service.price.toLocaleString("ru-RU")} ₽
                    </span>
                    {service.category && (
                      <span className="text-[11px] text-app-muted bg-app-card px-2 py-0.5 rounded-md border border-app-border">
                        {service.category}
                      </span>
                    )}
                  </div>

                  {/* Rejection reason if rejected */}
                  {service.moderationStatus === "REJECTED" && service.moderationReason && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                      <span className="font-semibold text-rose-400">Причина отказа: </span>
                      {service.moderationReason}
                    </div>
                  )}
                </div>

                {/* Action buttons: Одобрение (Completion) and Отклонение (Rejection/Deletion) */}
                <div className="pt-3 border-t border-app-border/60 flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(service.id)}
                    disabled={actionLoadingId === service.id}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-xs"
                  >
                    <CheckCircle size={14} />
                    <span>Одобрить</span>
                  </button>

                  <button
                    onClick={() => {
                      setRejectModalService(service);
                      setRejectReason("");
                    }}
                    disabled={actionLoadingId === service.id}
                    className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-xs"
                  >
                    <XCircle size={14} />
                    <span>Отклонить</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {rejectModalService && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Отклонить объявление</span>
            </div>
            <p className="text-xs text-app-muted">
              Укажите причину отказа для позиции «{rejectModalService.title}». Продавец увидит это пояснение:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Например: Некорректная цена, запрещенный товар или некачественное фото..."
              rows={3}
              className="w-full bg-app-card border border-app-border rounded-xl p-3 text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalService(null)}
                className="px-4 py-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs text-app-primary cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Подтвердить отказ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ModerationPage;
