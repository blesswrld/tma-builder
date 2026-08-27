import React, { FormEvent, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Tag,
  Trash2,
  X,
  Plus,
  Copy,
  Check,
  Percent,
  Coins,
  Sparkles,
  Dices,
  Calendar,
  ShoppingBag,
  Clock,
  ToggleLeft,
  ToggleRight,
  Search,
  CheckCircle2,
  Gift,
  Flame,
  Crown,
  Users,
  AlertCircle,
  Pencil
} from "lucide-react";
import { Promocode } from "../../types";
import { CustomDatePicker } from "../ui/CustomDatePicker";

interface AdminPromocodesTabProps {
  promocodes: Promocode[];
  handleDeletePromocode: (id: string) => void;
  handleTogglePromocodeActive?: (id: string, currentActive: boolean) => void;
  isCreatingPromo: boolean;
  setIsCreatingPromo: (creating: boolean) => void;
  editingPromoId?: string | null;
  setEditingPromoId?: (id: string | null) => void;
  promoError: string | null;
  newPromoData: {
    code: string;
    discountType?: "percent" | "fixed";
    discountPercent: string;
    discountAmount: string;
    usageLimit: string;
    minOrderAmount?: string;
    expiresAt?: string;
    description?: string;
    isActive?: boolean;
  };
  setNewPromoData: React.Dispatch<
    React.SetStateAction<{
      code: string;
      discountType?: "percent" | "fixed";
      discountPercent: string;
      discountAmount: string;
      usageLimit: string;
      minOrderAmount?: string;
      expiresAt?: string;
      description?: string;
      isActive?: boolean;
    }>
  >;
  handleCreatePromocode: (e: FormEvent) => void;
}

// Catchy promo code generator pool
const CODE_PREFIXES = ["SALE", "TOPCUT", "BARBER", "WELCOME", "VIP", "SUPER", "BONUS", "LUCKY", "SECRET", "PROMO", "SPECIAL", "FRIEND"];

const PRESET_TEMPLATES = [
  {
    name: "Первый визит",
    icon: Gift,
    codePrefix: "WELCOME",
    discountType: "percent" as const,
    discountVal: "10",
    limit: "100",
    minOrder: "",
    days: 30,
    desc: "Скидка для новых клиентов на первый заказ"
  },
  {
    name: "День рождения",
    icon: Sparkles,
    codePrefix: "BIRTHDAY",
    discountType: "percent" as const,
    discountVal: "20",
    limit: "50",
    minOrder: "1000",
    days: 14,
    desc: "Праздничная скидка ко дню рождения"
  },
  {
    name: "VIP Клиент",
    icon: Crown,
    codePrefix: "VIP",
    discountType: "fixed" as const,
    discountVal: "500",
    limit: "30",
    minOrder: "2000",
    days: 60,
    desc: "Специальный бонус для постоянных гостей"
  },
  {
    name: "Горячая акция",
    icon: Flame,
    codePrefix: "FLASH",
    discountType: "percent" as const,
    discountVal: "15",
    limit: "25",
    minOrder: "",
    days: 3,
    desc: "Ограниченное по времени спецпредложение"
  },
  {
    name: "Приведи друга",
    icon: Users,
    codePrefix: "FRIEND",
    discountType: "percent" as const,
    discountVal: "10",
    limit: "50",
    minOrder: "1500",
    days: 45,
    desc: "Реферальный промокод по рекомендации"
  }
];

export function AdminPromocodesTab({
  promocodes,
  handleDeletePromocode,
  handleTogglePromocodeActive,
  isCreatingPromo,
  setIsCreatingPromo,
  editingPromoId,
  setEditingPromoId,
  promoError,
  newPromoData,
  setNewPromoData,
  handleCreatePromocode,
}: AdminPromocodesTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PERCENT" | "FIXED" | "EXHAUSTED">("ALL");

  // Determine active discount type
  const activeDiscountType = newPromoData.discountType || (Number(newPromoData.discountPercent) > 0 ? "percent" : "fixed");

  const handleStartEditPromocode = (promo: Promocode) => {
    const isPercent = promo.discountPercent > 0 || promo.discountType === "percent";
    let expDateFormatted = "";
    if (promo.expiresAt) {
      const d = new Date(promo.expiresAt);
      if (!isNaN(d.getTime())) {
        expDateFormatted = d.toISOString().split("T")[0];
      }
    }

    setNewPromoData({
      code: promo.code,
      discountType: isPercent ? "percent" : "fixed",
      discountPercent: promo.discountPercent ? String(promo.discountPercent) : "",
      discountAmount: promo.discountAmount ? String(promo.discountAmount) : "",
      usageLimit: String(promo.maxUses || promo.usageLimit || 100),
      minOrderAmount: promo.minOrderAmount ? String(promo.minOrderAmount) : "",
      expiresAt: expDateFormatted,
      description: promo.description || "",
      isActive: promo.isActive !== false,
    });
    setEditingPromoId?.(promo.id);
    setIsCreatingPromo(true);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateRandomCode = () => {
    const prefix = CODE_PREFIXES[Math.floor(Math.random() * CODE_PREFIXES.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setNewPromoData((prev) => ({
      ...prev,
      code: `${prefix}${num}`
    }));
  };

  const applyTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    let expDateString = "";
    if (tpl.days) {
      const d = new Date();
      d.setDate(d.getDate() + tpl.days);
      expDateString = d.toISOString().split("T")[0];
    }

    setNewPromoData({
      code: `${tpl.codePrefix}${randomSuffix}`,
      discountType: tpl.discountType,
      discountPercent: tpl.discountType === "percent" ? tpl.discountVal : "",
      discountAmount: tpl.discountType === "fixed" ? tpl.discountVal : "",
      usageLimit: tpl.limit,
      minOrderAmount: tpl.minOrder,
      expiresAt: expDateString,
      description: tpl.desc,
      isActive: true
    });
  };

  const setExpiryDays = (days: number | null) => {
    if (days === null) {
      setNewPromoData((p) => ({ ...p, expiresAt: "" }));
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNewPromoData((p) => ({ ...p, expiresAt: d.toISOString().split("T")[0] }));
  };

  // Stats calculation
  const totalCount = promocodes.length;
  const activeCount = promocodes.filter((p) => p.isActive !== false).length;
  const totalUses = promocodes.reduce((sum, p) => sum + (p.usedCount || p.timesUsed || 0), 0);

  // Filtered promocodes
  const filteredPromocodes = useMemo(() => {
    return promocodes.filter((promo) => {
      const matchesSearch =
        promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (promo.description && promo.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      const isPercent = (promo.discountPercent || 0) > 0;
      const isFixed = (promo.discountAmount || 0) > 0;
      const limit = promo.maxUses || promo.usageLimit || 100;
      const uses = promo.usedCount || promo.timesUsed || 0;
      const isExhausted = uses >= limit;
      const isActive = promo.isActive !== false;

      if (statusFilter === "ACTIVE") return isActive && !isExhausted;
      if (statusFilter === "PERCENT") return isPercent;
      if (statusFilter === "FIXED") return isFixed;
      if (statusFilter === "EXHAUSTED") return isExhausted;

      return true;
    });
  }, [promocodes, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-app-card border border-app-border flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-mono text-app-secondary uppercase tracking-wider font-medium">Всего промокодов</p>
            <p className="text-xl font-bold font-mono text-app-primary mt-0.5">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border flex items-center justify-center text-app-primary">
            <Tag size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-app-card border border-app-border flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-mono text-app-secondary uppercase tracking-wider font-medium">Активные акции</p>
            <p className="text-xl font-bold font-mono text-emerald-500 mt-0.5">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-app-card border border-app-border flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-mono text-app-secondary uppercase tracking-wider font-medium">Использований клиентами</p>
            <p className="text-xl font-bold font-mono text-app-primary mt-0.5">{totalUses}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border flex items-center justify-center text-app-primary">
            <ShoppingBag size={18} />
          </div>
        </div>
      </div>

      {/* Action Bar: Search, Filters & Create Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по коду или описанию..."
              className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-primary/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-app-secondary hover:text-app-primary cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "ALL", label: "Все" },
              { id: "ACTIVE", label: "Активные" },
              { id: "PERCENT", label: "% Скидка" },
              { id: "FIXED", label: "₽ Фикс" },
              { id: "EXHAUSTED", label: "Лимит исчерпан" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-app-accent text-app-accent-fg font-semibold shadow-xs"
                    : "bg-app-card border border-app-border text-app-secondary hover:text-app-primary hover:bg-app-surface font-medium"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (!newPromoData.code) {
              setNewPromoData({
                code: "SALE" + Math.floor(10 + Math.random() * 90),
                discountType: "percent",
                discountPercent: "15",
                discountAmount: "",
                usageLimit: "100",
                minOrderAmount: "",
                expiresAt: "",
                description: "",
                isActive: true,
              });
            }
            setIsCreatingPromo(true);
          }}
          className="px-4 py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <Plus size={15} />
          <span>Создать промокод</span>
        </button>
      </div>

      {/* Promocodes Grid */}
      {filteredPromocodes.length === 0 ? (
        <div className="py-14 text-center bg-app-card border border-dashed border-app-border rounded-3xl p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-app-surface border border-app-border flex items-center justify-center mx-auto text-app-muted">
            <Tag size={24} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-app-primary">
              {searchQuery || statusFilter !== "ALL" ? "Ничего не найдено" : "Нет активных промокодов"}
            </h4>
            <p className="text-xs text-app-secondary leading-relaxed">
              {searchQuery || statusFilter !== "ALL"
                ? "Попробуйте изменить поисковый запрос или сбросить фильтры"
                : "Создавайте скидочные купоны для привлечения и удержания клиентов"}
            </p>
          </div>
          {!searchQuery && statusFilter === "ALL" && (
            <div className="pt-2">
              <button
                onClick={() => {
                  applyTemplate(PRESET_TEMPLATES[0]);
                  setIsCreatingPromo(true);
                }}
                className="px-4 py-2 bg-app-surface border border-app-border hover:bg-app-hover text-app-primary text-xs font-mono font-semibold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>Создать первый промокод (Шаблон)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromocodes.map((promo, idx) => {
            const isPercent = (promo.discountPercent || 0) > 0;
            const discountLabel = isPercent
              ? `${promo.discountPercent}%`
              : `${promo.discountAmount} ₽`;
            const limit = promo.maxUses || promo.usageLimit || 100;
            const uses = promo.usedCount || promo.timesUsed || 0;
            const usagePercent = Math.min(100, Math.round((uses / limit) * 100));
            const isExhausted = uses >= limit;
            const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
            const isActive = promo.isActive !== false && !isExhausted && !isExpired;

            return (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                whileHover={{ y: -2 }}
                className={`relative rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  !isActive
                    ? "bg-app-card/60 border-app-border opacity-75"
                    : "bg-app-card border-app-border hover:border-app-primary/30"
                }`}
              >
                {/* Perforation / Ticket Style Left Notch */}
                <div className="p-5 space-y-4 relative">
                  {/* Top Bar: Discount Type Badge + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="px-3 py-1 bg-app-surface border border-app-border rounded-xl flex items-center gap-1.5 shadow-2xs">
                        {isPercent ? (
                          <Percent size={13} className="text-indigo-400 shrink-0" />
                        ) : (
                          <Coins size={13} className="text-amber-400 shrink-0" />
                        )}
                        <span className="font-mono font-bold text-sm text-app-primary">
                          {discountLabel}
                        </span>
                      </div>

                      {/* Status indicator pill */}
                      {isExhausted ? (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-mono font-semibold rounded-md">
                          Исчерпан
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-mono font-semibold rounded-md">
                          Истёк
                        </span>
                      ) : promo.isActive === false ? (
                        <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[10px] font-mono font-semibold rounded-md">
                          На паузе
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-semibold rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Активен
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditPromocode(promo)}
                        className="p-1.5 text-app-secondary hover:text-app-primary hover:bg-app-surface rounded-lg transition-colors cursor-pointer"
                        title="Редактировать промокод"
                      >
                        <Pencil size={14} />
                      </button>
                      {handleTogglePromocodeActive && (
                        <button
                          type="button"
                          onClick={() => handleTogglePromocodeActive(promo.id, promo.isActive !== false)}
                          className="p-1.5 text-app-secondary hover:text-app-primary hover:bg-app-surface rounded-lg transition-colors cursor-pointer"
                          title={promo.isActive !== false ? "Поставить на паузу" : "Активировать"}
                        >
                          {promo.isActive !== false ? (
                            <ToggleRight size={18} className="text-emerald-500" />
                          ) : (
                            <ToggleLeft size={18} className="text-app-secondary" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeletePromocode(promo.id)}
                        className="p-1.5 text-app-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Удалить промокод"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Promo Code Box with Quick Copy */}
                  <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between gap-2 group/code">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-app-secondary uppercase font-medium">Код для ввода</p>
                      <p className="font-mono font-bold text-base text-app-primary tracking-wider uppercase truncate">
                        {promo.code}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(promo.code, promo.id)}
                      className="px-2.5 py-1.5 bg-app-card border border-app-border hover:bg-app-hover rounded-lg text-xs font-mono text-app-primary transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs font-medium"
                      title="Скопировать промокод"
                    >
                      {copiedId === promo.id ? (
                        <>
                          <Check size={13} className="text-emerald-500" />
                          <span className="text-[11px] text-emerald-500 font-semibold">Скопирован</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} className="text-app-secondary" />
                          <span className="text-[11px]">Копия</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Description / Note */}
                  {promo.description && (
                    <p className="text-xs text-app-secondary line-clamp-2 leading-relaxed">
                      {promo.description}
                    </p>
                  )}

                  {/* Usage Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-mono text-app-secondary">
                      <span className="font-medium">Использовано:</span>
                      <span className="text-app-primary font-semibold">
                        {uses} / {limit}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-app-surface rounded-full overflow-hidden border border-app-border/40">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          usagePercent >= 100
                            ? "bg-rose-500"
                            : usagePercent >= 75
                            ? "bg-amber-500"
                            : "bg-app-primary"
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Extra Condition Tags (Min order & Expiration date) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {promo.minOrderAmount && promo.minOrderAmount > 0 ? (
                      <span className="px-2 py-0.5 bg-app-surface border border-app-border text-[10px] font-mono text-app-secondary font-medium rounded-md flex items-center gap-1">
                        <ShoppingBag size={10} className="text-app-secondary" />
                        <span>Чек от {promo.minOrderAmount} ₽</span>
                      </span>
                    ) : null}

                    {promo.expiresAt ? (
                      <span className="px-2 py-0.5 bg-app-surface border border-app-border text-[10px] font-mono text-app-secondary font-medium rounded-md flex items-center gap-1">
                        <Calendar size={10} className="text-app-secondary" />
                        <span>до {new Date(promo.expiresAt).toLocaleDateString("ru-RU")}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-app-surface border border-app-border text-[10px] font-mono text-app-secondary font-medium rounded-md flex items-center gap-1">
                        <Clock size={10} className="text-app-secondary" />
                        <span>Бессрочный</span>
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Advanced Create Promo Modal with Live Ticket Preview */}
      <AnimatePresence>
        {isCreatingPromo && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="max-w-xl w-full bg-app-modal border border-app-border rounded-3xl p-4 sm:p-5 text-app-primary space-y-3 shadow-2xl my-auto max-h-[94vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-app-border pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-app-surface border border-app-border flex items-center justify-center text-app-primary shadow-2xs">
                    <Tag size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-app-primary">
                      {editingPromoId ? "Редактировать промокод" : "Создать промокод"}
                    </h3>
                    <p className="text-[11px] text-app-secondary">Настройте условия, скидку и лимиты для клиентов</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingPromo(false);
                    setEditingPromoId?.(null);
                  }}
                  className="p-1.5 text-app-secondary hover:text-app-primary hover:bg-app-surface rounded-xl transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Preset Templates Bar (Compact Horizontal Scroll / Grid) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono text-app-secondary uppercase tracking-wider font-medium flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-400" />
                    <span>Быстрые шаблоны</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {PRESET_TEMPLATES.map((tpl) => {
                    const IconComp = tpl.icon;
                    return (
                      <button
                        key={tpl.name}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="p-1.5 sm:p-2 rounded-xl bg-app-surface border border-app-border hover:border-app-border/80 text-left space-y-0.5 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-1 text-app-primary">
                          <IconComp size={12} className="shrink-0 text-app-secondary group-hover:text-app-primary" />
                          <span className="text-[10px] font-semibold truncate">{tpl.name}</span>
                        </div>
                        <p className="text-[10px] font-mono font-bold text-app-primary">
                          {tpl.discountType === "percent" ? `${tpl.discountVal}%` : `${tpl.discountVal} ₽`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Ticket Preview */}
              <div className="relative rounded-2xl bg-app-card text-app-primary p-3 border border-app-border shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-app-border pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-app-surface text-app-primary font-mono text-[9px] uppercase tracking-wider border border-app-border font-bold">
                      Предпросмотр купона
                    </span>
                    <span className="text-[11px] text-app-secondary font-medium font-mono">
                      {activeDiscountType === "percent" ? "Процентная скидка" : "Фиксированная сумма"}
                    </span>
                  </div>
                  <div className="text-base font-mono font-bold text-emerald-500">
                    {activeDiscountType === "percent"
                      ? `${newPromoData.discountPercent || "0"}%`
                      : `${newPromoData.discountAmount || "0"} ₽`}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] text-app-secondary font-mono uppercase font-semibold">Код купона</p>
                    <p className="text-base font-mono font-black tracking-widest text-app-primary uppercase">
                      {newPromoData.code || "YOURCODE"}
                    </p>
                  </div>
                  <div className="text-right text-[11px] font-mono space-y-0.5">
                    <p className="text-app-secondary font-medium">
                      Лимит: <span className="text-emerald-500 font-bold">{newPromoData.usageLimit || "100"}</span> раз
                    </p>
                    {newPromoData.minOrderAmount && Number(newPromoData.minOrderAmount) > 0 && (
                      <p className="text-amber-400 text-[10px] font-medium">От {newPromoData.minOrderAmount} ₽</p>
                    )}
                    {newPromoData.expiresAt && (
                      <p className="text-app-secondary text-[10px]">до {newPromoData.expiresAt}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Box */}
              {promoError && (
                <div className="flex items-center gap-2 text-xs text-rose-500 font-mono bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{promoError}</span>
                </div>
              )}

              {/* Form Controls */}
              <form onSubmit={handleCreatePromocode} noValidate className="space-y-2.5">
                {/* 1. Code Input & Generator (No dice emoji) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-semibold text-app-primary flex items-center justify-between">
                    <span>Код промокода *</span>
                    <button
                      type="button"
                      onClick={handleGenerateRandomCode}
                      className="text-[10px] text-app-secondary hover:text-app-primary flex items-center gap-1 cursor-pointer transition-colors font-medium"
                    >
                      <Dices size={12} className="text-app-secondary" />
                      <span>Сгенерировать</span>
                    </button>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPromoData.code}
                      onChange={(e) =>
                        setNewPromoData((p) => ({
                          ...p,
                          code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                        }))
                      }
                      placeholder="НАПР. SALE20, WELCOME10"
                      className="flex-1 bg-app-surface border border-app-border rounded-xl px-3 py-1.5 sm:py-2 text-xs text-app-primary focus:outline-none focus:border-app-primary/50 font-mono uppercase tracking-wider placeholder:text-app-muted"
                    />
                  </div>
                </div>

                {/* 2. Discount Type Tabs & Values */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-app-primary">Тип и размер скидки *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNewPromoData((p) => ({
                          ...p,
                          discountType: "percent",
                          discountPercent: p.discountPercent || "15",
                          discountAmount: "",
                        }))
                      }
                      className={`py-1.5 px-2.5 rounded-xl border text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeDiscountType === "percent"
                          ? "bg-app-accent text-app-accent-fg border-transparent font-bold shadow-2xs"
                          : "bg-app-surface border-app-border text-app-secondary hover:text-app-primary font-medium"
                      }`}
                    >
                      <Percent size={13} />
                      <span>Процентная (%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setNewPromoData((p) => ({
                          ...p,
                          discountType: "fixed",
                          discountAmount: p.discountAmount || "500",
                          discountPercent: "",
                        }))
                      }
                      className={`py-1.5 px-2.5 rounded-xl border text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeDiscountType === "fixed"
                          ? "bg-app-accent text-app-accent-fg border-transparent font-bold shadow-2xs"
                          : "bg-app-surface border-app-border text-app-secondary hover:text-app-primary font-medium"
                      }`}
                    >
                      <Coins size={13} />
                      <span>Фиксированная (₽)</span>
                    </button>
                  </div>

                  {/* Input value and Quick Chips */}
                  {activeDiscountType === "percent" ? (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={newPromoData.discountPercent}
                          onChange={(e) =>
                            setNewPromoData((p) => ({
                              ...p,
                              discountPercent: e.target.value,
                              discountAmount: "",
                            }))
                          }
                          placeholder="Процент скидки (1-100)"
                          className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-1.5 sm:py-2 text-xs text-app-primary focus:outline-none focus:border-app-primary/50 font-mono placeholder:text-app-muted"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-app-secondary font-medium">%</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {["5", "10", "15", "20", "25", "30", "50"].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() =>
                              setNewPromoData((p) => ({
                                ...p,
                                discountPercent: pct,
                                discountAmount: "",
                              }))
                            }
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                              newPromoData.discountPercent === pct
                                ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                                : "bg-app-surface border border-app-border text-app-secondary hover:text-app-primary font-medium"
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={newPromoData.discountAmount}
                          onChange={(e) =>
                            setNewPromoData((p) => ({
                              ...p,
                              discountAmount: e.target.value,
                              discountPercent: "",
                            }))
                          }
                          placeholder="Фиксированная скидка (в рублях)"
                          className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-1.5 sm:py-2 text-xs text-app-primary focus:outline-none focus:border-app-primary/50 font-mono placeholder:text-app-muted"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-app-secondary font-medium">₽</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {["100", "200", "300", "500", "1000", "2000"].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() =>
                              setNewPromoData((p) => ({
                                ...p,
                                discountAmount: amt,
                                discountPercent: "",
                              }))
                            }
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                              newPromoData.discountAmount === amt
                                ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                                : "bg-app-surface border border-app-border text-app-secondary hover:text-app-primary font-medium"
                            }`}
                          >
                            {amt} ₽
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Advanced Parameters (Min Order, Usage Limit) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono font-semibold text-app-primary">Мин. сумма заказа (₽)</label>
                    <input
                      type="number"
                      min="0"
                      value={newPromoData.minOrderAmount || ""}
                      onChange={(e) => setNewPromoData((p) => ({ ...p, minOrderAmount: e.target.value }))}
                      placeholder="0 = без ограничений"
                      className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-1.5 sm:py-2 text-xs text-app-primary focus:outline-none focus:border-app-primary/50 font-mono placeholder:text-app-muted"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono font-semibold text-app-primary">Лимит активаций</label>
                    <input
                      type="number"
                      min="1"
                      value={newPromoData.usageLimit}
                      onChange={(e) => setNewPromoData((p) => ({ ...p, usageLimit: e.target.value }))}
                      placeholder="Напр. 100"
                      className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-1.5 sm:py-2 text-xs text-app-primary focus:outline-none focus:border-app-primary/50 font-mono placeholder:text-app-muted"
                    />
                  </div>
                </div>

                {/* 4. Expiry Date with Custom Date Picker & Quick buttons */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-semibold text-app-primary flex items-center justify-between">
                    <span>Срок действия</span>
                    <span className="text-[10px] text-app-secondary font-normal">Оставьте пустым для бессрочного</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-1.5 items-stretch sm:items-center">
                    <div className="flex-1">
                      <CustomDatePicker
                        value={newPromoData.expiresAt || ""}
                        onChange={(val) => setNewPromoData((p) => ({ ...p, expiresAt: val }))}
                        placeholder="дд.мм.гггг (бессрочно)"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpiryDays(null)}
                        className={`px-2.5 py-1.5 sm:py-2 rounded-xl border text-[10px] font-mono transition-colors cursor-pointer ${
                          !newPromoData.expiresAt
                            ? "bg-app-accent text-app-accent-fg border-transparent font-bold shadow-2xs"
                            : "bg-app-surface border-app-border text-app-secondary hover:text-app-primary font-medium"
                        }`}
                      >
                        Бессрочно
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpiryDays(7)}
                        className="px-2.5 py-1.5 sm:py-2 rounded-xl bg-app-surface border border-app-border text-[10px] font-mono text-app-secondary hover:text-app-primary font-medium cursor-pointer transition-colors"
                      >
                        +7 дн
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpiryDays(30)}
                        className="px-2.5 py-1.5 sm:py-2 rounded-xl bg-app-surface border border-app-border text-[10px] font-mono text-app-secondary hover:text-app-primary font-medium cursor-pointer transition-colors"
                      >
                        +30 дн
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-semibold text-app-primary">Заметка / Описание (для команды)</label>
                  <input
                    type="text"
                    value={newPromoData.description || ""}
                    onChange={(e) => setNewPromoData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Напр. Для рекламы в Telegram, скидка для блогера"
                    className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-1.5 sm:py-2 text-xs text-app-primary focus:outline-none focus:border-app-primary/50 placeholder:text-app-muted"
                  />
                </div>

                {/* 6. Submit & Cancel Buttons */}
                <div className="flex items-center gap-2.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingPromo(false);
                      setEditingPromoId?.(null);
                    }}
                    className="flex-1 py-2 sm:py-2.5 bg-app-surface border border-app-border hover:bg-app-hover text-app-primary font-mono text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-2 sm:py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all uppercase cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    {editingPromoId ? <Check size={14} /> : <Plus size={14} />}
                    <span>{editingPromoId ? "Сохранить изменения" : "Создать промокод"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
