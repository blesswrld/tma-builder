import React, { useState } from "react";
import { X, Check, Crown, CreditCard, QrCode, Ticket, ArrowLeft, CheckCircle2 } from "lucide-react";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  token: string | null;
  onPlanUpdated: (newPlan: string, expiresAt: string | null) => void;
}

export default function PlanModal({
  isOpen,
  onClose,
  currentPlan,
  token,
  onPlanUpdated
}: PlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "sbp" | "promo">("card");
  
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("777");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const [loadingPlan, setLoadingPlan] = useState(false);
  const [successPaid, setSuccessPaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getPlanPrice = (plan: string) => {
    if (plan === "PRO") return 990;
    if (plan === "ENTERPRISE") return 2990;
    return 0;
  };

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "START2026" || promoCode.trim().toUpperCase() === "DEMO100" || promoCode.trim().toUpperCase() === "VIP") {
      setPromoApplied(true);
      setError(null);
    } else {
      setError("Неверный промокод. Попробуйте START2026");
    }
  };

  const handleProcessPayment = async () => {
    if (!token) {
      setError("Для смены тарифа требуется авторизация.");
      return;
    }

    if (!selectedPlan) return;

    setLoadingPlan(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const res = await fetch("/api/user/upgrade-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan: selectedPlan })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось активировать подписку");
      }

      setSuccessPaid(selectedPlan);
      setTimeout(() => {
        onPlanUpdated(data.user.plan, data.user.subscriptionExpiresAt);
        setSelectedPlan(null);
        setSuccessPaid(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Ошибка при обработке платежа");
    } finally {
      setLoadingPlan(false);
    }
  };

  const price = selectedPlan ? getPlanPrice(selectedPlan) : 0;
  const finalPrice = promoApplied ? 0 : price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-hidden text-app-primary font-sans">
      <div className="bg-app-modal rounded-3xl max-w-4xl w-full border border-app-border flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-modal-header">
          <div className="flex items-center gap-3">
            {selectedPlan ? (
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-1.5 bg-app-card hover:bg-app-hover rounded-xl transition-colors text-app-secondary"
                title="Назад к тарифам"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="p-2 bg-app-accent text-zinc-950 rounded-xl">
                <Crown size={20} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight text-app-primary font-mono">
                  {selectedPlan ? `Подписка ${selectedPlan}` : "Тарифные планы SaaS"}
                </h2>
              </div>
              <p className="text-xs text-app-muted font-normal">
                {selectedPlan ? "Безопасная обработка платежа" : "Масштабируйте лимиты вашей сети заведений"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedPlan(null);
              onClose();
            }}
            className="p-1.5 text-app-muted hover:text-app-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-mono">
              {error}
            </div>
          )}

          {successPaid ? (
            <div className="py-12 text-center space-y-4 font-mono">
              <div className="w-14 h-14 bg-app-accent text-app-primary rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-app-primary">Тариф активирован</h3>
                <p className="text-xs text-app-muted mt-1">Тариф <strong className="text-app-primary">{successPaid}</strong> активен на 30 дней.</p>
              </div>
            </div>
          ) : selectedPlan ? (
            /* Checkout View */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
              <div className="md:col-span-3 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-semibold text-app-muted uppercase">Способ оплаты</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all font-mono ${
                        paymentMethod === "card"
                          ? "border-app-border bg-app-accent text-zinc-950 font-bold"
                          : "border-app-border bg-app-card text-app-secondary hover:text-app-primary"
                      }`}
                    >
                      <CreditCard size={18} />
                      <span className="text-[11px]">Карта</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("sbp")}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all font-mono ${
                        paymentMethod === "sbp"
                          ? "border-app-border bg-app-accent text-zinc-950 font-bold"
                          : "border-app-border bg-app-card text-app-secondary hover:text-app-primary"
                      }`}
                    >
                      <QrCode size={18} />
                      <span className="text-[11px]">СБП QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("promo")}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all font-mono ${
                        paymentMethod === "promo"
                          ? "border-app-border bg-app-accent text-zinc-950 font-bold"
                          : "border-app-border bg-app-card text-app-secondary hover:text-app-primary"
                      }`}
                    >
                      <Ticket size={18} />
                      <span className="text-[11px]">Промокод</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === "card" && (
                  <div className="space-y-3 bg-app-card p-4 rounded-2xl border border-app-border font-mono">
                    <div>
                      <label className="block text-[11px] text-app-muted mb-1">Номер карты</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-app-muted mb-1">Срок действия</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-app-muted mb-1">CVC</label>
                        <input
                          type="password"
                          maxLength={3}
                          value={cardCvc}
                          onChange={e => setCardCvc(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "promo" && (
                  <div className="p-4 bg-app-card rounded-2xl border border-app-border space-y-3 font-mono">
                    <label className="block text-[11px] text-app-muted">Промокод</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value)}
                        placeholder="START2026"
                        className="flex-1 px-3 py-2 text-xs uppercase rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-4 py-2 bg-app-accent text-zinc-950 font-bold text-xs rounded-xl hover:bg-app-hover transition-colors"
                      >
                        Применить
                      </button>
                    </div>
                    {promoApplied && (
                      <p className="text-xs text-emerald-500 font-mono flex items-center gap-1">
                        <Check size={14} /> Скидка 100% применена!
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="md:col-span-2 bg-app-card p-5 rounded-2xl border border-app-border space-y-4 flex flex-col justify-between font-mono">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-app-border pb-3">
                    <span className="text-xs text-app-muted">Тариф:</span>
                    <span className="text-sm font-bold text-app-primary">{selectedPlan}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-app-border pb-3">
                    <span className="text-xs text-app-muted">Период:</span>
                    <span className="text-xs text-app-secondary">1 месяц</span>
                  </div>

                  <div className="border-t border-app-border pt-3 flex justify-between items-baseline">
                    <span className="text-xs text-app-muted">Итого:</span>
                    <span className="text-2xl font-bold text-app-primary">{finalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>

                <button
                  disabled={loadingPlan}
                  onClick={handleProcessPayment}
                  className="w-full py-3 bg-app-accent hover:bg-app-hover text-zinc-950 font-bold text-xs rounded-xl transition-all uppercase tracking-wider"
                >
                  {loadingPlan ? "Обработка..." : `Оплатить ${finalPrice.toLocaleString("ru-RU")} ₽`}
                </button>
              </div>
            </div>
          ) : (
            /* Tariff Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
              {/* FREE */}
              <div className={`rounded-2xl p-5 border transition-all flex flex-col justify-between bg-app-card ${
                currentPlan === "FREE" ? "border-app-primary" : "border-app-border"
              }`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">Стартовый</span>
                      <h3 className="text-base font-bold text-app-primary font-mono">FREE</h3>
                    </div>
                  </div>

                  <div>
                    <span className="text-2xl font-bold text-app-primary font-mono">0 ₽</span>
                    <span className="text-xs text-app-muted font-mono"> / навсегда</span>
                  </div>

                  <ul className="space-y-2 text-xs text-app-secondary border-t border-app-border pt-4">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-app-primary shrink-0" />
                      <span><strong>1 витрина</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-app-primary shrink-0" />
                      <span>До 15 товаров</span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled={currentPlan === "FREE"}
                  onClick={() => setSelectedPlan("FREE")}
                  className="w-full mt-6 py-2.5 bg-app-secondary disabled:opacity-40 text-app-primary font-mono text-xs rounded-xl transition-colors"
                >
                  {currentPlan === "FREE" ? "Текущий тариф" : "Выбрать FREE"}
                </button>
              </div>

              {/* PRO */}
              <div className={`rounded-2xl p-5 border transition-all flex flex-col justify-between bg-app-card relative ${
                currentPlan === "PRO" ? "border-app-primary" : "border-app-border"
              }`}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-app-accent text-app-primary text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border border-app-border">
                  Популярный
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">Бизнес</span>
                    <h3 className="text-base font-bold text-app-primary font-mono">PRO</h3>
                  </div>

                  <div>
                    <span className="text-2xl font-bold text-app-primary font-mono">990 ₽</span>
                    <span className="text-xs text-app-muted font-mono"> / в месяц</span>
                  </div>

                  <ul className="space-y-2 text-xs text-app-secondary border-t border-app-border pt-4">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-app-primary shrink-0" />
                      <span>До <strong>5 витрин</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-app-primary shrink-0" />
                      <span>До 100 товаров</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-app-primary shrink-0" />
                      <span>Экспорт CSV и QR-конструктор столов</span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled={currentPlan === "PRO"}
                  onClick={() => setSelectedPlan("PRO")}
                  className="w-full mt-6 py-2.5 bg-app-accent text-zinc-950 font-mono font-bold text-xs rounded-xl hover:bg-app-hover transition-colors uppercase"
                >
                  {currentPlan === "PRO" ? "Текущий тариф" : "Перейти на PRO (990 ₽)"}
                </button>
              </div>

              {/* ENTERPRISE */}
              <div className={`rounded-2xl p-5 border transition-all flex flex-col justify-between bg-app-card ${
                currentPlan === "ENTERPRISE" ? "border-app-primary" : "border-app-border"
              }`}>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">Сеть</span>
                    <h3 className="text-base font-bold text-app-primary font-mono">ENTERPRISE</h3>
                  </div>

                  <div>
                    <span className="text-2xl font-bold text-app-primary font-mono">2,990 ₽</span>
                    <span className="text-xs text-app-muted font-mono"> / в месяц</span>
                  </div>

                  <ul className="space-y-2 text-xs text-app-secondary border-t border-app-border pt-4">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-app-primary shrink-0" />
                      <span><strong>Безлимитные витрины</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-app-primary shrink-0" />
                      <span>Безлимит товаров и VIP-поддержка</span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled={currentPlan === "ENTERPRISE"}
                  onClick={() => setSelectedPlan("ENTERPRISE")}
                  className="w-full mt-6 py-2.5 bg-app-secondary disabled:opacity-40 text-app-primary font-mono text-xs rounded-xl transition-colors"
                >
                  {currentPlan === "ENTERPRISE" ? "Текущий тариф" : "Выбрать ENTERPRISE"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
