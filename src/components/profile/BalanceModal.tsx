import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  X,
  CreditCard,
  QrCode,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  History
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScrollLock } from "../../hooks/useScrollLock";
import { UserTransaction } from "../../types";

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdated?: (newBalance: number) => void;
}

export const BalanceModal: React.FC<BalanceModalProps> = ({
  isOpen,
  onClose,
  onBalanceUpdated
}) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<"SBP" | "CARD" | "STARS">("SBP");
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingHistory, setFetchingHistory] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const fetchBalanceData = async () => {
    setFetchingHistory(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/user/balance", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBalanceData();
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeposit = async () => {
    const finalAmount = customAmount ? parseInt(customAmount, 10) : depositAmount;
    if (isNaN(finalAmount) || finalAmount < 50) {
      setErrorMsg("Минимальная сумма пополнения — 50 ₽");
      return;
    }
    if (finalAmount > 100000) {
      setErrorMsg("Максимальная сумма пополнения — 100 000 ₽");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/user/balance/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: finalAmount,
          paymentMethod: selectedMethod
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось пополнить баланс");
      }

      setBalance(data.balance);
      setSuccessMsg(`Баланс успешно пополнен на ${finalAmount} ₽!`);
      onBalanceUpdated?.(data.balance);
      fetchBalanceData();
      setCustomAmount("");
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка пополнения");
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
        className="max-w-lg w-full my-auto bg-app-surface border border-app-border rounded-3xl p-5 sm:p-6 text-app-primary space-y-6 shadow-2xl animate-in zoom-in-95 duration-100 max-h-[92vh] overflow-y-auto relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-app-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-app-card border border-app-border flex items-center justify-center text-app-primary">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Личный баланс</h2>
              <p className="text-[11px] text-app-muted font-mono">
                Для оплаты поднятий в ТОП и VIP-размещения
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-app-muted hover:text-app-primary rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Balance Card */}
        <div className="p-5 rounded-2xl bg-app-card border border-app-border flex items-center justify-between">
          <div>
            <span className="text-xs text-app-muted font-mono uppercase">Текущий баланс</span>
            <div className="text-3xl font-extrabold font-mono text-app-primary mt-1">
              {balance.toLocaleString("ru-RU")} ₽
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-app-muted font-mono bg-app-surface border border-app-border px-2 py-1 rounded-lg">
              ID: {user?.id?.slice(0, 8) || "Гость"}
            </span>
          </div>
        </div>

        {/* Top-up Form */}
        <div className="space-y-4">
          <label className="block text-xs font-mono uppercase text-app-muted">
            Выберите сумму пополнения
          </label>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[150, 500, 1200, 2500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setDepositAmount(amt);
                  setCustomAmount("");
                }}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                  depositAmount === amt && !customAmount
                    ? "bg-app-accent text-app-accent-fg border-transparent shadow-xs"
                    : "bg-app-card hover:bg-app-hover border-app-border text-app-secondary hover:text-app-primary"
                }`}
              >
                {amt} ₽
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Или введите свою сумму (от 50 ₽)..."
              className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-border-focus font-mono"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-app-muted">
              ₽
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase text-app-muted">
              Способ оплаты
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod("SBP")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  selectedMethod === "SBP"
                    ? "bg-app-card border-app-border-focus ring-1 ring-app-border-focus text-app-primary shadow-xs"
                    : "bg-app-card hover:bg-app-hover border-app-border text-app-secondary"
                }`}
              >
                <QrCode size={18} />
                <span className="text-[11px] font-semibold">СБП</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("CARD")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  selectedMethod === "CARD"
                    ? "bg-app-card border-app-border-focus ring-1 ring-app-border-focus text-app-primary shadow-xs"
                    : "bg-app-card hover:bg-app-hover border-app-border text-app-secondary"
                }`}
              >
                <CreditCard size={18} />
                <span className="text-[11px] font-semibold">Карта</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("STARS")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  selectedMethod === "STARS"
                    ? "bg-app-card border-app-border-focus ring-1 ring-app-border-focus text-app-primary shadow-xs"
                    : "bg-app-card hover:bg-app-hover border-app-border text-app-secondary"
                }`}
              >
                <Sparkles size={18} />
                <span className="text-[11px] font-semibold">TG Stars</span>
              </button>
            </div>
          </div>

          {/* Feedback messages */}
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

          {/* Submit top up */}
          <button
            type="button"
            onClick={handleDeposit}
            disabled={loading}
            className="w-full py-3 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold rounded-2xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
            <span>
              Пополнить на {customAmount ? parseInt(customAmount, 10) || 0 : depositAmount} ₽
            </span>
          </button>
        </div>

        {/* Transaction History */}
        <div className="space-y-3 pt-3 border-t border-app-border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase text-app-muted flex items-center gap-1.5">
              <History size={13} />
              <span>История операций</span>
            </span>
            <span className="text-[11px] text-app-muted">{transactions.length} записей</span>
          </div>

          {fetchingHistory ? (
            <div className="py-4 text-center text-xs text-app-muted font-mono">
              Загрузка истории...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-6 text-center text-xs text-app-muted font-mono bg-app-card rounded-xl border border-dashed border-app-border">
              Операций пока нет
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 bg-app-card rounded-xl border border-app-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        tx.type === "DEPOSIT"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {tx.type === "DEPOSIT" ? (
                        <ArrowDownLeft size={14} />
                      ) : (
                        <ArrowUpRight size={14} />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-app-primary text-[11px] line-clamp-1">
                        {tx.description || (tx.type === "DEPOSIT" ? "Пополнение" : "Списание")}
                      </div>
                      <div className="text-[10px] text-app-muted font-mono">
                        {new Date(tx.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-mono font-bold ${
                      tx.type === "DEPOSIT" ? "text-emerald-400" : "text-app-secondary"
                    }`}
                  >
                    {tx.type === "DEPOSIT" ? "+" : "-"}
                    {tx.amount} ₽
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
