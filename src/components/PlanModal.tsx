import React, { useState } from "react";
import { X, Check, Zap, Crown, Sparkles, CreditCard, QrCode, Ticket, Lock, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

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
  
  // Поля формы оплаты
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
      setError("Неверный или истекший промокод. Попробуйте START2026");
    }
  };

  const handleProcessPayment = async () => {
    if (!token) {
      setError("Сначала воспользуйтесь входом или регистрацией.");
      return;
    }

    if (!selectedPlan) return;

    setLoadingPlan(true);
    setError(null);

    // Симуляция задержки банковского эквайринга (1.5 сек)
    await new Promise(resolve => setTimeout(resolve, 1500));

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
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Ошибка при проведении платежа");
    } finally {
      setLoadingPlan(false);
    }
  };

  const price = selectedPlan ? getPlanPrice(selectedPlan) : 0;
  const finalPrice = promoApplied ? 0 : price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Шапка модалки */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            {selectedPlan ? (
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white mr-1"
                title="Назад к выбору тарифа"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/15 text-amber-400">
                <Crown size={22} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {selectedPlan ? `Оформление подписки ${selectedPlan}` : "Тарифные планы и монетизация"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30 uppercase tracking-wider">
                  {selectedPlan ? "Эквайринг" : "SaaS Ready"}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {selectedPlan
                  ? "Оплата и безопасная активация профессионального тарифа"
                  : "Выберите подходящий тариф для расширения возможностей заведений"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedPlan(null);
              onClose();
            }}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Контент модалки */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Если происходит успешная оплата */}
          {successPaid ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Оплата успешно проведена!</h3>
                <p className="text-xs text-slate-500 mt-1">Ваш новый тариф <strong>{successPaid}</strong> активирован на 30 дней.</p>
              </div>
            </div>
          ) : selectedPlan ? (
            /* ЭКРАН ЭКВАЙРИНГА / ОПЛАТЫ */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
              {/* Поле выбора способа и ввода реквизитов */}
              <div className="md:col-span-3 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">1. Выберите способ оплаты</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all ${
                        paymentMethod === "card"
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <CreditCard size={20} className={paymentMethod === "card" ? "text-indigo-600" : "text-slate-400"} />
                      <span className="text-[11px]">Карта Мир / Visa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("sbp")}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all ${
                        paymentMethod === "sbp"
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <QrCode size={20} className={paymentMethod === "sbp" ? "text-indigo-600" : "text-slate-400"} />
                      <span className="text-[11px]">СБП (QR-код)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("promo")}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all ${
                        paymentMethod === "promo"
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <Ticket size={20} className={paymentMethod === "promo" ? "text-indigo-600" : "text-slate-400"} />
                      <span className="text-[11px]">Промокод</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === "card" && (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Номер карты</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Срок действия</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">CVC / CVC2</label>
                        <input
                          type="password"
                          maxLength={3}
                          value={cardCvc}
                          onChange={e => setCardCvc(e.target.value)}
                          placeholder="***"
                          className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 block pt-1">
                      🔒 Тестовый режим: данные защищены SSL 256-bit
                    </span>
                  </div>
                )}

                {paymentMethod === "sbp" && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
                    <p className="text-xs text-slate-600 font-medium">Отсканируйте QR-код в приложении вашего банка</p>
                    <div className="w-32 h-32 bg-white p-2 rounded-xl border border-slate-200 mx-auto flex items-center justify-center">
                      <QrCode size={100} className="text-slate-800" />
                    </div>
                    <p className="text-[10px] text-slate-400">Нажмите кнопку «Подтвердить оплату» после сканирования</p>
                  </div>
                )}

                {paymentMethod === "promo" && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <label className="block text-[11px] font-bold text-slate-600">Ввести промокод на скидку 100%</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value)}
                        placeholder="Например: START2026"
                        className="flex-1 px-3.5 py-2 text-xs font-mono uppercase rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-600"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Применить
                      </button>
                    </div>
                    {promoApplied && (
                      <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <Check size={14} /> Промокод активирован! Скидка 100%
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Правая колонка: Итоговый чек и кнопка оплаты */}
              <div className="md:col-span-2 bg-slate-900 text-white p-5 rounded-3xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs text-slate-400 font-medium">Выбранный тариф:</span>
                    <span className="text-xs font-black text-amber-400">{selectedPlan}</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>Стоимость за 1 месяц:</span>
                      <span className="font-mono">{price.toLocaleString("ru-RU")} ₽</span>
                    </div>
                    {promoApplied && (
                      <div className="flex justify-between text-emerald-400 font-medium">
                        <span>Скидка по промокоду:</span>
                        <span className="font-mono">-{price.toLocaleString("ru-RU")} ₽</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-200">К оплате:</span>
                    <span className="text-2xl font-black text-white">{finalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    disabled={loadingPlan}
                    onClick={handleProcessPayment}
                    className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {loadingPlan ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Обработка платежа...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Оплатить {finalPrice.toLocaleString("ru-RU")} ₽</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center leading-tight">
                    Нажимая кнопку, вы подтверждаете согласие с условиями подписки.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* СЕТКА ТАРИФОВ (ВЫБОР) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
              {/* FREE TIER */}
              <div className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                currentPlan === "FREE" 
                  ? "border-slate-300 bg-slate-50/80 shadow-xs" 
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Старт</span>
                      <h3 className="text-lg font-bold text-slate-900">FREE</h3>
                    </div>
                    {currentPlan === "FREE" && (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-semibold rounded-md text-[10px]">
                        Текущий
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-2xl font-extrabold text-slate-900">0 ₽</span>
                    <span className="text-xs text-slate-500 font-medium"> / навсегда</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <Check size={15} className="text-emerald-500 shrink-0" />
                      <span><strong>1 заведение</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={15} className="text-emerald-500 shrink-0" />
                      <span>До <strong>15 услуг</strong> в каталоге</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={15} className="text-emerald-500 shrink-0" />
                      <span>Онлайн-заказы клиентов</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-400 line-through">
                      <span>Экспорт в CSV / Excel</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-400 line-through">
                      <span>QR-код и печатный набор</span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled={currentPlan === "FREE"}
                  onClick={() => setSelectedPlan("FREE")}
                  className="w-full mt-6 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-semibold text-xs rounded-xl transition-colors"
                >
                  {currentPlan === "FREE" ? "Ваш текущий тариф" : "Перейти на FREE"}
                </button>
              </div>

              {/* PRO TIER */}
              <div className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between relative bg-linear-to-b from-indigo-50/40 via-white to-white ${
                currentPlan === "PRO" 
                  ? "border-indigo-600 shadow-md ring-2 ring-indigo-100" 
                  : "border-indigo-500 shadow-sm hover:border-indigo-600"
              }`}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                  Рекомендуемый
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start pt-1">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Бизнес</span>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1">
                        PRO <Sparkles size={16} className="text-amber-500 fill-amber-500" />
                      </h3>
                    </div>
                    {currentPlan === "PRO" && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-semibold rounded-md text-[10px]">
                        Активен
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-2xl font-extrabold text-slate-900">990 ₽</span>
                    <span className="text-xs text-slate-500 font-medium"> / месяц</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 border-t border-indigo-100 pt-4">
                    <li className="flex items-center gap-2 font-medium">
                      <Check size={15} className="text-indigo-600 shrink-0" />
                      <span>До <strong>5 заведений</strong></span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <Check size={15} className="text-indigo-600 shrink-0" />
                      <span>До <strong>100 услуг</strong> в заведении</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <Check size={15} className="text-indigo-600 shrink-0" />
                      <span><strong>Экспорт в CSV / Excel</strong></span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <Check size={15} className="text-indigo-600 shrink-0" />
                      <span><strong>QR-генератор и макеты столов</strong></span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <Check size={15} className="text-indigo-600 shrink-0" />
                      <span><strong>График работы и статус заведения</strong></span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled={currentPlan === "PRO"}
                  onClick={() => setSelectedPlan("PRO")}
                  className="w-full mt-6 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md active:scale-98"
                >
                  {currentPlan === "PRO" ? "Ваш текущий тариф" : "Оформить PRO (990 ₽)"}
                </button>
              </div>

              {/* ENTERPRISE TIER */}
              <div className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                currentPlan === "ENTERPRISE" 
                  ? "border-amber-400 bg-amber-50/30 shadow-md" 
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Сети и франшизы</span>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1">
                        ENTERPRISE <Zap size={16} className="text-amber-500 fill-amber-500" />
                      </h3>
                    </div>
                    {currentPlan === "ENTERPRISE" && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-semibold rounded-md text-[10px]">
                        Активен
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-2xl font-extrabold text-slate-900">2,990 ₽</span>
                    <span className="text-xs text-slate-500 font-medium"> / месяц</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2 font-semibold text-slate-900">
                      <Check size={15} className="text-amber-500 shrink-0" />
                      <span><strong>Безлимит заведений</strong></span>
                    </li>
                    <li className="flex items-center gap-2 font-semibold text-slate-900">
                      <Check size={15} className="text-amber-500 shrink-0" />
                      <span><strong>Безлимит услуг</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={15} className="text-amber-500 shrink-0" />
                      <span>Все функции тарифа PRO</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={15} className="text-amber-500 shrink-0" />
                      <span>Приоритетная поддержка 24/7</span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled={currentPlan === "ENTERPRISE"}
                  onClick={() => setSelectedPlan("ENTERPRISE")}
                  className="w-full mt-6 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors"
                >
                  {currentPlan === "ENTERPRISE" ? "Ваш текущий тариф" : "Оформить ENTERPRISE"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
