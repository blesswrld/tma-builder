import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { 
  X, Check, Crown, CreditCard, QrCode, Ticket, ArrowLeft, 
  CheckCircle2, ExternalLink, ShieldCheck, RefreshCw, AlertCircle, Sparkles,
  Zap, Building2, Store, Users, ChevronDown, ChevronUp, Copy, Lock, Gift, Award,
  HelpCircle, Search
} from "lucide-react";
import { SpinnerLoader } from "./Skeleton";
import { useScrollLock } from "../hooks/useScrollLock";
import { useRealtimeEvent } from "../context/RealtimeContext";

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
  useScrollLock(isOpen);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "sbp" | "promo">("card");
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Promo Code
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  // Active Payment State
  const [activePayment, setActivePayment] = useState<{
    paymentId: string;
    yooPaymentId?: string;
    confirmationUrl?: string | null;
    qrUrl?: string | null;
    amount: number;
    isUniversalMode?: boolean;
  } | null>(null);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [successPaid, setSuccessPaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState("");

  const FAQ_ITEMS = [
    {
      question: "Какие ограничения действуют на бесплатном тарифе (FREE)?",
      answer: "Тариф FREE позволяет разместить 1 заведение и до 15 товаров в каталоге. Все базовые функции Telegram Mini App (корзина, заказы в Telegram, управление меню) доступны без ограничения по времени и абсолютно бесплатно."
    },
    {
      question: "Как происходит активация подписки после оплаты?",
      answer: "Активация вашего тарифа происходит автоматически в течение нескольких секунд сразу после подтверждения платежа банком или через СБП. Вся история и статус подписки сразу отображаются в вашей админ-панели."
    },
    {
      question: "Какая выгода при выборе годовой оплаты?",
      answer: "При переключении на годовой период подписки вы получаете автоматическую скидку 20% на тарифы PRO и ENTERPRISE. Доступ ко всем возможностям сохраняется на 365 дней с момента оплаты."
    },
    {
      question: "Как использовать промокод на 100% скидку?",
      answer: "Выберите желаемый план, нажмите «Оплатить», выберите способ оплаты «Промокод», введите ваш уникальный код и нажмите «Применить». При успешной валидации ваш план активируется мгновенно без списания средств."
    },
    {
      question: "Можно ли сменить тариф или отменить подписку?",
      answer: "Да, вы можете повысить тарифный план в любой момент. При переходе на более высокий тариф ваш подписочный период пересчитывается автоматически с сохранением всех данных витрины."
    },
    {
      question: "Насколько безопасны платежи и данные карт?",
      answer: "Все транзакции проводятся через сертифицированный шлюз ЮKassa и Систему Быстрых Платежей (СБП) с использованием протоколов шифрования SSL/TLS и технологии 3D-Secure. Мы не храним платёжные данные на наших серверах."
    }
  ];

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setActivePayment(null);
      setQrCodeDataUrl(null);
      setPromoApplied(null);
      setPromoCode("");
      setError(null);
      setSuccessPaid(null);
      setShowComparison(false);
      setCopiedLink(false);
      setOpenFaqIndex(null);
      setFaqSearch("");
    }
  }, [isOpen]);

  // Generate QR Code data url when qrUrl is present
  useEffect(() => {
    if (activePayment?.qrUrl) {
      QRCode.toDataURL(activePayment.qrUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        }
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error("Error generating SBP QR Code:", err));
    } else {
      setQrCodeDataUrl(null);
    }
  }, [activePayment?.qrUrl]);

  // Polling for payment status when a payment is active
  useEffect(() => {
    if (!activePayment?.paymentId || !token || successPaid) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/billing/payment-status/${activePayment.paymentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "SUCCEEDED") {
            clearInterval(interval);
            handlePaymentCompleted(data.plan, data.user?.subscriptionExpiresAt || null);
          }
        }
      } catch (err) {
        // silent polling catch
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activePayment?.paymentId, token, successPaid]);

  useRealtimeEvent(["PAYMENT_UPDATED", "USER_UPDATED", "PLAN_UPDATED"], (event) => {
    if (successPaid || !isOpen) return;
    if (event.type === "PAYMENT_UPDATED" && event.payload) {
      if (activePayment?.paymentId && (event.payload.paymentId === activePayment.paymentId || event.payload.id === activePayment.paymentId)) {
        if (event.payload.status === "SUCCEEDED") {
          handlePaymentCompleted(event.payload.plan || selectedPlan, event.payload.subscriptionExpiresAt || null);
        }
      }
    } else if (event.type === "PLAN_UPDATED" && event.payload?.plan) {
      handlePaymentCompleted(event.payload.plan, event.payload.subscriptionExpiresAt || null);
    }
  });

  if (!isOpen) return null;

  const getMonthlyPrice = (plan: string) => {
    if (plan === "PRO") return 990;
    if (plan === "ENTERPRISE") return 2990;
    return 0;
  };

  const getCalculatedPrice = (plan: string, cycle: "monthly" | "yearly") => {
    const baseMonthly = getMonthlyPrice(plan);
    if (baseMonthly === 0) return 0;
    if (cycle === "yearly") {
      // 20% discount for annual
      return Math.round(baseMonthly * 12 * 0.8);
    }
    return baseMonthly;
  };

  const handlePaymentCompleted = (planName: string, expiresAt: string | null) => {
    setSuccessPaid(planName);
    setActivePayment(null);
    setTimeout(() => {
      onPlanUpdated(planName, expiresAt);
      setSelectedPlan(null);
      setSuccessPaid(null);
      onClose();
    }, 1800);
  };

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const parts = raw.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(" ") : raw);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Format CVC
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 3));
  };

  // Check Promocode via Backend API
  const handleApplyPromo = async (codeToTest?: string) => {
    const code = (codeToTest || promoCode).trim();
    if (!code) {
      setError("Введите промокод.");
      return;
    }
    if (!token) {
      setError("Сначала авторизуйтесь.");
      return;
    }

    setPromoChecking(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/validate-promocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          plan: selectedPlan
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Неверный промокод");
      }

      setPromoApplied({
        code: data.code,
        discountPercent: data.discountPercent
      });
      setPromoCode(data.code);
      setError(null);
    } catch (err: any) {
      setPromoApplied(null);
      setError(err.message || "Ошибка проверки промокода");
    } finally {
      setPromoChecking(false);
    }
  };

  // Create payment or apply instant promo
  const handleProcessPayment = async () => {
    if (!token) {
      setError("Для смены тарифа требуется авторизация.");
      return;
    }

    if (!selectedPlan) return;

    if (paymentMethod === "card" && !promoApplied) {
      const cleanDigits = cardNumber.replace(/\s+/g, "");
      if (cleanDigits.length < 16) {
        setError("Пожалуйста, введите корректный 16-значный номер банковской карты.");
        return;
      }
      if (cardExpiry.length < 5) {
        setError("Укажите срок действия карты (ММ/ГГ).");
        return;
      }
      if (cardCvc.length < 3) {
        setError("Укажите 3-значный CVC-код карты.");
        return;
      }
    }

    setLoadingPlan(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle,
          paymentMethod,
          promocode: promoApplied?.code || (paymentMethod === "promo" ? promoCode.trim() : null),
          returnUrl: window.location.href
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось создать платёж");
      }

      // Если мгновенная активация (100% скидка или промокод)
      if (data.instantSuccess) {
        handlePaymentCompleted(data.user.plan, data.user.subscriptionExpiresAt);
        return;
      }

      // Активный платёж
      setActivePayment({
        paymentId: data.paymentId,
        yooPaymentId: data.yooPaymentId,
        confirmationUrl: data.confirmationUrl,
        qrUrl: data.qrUrl,
        amount: data.amount,
        isUniversalMode: data.isUniversalMode
      });

      if (paymentMethod === "card" && data.confirmationUrl && !data.isUniversalMode) {
        window.open(data.confirmationUrl, "_blank");
      }
    } catch (err: any) {
      setError(err.message || "Ошибка при обработке платежа");
    } finally {
      setLoadingPlan(false);
    }
  };

  // Manual Check / Confirmation button
  const handleManualConfirm = async () => {
    if (!activePayment?.paymentId || !token) return;
    setCheckingStatus(true);
    setError(null);

    try {
      const checkRes = await fetch(`/api/billing/payment-status/${activePayment.paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const checkData = await checkRes.json();

      if (checkData.status === "SUCCEEDED") {
        handlePaymentCompleted(checkData.plan, checkData.user?.subscriptionExpiresAt || null);
        return;
      }

      const confirmRes = await fetch("/api/billing/confirm-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paymentId: activePayment.paymentId })
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        throw new Error(confirmData.error || "Платеж ещё обрабатывается");
      }

      handlePaymentCompleted(confirmData.plan, confirmData.user?.subscriptionExpiresAt || null);
    } catch (err: any) {
      setError(err.message || "Оплата ещё не подтверждена банком. Попробуйте через несколько секунд.");
    } finally {
      setCheckingStatus(false);
    }
  };

  const copySbpLink = () => {
    if (activePayment?.qrUrl) {
      navigator.clipboard.writeText(activePayment.qrUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const basePrice = selectedPlan ? getCalculatedPrice(selectedPlan, billingCycle) : 0;
  const discountAmount = promoApplied ? Math.round(basePrice * (promoApplied.discountPercent / 100)) : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden text-app-primary font-sans transition-all">
      <div className="bg-app-modal rounded-3xl max-w-4xl w-full border border-app-border flex flex-col max-h-[92vh] shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-modal-header rounded-t-3xl">
          <div className="flex items-center gap-3">
            {selectedPlan ? (
              <button
                onClick={() => {
                  setSelectedPlan(null);
                  setActivePayment(null);
                  setError(null);
                }}
                className="p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl transition-all text-app-secondary hover:text-app-primary cursor-pointer flex items-center gap-1.5 text-xs font-mono font-medium"
                title="Назад к выбору тарифа"
              >
                <ArrowLeft size={16} />
                <span>Назад к тарифам</span>
              </button>
            ) : (
              <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 rounded-xl shadow-sm">
                <Crown size={22} className="animate-pulse" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-app-primary font-mono">
                  {selectedPlan ? `Оплата подписки: ${selectedPlan}` : "Тарифные планы SaaS"}
                </h2>
              </div>
              <p className="text-xs text-app-muted font-normal">
                {selectedPlan ? "Оплата через ЮKassa, банковские карты РФ или СБП QR" : "Расширьте возможности вашей сети заведений и меню в Telegram"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedPlan(null);
              onClose();
            }}
            className="p-2 text-app-muted hover:text-app-primary hover:bg-app-card rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-800 dark:text-rose-300 font-mono font-medium flex items-center gap-2.5 shadow-sm">
              <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successPaid ? (
            <div className="py-14 text-center space-y-4 font-mono">
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full flex items-center justify-center mx-auto shadow-xl ring-8 ring-emerald-500/20 animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-app-primary">Подписка успешно активирована!</h3>
                <p className="text-xs text-app-muted">
                  Ваш тариф <strong className="text-emerald-500 font-bold">{successPaid}</strong> активен. Приятного использования!
                </p>
              </div>
            </div>
          ) : activePayment ? (
            /* Active Payment Screen (Waiting for confirmation / SBP QR View) */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
              <div className="md:col-span-3 space-y-4 bg-app-card p-5 sm:p-6 rounded-2xl border border-app-border shadow-sm">
                {paymentMethod === "sbp" && qrCodeDataUrl ? (
                  <div className="text-center space-y-4 font-mono">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/20">
                      <QrCode size={16} />
                      <span>Отсканируйте в приложении любого банка РФ</span>
                    </div>

                    <div className="p-4 bg-white rounded-3xl border border-slate-200 inline-block shadow-lg mx-auto relative group">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR-код для оплаты через СБП" 
                        className="w-52 h-52 mx-auto"
                      />
                      <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center">
                        <span className="text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded-full font-bold">СБП НСПК</span>
                      </div>
                    </div>

                    <p className="text-xs text-app-secondary max-w-md mx-auto leading-relaxed">
                      Откройте мобильный банк (Сбер, Т-Банк, ВТБ, Альфа-Банк и др.) и отсканируйте этот QR-код для моментального перевода <strong>{activePayment.amount} ₽</strong>
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      {activePayment.qrUrl && (
                        <a
                          href={activePayment.qrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span>Оплатить в приложении банка</span>
                          <ExternalLink size={14} />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={copySbpLink}
                        className="px-3.5 py-2 bg-app-surface hover:bg-app-hover text-app-secondary font-medium text-xs rounded-xl border border-app-border transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Copy size={14} />
                        <span>{copiedLink ? "Ссылка скопирована!" : "Скопировать ссылку"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 font-mono">
                    <div className="flex items-center gap-3 p-4 bg-app-surface rounded-2xl border border-app-border">
                      <div className="p-3 bg-app-accent text-app-accent-fg rounded-xl">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-app-primary">Переход на 3D-Secure страницу банка</h4>
                        <p className="text-[11px] text-app-muted">Оплатите заказ на защищённом платёжном шлюзе</p>
                      </div>
                    </div>

                    {activePayment.confirmationUrl && (
                      <a
                        href={activePayment.confirmationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <span>Перейти к оплате картой на ЮKassa</span>
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-[11px] text-app-muted justify-center pt-3 border-t border-app-border/50">
                  <RefreshCw size={14} className="animate-spin text-emerald-500" />
                  <span>Автоматическая проверка статуса каждые 3 секунды...</span>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="md:col-span-2 bg-app-card p-5 sm:p-6 rounded-2xl border border-app-border space-y-5 flex flex-col justify-between font-mono shadow-sm">
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-app-primary uppercase tracking-wider border-b border-app-border pb-2">Детали платежа</h4>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-app-muted">Тариф:</span>
                    <span className="text-xs font-bold text-app-primary bg-app-surface px-2.5 py-1 rounded-lg border border-app-border">{selectedPlan}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-app-muted">Период:</span>
                    <span className="text-xs text-app-secondary">{billingCycle === "yearly" ? "1 год (365 дней)" : "1 месяц (30 дней)"}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-app-border/60 pt-3">
                    <span className="text-xs text-app-muted">К оплате:</span>
                    <span className="text-xl font-bold text-app-primary">{activePayment.amount} ₽</span>
                  </div>

                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <span>Безопасный эквайринг</span>
                    </div>
                    <p className="text-emerald-700/80 dark:text-emerald-400/80 leading-normal">
                      Подписка активируется сразу же после успешного получения ответа от банковского шлюза.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    disabled={checkingStatus}
                    onClick={handleManualConfirm}
                    className="w-full py-3 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold text-xs rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {checkingStatus ? <SpinnerLoader size={16} /> : <Check size={16} />}
                    <span>{checkingStatus ? "Проверка платежа..." : "Я оплатил"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePayment(null)}
                    className="w-full py-2.5 bg-app-surface hover:bg-app-hover text-app-secondary font-medium text-xs rounded-xl transition-all border border-app-border cursor-pointer"
                  >
                    Выбрать другой способ
                  </button>
                </div>
              </div>
            </div>
          ) : selectedPlan ? (
            /* Checkout View */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
              <div className="md:col-span-3 space-y-5">
                {/* Billing Cycle Info */}
                <div className="flex items-center justify-between p-3.5 bg-app-card rounded-2xl border border-app-border font-mono">
                  <span className="text-xs text-app-muted">Выбранный период:</span>
                  <span className="text-xs font-bold text-app-primary bg-app-surface px-3 py-1 rounded-xl border border-app-border">
                    {billingCycle === "yearly" ? "1 Год (Скидка 20%)" : "1 Месяц"}
                  </span>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-semibold text-app-muted uppercase tracking-wider">Способ оплаты</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all font-mono cursor-pointer relative ${
                        paymentMethod === "card"
                          ? "border-app-border bg-app-accent text-app-accent-fg font-bold shadow-md ring-2 ring-app-accent/20"
                          : "border-app-border bg-app-card text-app-secondary hover:text-app-primary hover:bg-app-hover"
                      }`}
                    >
                      <CreditCard size={20} />
                      <div>
                        <span className="text-xs block font-bold">Карта РФ</span>
                        <span className="text-[10px] opacity-80 font-normal">МИР / Visa / MC</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("sbp")}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all font-mono cursor-pointer relative ${
                        paymentMethod === "sbp"
                          ? "border-app-border bg-app-accent text-app-accent-fg font-bold shadow-md ring-2 ring-app-accent/20"
                          : "border-app-border bg-app-card text-app-secondary hover:text-app-primary hover:bg-app-hover"
                      }`}
                    >
                      <QrCode size={20} />
                      <div>
                        <span className="text-xs block font-bold">СБП QR</span>
                        <span className="text-[10px] opacity-80 font-normal">Без комиссии</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("promo")}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all font-mono cursor-pointer relative ${
                        paymentMethod === "promo"
                          ? "border-app-border bg-app-accent text-app-accent-fg font-bold shadow-md ring-2 ring-app-accent/20"
                          : "border-app-border bg-app-card text-app-secondary hover:text-app-primary hover:bg-app-hover"
                      }`}
                    >
                      <Ticket size={20} />
                      <div>
                        <span className="text-xs block font-bold">Промокод</span>
                        <span className="text-[10px] opacity-80 font-normal">100% скидка</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Card Payment Details & Visual Card Preview */}
                {paymentMethod === "card" && (
                  <div className="space-y-4 font-mono">
                    {/* Visual Card Graphic */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white border border-slate-700/80 shadow-xl relative overflow-hidden space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-6 bg-amber-400/90 rounded-md border border-amber-300/50 flex items-center justify-center">
                            <div className="w-4 h-3 border border-amber-600/60 rounded-[2px]" />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">BANK CARD</span>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-xs tracking-wider text-slate-300">
                          <span>МИР</span>
                        </div>
                      </div>

                      <div className="text-lg tracking-widest font-mono text-slate-100 font-bold">
                        {cardNumber ? cardNumber : "•••• •••• •••• ••••"}
                      </div>

                      <div className="flex justify-between items-end text-[10px] uppercase text-slate-400">
                        <div>
                          <span className="block text-[8px] text-slate-500">ВЛАДЕЛЕЦ КАРТЫ</span>
                          <span className="font-bold text-slate-200">VALUED CUSTOMER</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[8px] text-slate-500">СРОК</span>
                          <span className="font-bold text-slate-200">{cardExpiry ? cardExpiry : "MM/YY"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Form Inputs */}
                    <div className="space-y-3 bg-app-card p-4 rounded-2xl border border-app-border">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-bold text-app-primary">Реквизиты вашей карты</span>
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[10px] bg-app-surface px-1.5 py-0.5 rounded border border-app-border font-bold text-app-secondary">МИР</span>
                          <span className="text-[10px] bg-app-surface px-1.5 py-0.5 rounded border border-app-border font-bold text-app-secondary">VISA</span>
                          <span className="text-[10px] bg-app-surface px-1.5 py-0.5 rounded border border-app-border font-bold text-app-secondary">MC</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-app-muted mb-1 font-medium">Номер банковской карты</label>
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none tracking-wider font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-app-muted mb-1 font-medium">Срок действия</label>
                          <input
                            type="text"
                            placeholder="ММ/ГГ"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-app-muted mb-1 font-medium">CVC / CVV код</label>
                          <input
                            type="password"
                            maxLength={3}
                            placeholder="•••"
                            value={cardCvc}
                            onChange={handleCvcChange}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none tracking-widest font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-app-muted pt-1">
                        <Lock size={12} className="text-emerald-500 shrink-0" />
                        <span>Безопасная обработка через защищённый шлюз ЮKassa / Т-Банк</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SBP QR Details */}
                {paymentMethod === "sbp" && (
                  <div className="p-4 bg-app-card rounded-2xl border border-app-border space-y-3 font-mono">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                        <QrCode size={24} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-app-primary">Система быстрых платежей (СБП)</h4>
                        <p className="text-[11px] text-app-muted">Мгновенный перевод без ввода данных карты</p>
                      </div>
                    </div>
                    <ul className="text-xs text-app-secondary space-y-1.5 list-disc pl-4 leading-relaxed">
                      <li>Нажмите «Сгенерировать СБП QR» ниже.</li>
                      <li>Отсканируйте код в приложении любого банка РФ.</li>
                      <li>Подтвердите перевод — тариф активируется автоматически.</li>
                    </ul>
                  </div>
                )}

                {/* Promocode Details & Quick Chips */}
                {paymentMethod === "promo" && (
                  <div className="p-4 bg-app-card rounded-2xl border border-app-border space-y-3 font-mono">
                    <label className="block text-[11px] text-app-muted font-bold">Введение промокода</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Например: START2026"
                        className="flex-1 px-3.5 py-2.5 text-xs uppercase rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={promoChecking || !promoCode.trim()}
                        onClick={() => handleApplyPromo()}
                        className="px-4 py-2.5 bg-app-accent text-app-accent-fg font-bold text-xs rounded-xl hover:opacity-90 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {promoChecking ? <SpinnerLoader size={14} /> : <Sparkles size={14} />}
                        <span>Применить</span>
                      </button>
                    </div>

                    {/* Fast Promo Code Chips for instant testing */}
                    <div className="pt-2 border-t border-app-border/60">
                      <span className="text-[10px] text-app-muted block mb-1.5 font-semibold">Доступные промокоды для теста:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {["START2026", "VIP", "DEMO100"].map(code => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => handleApplyPromo(code)}
                            className="px-2.5 py-1 bg-app-surface hover:bg-app-hover border border-app-border rounded-lg text-[11px] font-bold text-app-primary transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Gift size={12} className="text-amber-500" />
                            <span>{code}</span>
                            <span className="text-[9px] text-emerald-500 font-mono font-normal">(-100%)</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {promoApplied && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-mono flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Check size={14} /> Промокод {promoApplied.code} применён!
                        </span>
                        <span className="font-bold">Скидка {promoApplied.discountPercent}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Summary Sidebar */}
              <div className="md:col-span-2 bg-app-card p-5 rounded-2xl border border-app-border space-y-4 flex flex-col justify-between font-mono shadow-sm">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-app-primary uppercase tracking-wider border-b border-app-border pb-2">Итог заказа</h4>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-app-muted">Тариф:</span>
                    <span className="text-xs font-bold text-app-primary bg-app-surface px-2.5 py-0.5 rounded border border-app-border">{selectedPlan}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-app-muted">Период подписки:</span>
                    <span className="text-xs text-app-secondary">{billingCycle === "yearly" ? "1 год (365 дней)" : "1 месяц (30 дней)"}</span>
                  </div>

                  {billingCycle === "yearly" && (
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                      <span className="text-xs">Годовая скидка (20%):</span>
                      <span className="text-xs font-bold">Включена</span>
                    </div>
                  )}

                  {promoApplied && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span className="text-xs">Промокод ({promoApplied.discountPercent}%):</span>
                      <span className="text-xs font-bold">-{discountAmount} ₽</span>
                    </div>
                  )}

                  <div className="border-t border-app-border pt-3 flex justify-between items-baseline">
                    <span className="text-xs text-app-muted font-bold">Итого к оплате:</span>
                    <span className="text-2xl font-bold text-app-primary">{finalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>

                <button
                  disabled={loadingPlan}
                  onClick={handleProcessPayment}
                  className="w-full py-3.5 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold text-xs rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {loadingPlan && <SpinnerLoader size={16} />}
                  <span>
                    {loadingPlan 
                      ? "Создание платежа..." 
                      : paymentMethod === "sbp"
                      ? "Сгенерировать СБП QR"
                      : paymentMethod === "promo" && finalPrice === 0
                      ? "Активировать бесплатно"
                      : `Оплатить ${finalPrice.toLocaleString("ru-RU")} ₽`}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Tariff Cards Grid & Billing Switcher */
            <div className="space-y-6">
              {/* Billing Cycle Switcher (Monthly / Yearly) */}
              <div className="flex flex-col sm:flex-row items-center justify-between bg-app-card p-2 sm:p-2.5 rounded-2xl border border-app-border gap-3">
                <div className="flex items-center gap-2 px-2">
                  <Award size={18} className="text-amber-500" />
                  <span className="text-xs font-mono font-medium text-app-secondary">Выберите период оплаты:</span>
                </div>

                <div className="flex items-center bg-app-surface p-1 rounded-xl border border-app-border w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      billingCycle === "monthly"
                        ? "bg-app-accent text-app-accent-fg shadow-sm"
                        : "text-app-muted hover:text-app-primary"
                    }`}
                  >
                    Оплата по месяцам
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("yearly")}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      billingCycle === "yearly"
                        ? "bg-app-accent text-app-accent-fg shadow-sm"
                        : "text-app-muted hover:text-app-primary"
                    }`}
                  >
                    <span>За 1 Год</span>
                    <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                      -20%
                    </span>
                  </button>
                </div>
              </div>

              {/* 3 Tariff Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
                {/* FREE */}
                <div className={`rounded-3xl p-6 border transition-all flex flex-col justify-between bg-app-card ${
                  currentPlan === "FREE" ? "border-app-primary ring-1 ring-app-primary/30" : "border-app-border hover:border-app-muted"
                }`}>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-app-muted uppercase tracking-wider bg-app-surface px-2.5 py-1 rounded-md border border-app-border">
                        Стартовый
                      </span>
                      <h3 className="text-lg font-bold text-app-primary font-mono mt-2.5">FREE</h3>
                    </div>

                    <div>
                      <span className="text-3xl font-bold text-app-primary font-mono">0 ₽</span>
                      <span className="text-xs text-app-muted font-mono"> / навсегда</span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-app-secondary border-t border-app-border/70 pt-4 font-sans">
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span><strong>1 заведение</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>До 15 товаров в каталоге</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>Базовое меню в Telegram</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    disabled={currentPlan === "FREE"}
                    onClick={() => setSelectedPlan("FREE")}
                    className="w-full mt-6 py-3 bg-app-surface hover:bg-app-hover disabled:opacity-40 text-app-primary font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer border border-app-border"
                  >
                    {currentPlan === "FREE" ? "Текущий тариф" : "Выбрать FREE"}
                  </button>
                </div>

                {/* PRO (Featured) */}
                <div className={`rounded-3xl p-6 border transition-all flex flex-col justify-between bg-app-card relative shadow-lg ${
                  currentPlan === "PRO" ? "border-amber-500 ring-2 ring-amber-500/40" : "border-app-border hover:border-amber-500/50"
                }`}>
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-[10px] font-mono font-bold px-3.5 py-1 rounded-full uppercase shadow-md flex items-center gap-1 border border-amber-300/40 whitespace-nowrap">
                    <Sparkles size={12} />
                    <span>Хит продаж — Выбор 85%</span>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                        Бизнес
                      </span>
                      <h3 className="text-lg font-bold text-app-primary font-mono mt-2.5">PRO</h3>
                    </div>

                    <div>
                      {billingCycle === "yearly" ? (
                        <div>
                          <span className="text-3xl font-bold text-app-primary font-mono">790 ₽</span>
                          <span className="text-xs text-app-muted font-mono"> / мес</span>
                          <span className="block text-[10px] text-emerald-500 font-mono font-bold">9 480 ₽ списывается за год</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-3xl font-bold text-app-primary font-mono">990 ₽</span>
                          <span className="text-xs text-app-muted font-mono"> / в месяц</span>
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2.5 text-xs text-app-secondary border-t border-app-border/70 pt-4 font-sans">
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>До <strong>5 заведений</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>До 100 товаров в меню</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>Генератор QR-кодов для столов</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>Экспорт заказов и отчетов в CSV</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    disabled={currentPlan === "PRO"}
                    onClick={() => setSelectedPlan("PRO")}
                    className="w-full mt-6 py-3 bg-app-accent hover:opacity-90 disabled:opacity-40 text-app-accent-fg font-mono text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    {currentPlan === "PRO" ? "Текущий тариф" : "Перейти на PRO"}
                  </button>
                </div>

                {/* ENTERPRISE */}
                <div className={`rounded-3xl p-6 border transition-all flex flex-col justify-between bg-app-card ${
                  currentPlan === "ENTERPRISE" ? "border-app-primary ring-1 ring-app-primary/30" : "border-app-border hover:border-app-muted"
                }`}>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-app-muted uppercase tracking-wider bg-app-surface px-2.5 py-1 rounded-md border border-app-border">
                        Сеть & Франшизы
                      </span>
                      <h3 className="text-lg font-bold text-app-primary font-mono mt-2.5">ENTERPRISE</h3>
                    </div>

                    <div>
                      {billingCycle === "yearly" ? (
                        <div>
                          <span className="text-3xl font-bold text-app-primary font-mono">2 390 ₽</span>
                          <span className="text-xs text-app-muted font-mono"> / мес</span>
                          <span className="block text-[10px] text-emerald-500 font-mono font-bold">28 680 ₽ списывается за год</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-3xl font-bold text-app-primary font-mono">2 990 ₽</span>
                          <span className="text-xs text-app-muted font-mono"> / в месяц</span>
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2.5 text-xs text-app-secondary border-t border-app-border/70 pt-4 font-sans">
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span><strong>Неограниченно</strong> заведений</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>Неограниченно товаров</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>Персональный VIP-менеджер 24/7</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>Индивидуальная кассовая выгрузка</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    disabled={currentPlan === "ENTERPRISE"}
                    onClick={() => setSelectedPlan("ENTERPRISE")}
                    className="w-full mt-6 py-3 bg-app-surface hover:bg-app-hover disabled:opacity-40 text-app-primary font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer border border-app-border"
                  >
                    {currentPlan === "ENTERPRISE" ? "Текущий тариф" : "Выбрать ENTERPRISE"}
                  </button>
                </div>
              </div>

              {/* Collapsible Feature Comparison Matrix */}
              <div className="pt-2 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setShowComparison(!showComparison)}
                  className="w-full py-2.5 text-xs font-mono font-semibold text-app-muted hover:text-app-primary transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{showComparison ? "Скрыть сравнение возможностей" : "Сравнить все тарифные возможности"}</span>
                  {showComparison ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showComparison && (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-app-border bg-app-card p-4">
                    <table className="w-full text-xs font-mono text-left">
                      <thead>
                        <tr className="border-b border-app-border text-app-muted">
                          <th className="py-2.5 px-3">Функция</th>
                          <th className="py-2.5 px-3 text-center">FREE</th>
                          <th className="py-2.5 px-3 text-center text-amber-500 font-bold">PRO</th>
                          <th className="py-2.5 px-3 text-center">ENTERPRISE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border/50 text-app-secondary">
                        <tr>
                          <td className="py-2.5 px-3 font-medium">Количество заведений</td>
                          <td className="py-2.5 px-3 text-center">1</td>
                          <td className="py-2.5 px-3 text-center font-bold">5</td>
                          <td className="py-2.5 px-3 text-center font-bold">Безлимит</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-medium">Позиций в каталоге</td>
                          <td className="py-2.5 px-3 text-center">15</td>
                          <td className="py-2.5 px-3 text-center font-bold">100</td>
                          <td className="py-2.5 px-3 text-center font-bold">Безлимит</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-medium">QR-коды для столов</td>
                          <td className="py-2.5 px-3 text-center text-rose-500">—</td>
                          <td className="py-2.5 px-3 text-center text-emerald-500 font-bold">✓</td>
                          <td className="py-2.5 px-3 text-center text-emerald-500 font-bold">✓</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-medium">CSV экспорт отчетов</td>
                          <td className="py-2.5 px-3 text-center text-rose-500">—</td>
                          <td className="py-2.5 px-3 text-center text-emerald-500 font-bold">✓</td>
                          <td className="py-2.5 px-3 text-center text-emerald-500 font-bold">✓</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-medium">Аналитика выручки</td>
                          <td className="py-2.5 px-3 text-center text-rose-500">—</td>
                          <td className="py-2.5 px-3 text-center text-emerald-500 font-bold">✓</td>
                          <td className="py-2.5 px-3 text-center text-emerald-500 font-bold">✓</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-medium">Техподдержка</td>
                          <td className="py-2.5 px-3 text-center">Стандартная</td>
                          <td className="py-2.5 px-3 text-center">Приоритетная</td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-500">24/7 VIP</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* FAQ Section inside PlanModal */}
              <div className="pt-6 border-t border-app-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-accent shrink-0">
                      <HelpCircle size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold font-mono text-app-primary">
                        Часто задаваемые вопросы (FAQ)
                      </h4>
                      <p className="text-[11px] text-app-muted font-sans">
                        Ограничения тарифов, безопасность и способы оплаты
                      </p>
                    </div>
                  </div>

                  <div className="relative w-full sm:w-52">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-app-muted" />
                    <input
                      type="text"
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                      placeholder="Поиск по FAQ..."
                      className="w-full bg-app-card border border-app-border rounded-xl pl-8 pr-2.5 py-1.5 text-[11px] font-mono text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {FAQ_ITEMS.filter(item => 
                    !faqSearch.trim() || 
                    item.question.toLowerCase().includes(faqSearch.toLowerCase()) || 
                    item.answer.toLowerCase().includes(faqSearch.toLowerCase())
                  ).map((item, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div 
                        key={idx}
                        className="bg-app-card/60 border border-app-border rounded-2xl overflow-hidden transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-mono font-medium text-app-primary hover:text-app-accent transition-colors cursor-pointer"
                        >
                          <span className="flex-1">{item.question}</span>
                          <span className={`p-1 rounded-lg bg-app-surface border border-app-border text-app-muted shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-app-primary" : ""}`}>
                            <ChevronDown size={14} />
                          </span>
                        </button>

                        {isOpen && (
                          <div className="px-3.5 pb-3.5 text-xs text-app-secondary font-sans leading-relaxed border-t border-app-border/40 pt-2.5">
                            <p className="text-app-muted">{item.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
