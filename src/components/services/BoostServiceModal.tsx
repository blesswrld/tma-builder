import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  X,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wallet,
  Clock,
  Flame
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScrollLock } from "../../hooks/useScrollLock";

interface BoostServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceTitle: string;
  onSuccess?: () => void;
  onOpenDeposit?: () => void;
}

const BOOST_PLANS = [
  { days: 1, price: 99, label: "1 день в ТОПе", badge: "Экспресс" },
  { days: 7, price: 299, label: "7 дней в ТОПе", badge: "Популярный", isPopular: true },
  { days: 30, price: 799, label: "30 дней в ТОПе", badge: "Максимум выгоды", discount: "-40%" }
];

export const BoostServiceModal: React.FC<BoostServiceModalProps> = ({
  isOpen,
  onClose,
  serviceId,
  serviceTitle,
  onSuccess,
  onOpenDeposit
}) => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(BOOST_PLANS[1]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const currentBalance = user?.balance ?? 0;
  const hasEnoughFunds = currentBalance >= selectedPlan.price;

  const handleBoost = async () => {
    if (!hasEnoughFunds) {
      setErrorMsg(`Недостаточно средств на балансе. Требуется ${selectedPlan.price} ₽, на балансе ${currentBalance} ₽.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/services/${serviceId}/boost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ days: selectedPlan.days })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось поднять объявление");
      }

      setSuccessMsg(`Позиция успешно поднята в ТОП на ${selectedPlan.days} дн.!`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка при поднятии объявления");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="max-w-md w-full my-auto bg-app-surface border border-app-border rounded-3xl p-5 sm:p-6 text-app-primary space-y-4 sm:space-y-5 shadow-2xl animate-in zoom-in-95 duration-100 max-h-[92vh] overflow-y-auto relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-app-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-app-card border border-app-border flex items-center justify-center text-app-primary shrink-0">
              <Flame size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight">Поднять в ТОП / VIP</h2>
              <p className="text-[11px] text-app-muted truncate">{serviceTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-app-muted hover:text-app-primary rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Benefits list */}
        <div className="p-3 bg-app-card border border-app-border rounded-2xl text-xs space-y-1.5 text-app-secondary">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles size={14} className="shrink-0 text-app-primary" />
            <span>Приоритет в каталоге над всеми обычными позициями</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <TrendingUp size={14} className="shrink-0 text-app-primary" />
            <span>До 5 раз больше просмотров и заказов от покупателей</span>
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-2">
          {BOOST_PLANS.map((plan) => (
            <button
              key={plan.days}
              type="button"
              onClick={() => {
                setSelectedPlan(plan);
                setErrorMsg(null);
              }}
              className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                selectedPlan.days === plan.days
                  ? "bg-app-card border-app-border-focus ring-1 ring-app-border-focus text-app-primary shadow-xs"
                  : "bg-app-card hover:bg-app-hover border-app-border text-app-secondary"
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock size={16} className={selectedPlan.days === plan.days ? "text-app-primary" : "text-app-muted"} />
                <div className="text-left">
                  <div className="text-xs font-bold text-app-primary flex items-center gap-2">
                    <span>{plan.label}</span>
                    {plan.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-app-surface text-app-muted font-mono border border-app-border">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold font-mono text-app-primary">
                  {plan.price} ₽
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Balance status */}
        <div className="p-3 bg-app-card rounded-2xl border border-app-border flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-app-muted">
            <Wallet size={14} />
            <span>Баланс: {currentBalance.toLocaleString("ru-RU")} ₽</span>
          </div>
          {!hasEnoughFunds && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDeposit?.();
              }}
              className="text-app-primary hover:underline font-bold cursor-pointer"
            >
              Пополнить +
            </button>
          )}
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-app-card border border-app-border rounded-xl text-app-primary text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-app-primary" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleBoost}
          disabled={loading || Boolean(successMsg)}
          className="w-full py-3 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold rounded-2xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          <span>Активировать за {selectedPlan.price} ₽</span>
        </button>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
