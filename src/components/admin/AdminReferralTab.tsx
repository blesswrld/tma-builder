import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gift,
  Users,
  Copy,
  Check,
  QrCode,
  Send,
  Sparkles,
  Crown,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Search,
  Zap,
  Info,
  Calendar,
  Award,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeEvent } from "../../context/RealtimeContext";
import ReferralQrModal from "../referral/ReferralQrModal";
import ReferralPostShareModal from "../referral/ReferralPostShareModal";

interface ReferralUser {
  id: string;
  name: string;
  maskedEmail: string;
  plan: string;
  isVerified: boolean;
  createdAt: string;
}

interface ReferralTier {
  tier: "PRO_50" | "ENTERPRISE_100";
  target: number;
  rewardPlan: "PRO" | "ENTERPRISE";
  months: number;
  currentCount: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  progressPercent: number;
  remaining: number;
}

interface ReferralData {
  referralCode: string;
  referralLink: string;
  activatedCount: number;
  currentPlan: string;
  subscriptionExpiresAt: string | null;
  tiers: {
    pro: ReferralTier;
    enterprise: ReferralTier;
  };
  rewards: any[];
  referrals: ReferralUser[];
}

export const AdminReferralTab: React.FC = () => {
  const { user, token } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [postsModalOpen, setPostsModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchReferralData = useCallback(async (showLoader = true) => {
    if (!token) return;
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch("/api/referrals/my", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching referral data:", err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  // Realtime update on referral registered
  useRealtimeEvent("REFERRAL_ACTIVATED", (event) => {
    const payload = event?.payload;
    if (user?.id && payload?.referrerId === user.id) {
      setStatusMessage({
        type: "success",
        text: `🎉 Новый реферал зарегистрирован: ${payload.userName || "Пользователь"} (${payload.email || "активирован"})!`
      });
      fetchReferralData(false);
    }
  });

  const handleCopyLink = async () => {
    if (!data?.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyCode = async () => {
    if (!data?.referralCode) return;
    try {
      await navigator.clipboard.writeText(data.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareTelegram = () => {
    if (!data?.referralLink) return;
    const shareText = `🚀 Создай свой интернет-магазин или Telegram Mini App за 5 минут в конструкторе TMA-Builder:`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(data.referralLink)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const handleClaimReward = async (tier: "PRO_50" | "ENTERPRISE_100") => {
    if (!token) return;
    setIsClaiming(tier);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/referrals/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tier })
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Не удалось забрать награду");
      }
      setStatusMessage({
        type: "success",
        text: result.message || "Награда успешно начислена!"
      });
      await fetchReferralData(false);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Ошибка при получении награды"
      });
    } finally {
      setIsClaiming(null);
    }
  };

  const filteredReferrals = (data?.referrals || []).filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.maskedEmail.toLowerCase().includes(q) ||
      r.plan.toLowerCase().includes(q)
    );
  });

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-app-muted space-y-3">
        <RefreshCw size={24} className="animate-spin text-app-primary" />
        <p className="font-mono text-xs">Загрузка данных реферальной программы...</p>
      </div>
    );
  }

  const activatedCount = data?.activatedCount || 0;
  const proTier = data?.tiers?.pro;
  const entTier = data?.tiers?.enterprise;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast notification message */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono shadow-lg ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="px-2 py-1 rounded bg-black/10 hover:bg-black/20 text-current transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-app-card via-app-card to-app-primary/5 border border-app-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-app-primary/10 border border-app-primary/20 text-app-primary text-xs font-mono font-medium">
            <Gift size={13} />
            <span>Программа раннего охвата перед запуском</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-app-primary">
            Реферальная программа TMA-Builder
          </h1>
          <p className="text-xs sm:text-sm text-app-muted leading-relaxed font-sans">
            Приглашайте предпринимателей, разработчиков и владельцев бизнеса. Зарегистрированные и активированные
            пользователи принесут вам бесплатный доступ к тарифам <strong className="text-app-primary font-semibold">PRO</strong> и <strong className="text-app-primary font-semibold">ENTERPRISE</strong> на целый месяц!
          </p>
        </div>
      </div>

      {/* Referral Link & Share Controls */}
      <div className="bg-app-card border border-app-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-app-border pb-3">
          <div>
            <h2 className="font-bold text-sm text-app-primary flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <span>Ваша персональная ссылка для приглашений</span>
            </h2>
            <p className="text-xs text-app-muted">
              Учитываются только пользователи, подтвердившие регистрацию через E-mail
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReferralData(true)}
              className="p-2 bg-app-bg hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary rounded-xl transition-colors cursor-pointer"
              title="Обновить данные"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch gap-3">
          <div className="flex-1 flex items-center bg-app-bg border border-app-border rounded-xl px-3.5 py-2.5 overflow-hidden">
            <input
              type="text"
              readOnly
              value={data?.referralLink || ""}
              className="w-full bg-transparent font-mono text-xs text-app-primary focus:outline-none select-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl transition-all hover:opacity-90 shadow-sm cursor-pointer shrink-0"
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? "Ссылка скопирована!" : "Копировать ссылку"}</span>
            </button>

            <button
              onClick={handleShareTelegram}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-mono text-xs font-medium rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Send size={14} />
              <span>В Telegram</span>
            </button>

            <button
              onClick={() => setQrModalOpen(true)}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-app-bg hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-colors cursor-pointer shrink-0"
              title="Показать QR-код"
            >
              <QrCode size={14} />
              <span>QR-код</span>
            </button>

            <button
              onClick={() => setPostsModalOpen(true)}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-app-bg hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-colors cursor-pointer shrink-0"
              title="Готовые шаблоны постов"
            >
              <Sparkles size={14} />
              <span>Шаблоны постов</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-app-muted">
          <span>Ваш реферальный код:</span>
          <span className="font-bold text-app-primary bg-app-bg px-2 py-0.5 rounded border border-app-border">
            {data?.referralCode || "..."}
          </span>
          <button
            onClick={handleCopyCode}
            className="hover:text-app-primary p-1 cursor-pointer"
            title="Скопировать код"
          >
            {copiedCode ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Reward Milestones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestone 1: 50 Referrals -> PRO (1 month) */}
        <div className={`relative bg-app-card border rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between ${
          proTier?.isClaimed
            ? "border-emerald-500/40 bg-emerald-500/[0.02]"
            : proTier?.isUnlocked
            ? "border-amber-500/50 shadow-amber-500/5"
            : "border-app-border"
        }`}>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                  <Sparkles size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-500">
                    Рубеж 1 • 50 приглашений
                  </span>
                  <h3 className="text-lg font-bold text-app-primary">
                    Тариф PRO на 1 месяц
                  </h3>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full font-mono text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Экономия 1 990 ₽
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-app-muted">Прогресс активированных:</span>
                <span className="font-bold text-app-primary">
                  {activatedCount} / 50 чел. ({proTier?.progressPercent || 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-app-bg border border-app-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${proTier?.progressPercent || 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                />
              </div>
            </div>

            {/* Features list */}
            <div className="pt-2 space-y-2 text-xs font-sans text-app-muted">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                <span>До 15 филиалов и заведений в одном аккаунте</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                <span>Неограниченное меню, категории и модификаторы</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                <span>Интеграция собственного Telegram бота</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                <span>Массовые рассылки клиентам и промокоды</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-6">
            {proTier?.isClaimed ? (
              <div className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold flex items-center justify-center gap-2">
                <Check size={16} />
                <span>Награда получена (PRO активирован на 30 дней)</span>
              </div>
            ) : proTier?.isUnlocked ? (
              <button
                onClick={() => handleClaimReward("PRO_50")}
                disabled={isClaiming === "PRO_50"}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.01]"
              >
                {isClaiming === "PRO_50" ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Gift size={16} />
                )}
                <span>Забрать тариф PRO на 1 месяц бесплатно</span>
              </button>
            ) : (
              <div className="w-full py-3 px-4 rounded-xl bg-app-bg border border-app-border text-app-muted font-mono text-xs font-medium flex items-center justify-center gap-2">
                <Lock size={14} />
                <span>Осталось пригласить: {proTier?.remaining || 50} чел.</span>
              </div>
            )}
          </div>
        </div>

        {/* Milestone 2: 100 Referrals -> ENTERPRISE (1 month) */}
        <div className={`relative bg-app-card border rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between ${
          entTier?.isClaimed
            ? "border-emerald-500/40 bg-emerald-500/[0.02]"
            : entTier?.isUnlocked
            ? "border-purple-500/50 shadow-purple-500/5"
            : "border-app-border"
        }`}>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 font-bold">
                  <Crown size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-500">
                    Рубеж 2 • 100 приглашений
                  </span>
                  <h3 className="text-lg font-bold text-app-primary">
                    Тариф ENTERPRISE на 1 месяц
                  </h3>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full font-mono text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Экономия 4 990 ₽
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-app-muted">Прогресс активированных:</span>
                <span className="font-bold text-app-primary">
                  {activatedCount} / 100 чел. ({entTier?.progressPercent || 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-app-bg border border-app-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${entTier?.progressPercent || 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                />
              </div>
            </div>

            {/* Features list */}
            <div className="pt-2 space-y-2 text-xs font-sans text-app-muted">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-500 shrink-0" />
                <span>Все возможности платформы без ограничений</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-500 shrink-0" />
                <span>Безлимитное количество заведений и сотрудников</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-500 shrink-0" />
                <span>Приоритетная выделенная поддержка 24/7</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-500 shrink-0" />
                <span>Расширенная финансовая аналитика и выгрузка отчётов</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-6">
            {entTier?.isClaimed ? (
              <div className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold flex items-center justify-center gap-2">
                <Check size={16} />
                <span>Награда получена (ENTERPRISE активирован на 30 дней)</span>
              </div>
            ) : entTier?.isUnlocked ? (
              <button
                onClick={() => handleClaimReward("ENTERPRISE_100")}
                disabled={isClaiming === "ENTERPRISE_100"}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer hover:scale-[1.01]"
              >
                {isClaiming === "ENTERPRISE_100" ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Crown size={16} />
                )}
                <span>Забрать тариф ENTERPRISE на 1 месяц бесплатно</span>
              </button>
            ) : (
              <div className="w-full py-3 px-4 rounded-xl bg-app-bg border border-app-border text-app-muted font-mono text-xs font-medium flex items-center justify-center gap-2">
                <Lock size={14} />
                <span>Осталось пригласить: {entTier?.remaining || 100} чел.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-app-muted">Активировано</span>
          <div className="text-xl font-bold text-app-primary flex items-center gap-1.5">
            <Users size={18} className="text-app-accent" />
            <span>{activatedCount} чел.</span>
          </div>
        </div>

        <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-app-muted">Текущий тариф</span>
          <div className="text-xl font-bold text-app-primary flex items-center gap-1.5">
            <Crown size={18} className="text-amber-500" />
            <span>{data?.currentPlan || "FREE"}</span>
          </div>
        </div>

        <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-app-muted">Срок действия</span>
          <div className="text-xs font-mono font-bold text-app-primary truncate pt-1">
            {data?.subscriptionExpiresAt
              ? new Date(data.subscriptionExpiresAt).toLocaleDateString("ru-RU")
              : "Бессрочно (Free)"}
          </div>
        </div>

        <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-app-muted">Получено наград</span>
          <div className="text-xl font-bold text-app-primary flex items-center gap-1.5">
            <Award size={18} className="text-emerald-500" />
            <span>{data?.rewards?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Invited Users List */}
      <div className="bg-app-card border border-app-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border pb-4">
          <div>
            <h3 className="font-bold text-sm text-app-primary flex items-center gap-2">
              <Users size={16} />
              <span>Список приглашённых участников ({data?.referrals?.length || 0})</span>
            </h3>
            <p className="text-xs text-app-muted">
              Только пользователи с подтверждённым E-mail аккаунтом
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              placeholder="Поиск по имени/почте..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-app-bg border border-app-border rounded-xl font-mono text-xs text-app-primary focus:outline-none focus:border-app-primary"
            />
          </div>
        </div>

        {filteredReferrals.length === 0 ? (
          <div className="py-12 text-center text-app-muted space-y-2">
            <Users size={32} className="mx-auto opacity-30" />
            <p className="font-mono text-xs">
              {searchQuery
                ? "Ничего не найдено по вашему запросу."
                : "Вы ещё не пригласили пользователей. Скопируйте ссылку выше и отправьте её друзьям!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-app-border text-app-muted">
                  <th className="pb-3 font-medium">Пользователь</th>
                  <th className="pb-3 font-medium">E-mail</th>
                  <th className="pb-3 font-medium">Тариф</th>
                  <th className="pb-3 font-medium">Статус</th>
                  <th className="pb-3 font-medium text-right">Дата регистрации</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredReferrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-app-bg/50 transition-colors">
                    <td className="py-3 text-app-primary font-medium font-sans">
                      {ref.name}
                    </td>
                    <td className="py-3 text-app-muted">
                      {ref.maskedEmail}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-app-bg border border-app-border text-app-primary">
                        {ref.plan}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-500 text-[11px]">
                        <CheckCircle2 size={12} />
                        <span>Активирован</span>
                      </span>
                    </td>
                    <td className="py-3 text-right text-app-muted">
                      {new Date(ref.createdAt).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rules & FAQ Section */}
      <div className="bg-app-card border border-app-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-app-primary flex items-center gap-2">
          <Info size={16} className="text-app-muted" />
          <span>Правила и условия реферальной программы</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs text-app-muted">
          <div className="p-4 bg-app-bg border border-app-border rounded-xl space-y-2">
            <div className="w-7 h-7 rounded-lg bg-app-primary/10 text-app-primary font-mono font-bold flex items-center justify-center text-xs">
              1
            </div>
            <h4 className="font-bold text-app-primary text-xs">Только активированные аккаунты</h4>
            <p className="leading-relaxed">
              Реферал засчитывается в счётчик только после успешной регистрации и подтверждения 6-значного кода из E-mail письма.
            </p>
          </div>

          <div className="p-4 bg-app-bg border border-app-border rounded-xl space-y-2">
            <div className="w-7 h-7 rounded-lg bg-app-primary/10 text-app-primary font-mono font-bold flex items-center justify-center text-xs">
              2
            </div>
            <h4 className="font-bold text-app-primary text-xs">Суммирование подписок</h4>
            <p className="leading-relaxed">
              Если у вас уже есть оплаченная подписка, подарочный месяц на тарифе PRO или ENTERPRISE продлит срок её действия на +30 дней.
            </p>
          </div>

          <div className="p-4 bg-app-bg border border-app-border rounded-xl space-y-2">
            <div className="w-7 h-7 rounded-lg bg-app-primary/10 text-app-primary font-mono font-bold flex items-center justify-center text-xs">
              3
            </div>
            <h4 className="font-bold text-app-primary text-xs">Мгновенная активация</h4>
            <p className="leading-relaxed">
              Как только вы наберёте 50 или 100 пользователей, кнопка «Забрать тариф» активируется сразу без ожидания модерации.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReferralQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        referralLink={data?.referralLink || ""}
        referralCode={data?.referralCode || ""}
      />

      <ReferralPostShareModal
        isOpen={postsModalOpen}
        onClose={() => setPostsModalOpen(false)}
        referralLink={data?.referralLink || ""}
      />
    </div>
  );
};
export default AdminReferralTab;
