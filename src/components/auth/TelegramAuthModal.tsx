import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  X,
  Phone,
  QrCode,
  ArrowRight,
  RotateCcw,
  Smartphone,
  ShieldCheck,
  KeyRound
} from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "../../context/AuthContext";
import { useScrollLock } from "../../hooks/useScrollLock";
import { TelegramIcon } from "../icons/TelegramIcon";

interface TelegramAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  referralCode?: string;
}

export const TelegramAuthModal: React.FC<TelegramAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  referralCode
}) => {
  const {
    loginWithTelegram,
    loginWithTelegramWidget,
    createTelegramSession,
    pollTelegramSession,
    sendTelegramCode,
    verifyTelegramCode
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"phone" | "qr" | "widget">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Phone / Code flow state
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string>("tma_app_builder_bot");
  const [resendTimer, setResendTimer] = useState<number>(0);

  // QR / Instant Session flow state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [isQrWaiting, setIsQrWaiting] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  // Widget container ref
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  // Fetch bot info on mount
  useEffect(() => {
    fetch("/api/auth/telegram/bot-info")
      .then((res) => res.json())
      .then((data) => {
        if (data.botUsername) {
          setBotUsername(data.botUsername.replace(/^@/, ""));
        }
      })
      .catch(() => {});
  }, []);

  // Timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Handle QR Session polling
  useEffect(() => {
    if (!isOpen || activeTab !== "qr") {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    let isMounted = true;

    const startQrFlow = async () => {
      setLoading(true);
      setError(null);
      try {
        const session = await createTelegramSession({ referralCode });
        if (!isMounted) return;

        setQrSessionId(session.sessionId);
        setDeepLinkUrl(session.deepLink);
        setBotUsername(session.botUsername);
        setIsQrWaiting(true);

        // Generate QR code data URL
        const dataUrl = await QRCode.toDataURL(session.deepLink, {
          width: 240,
          margin: 1.5,
          color: {
            dark: "#000000",
            light: "#ffffff"
          }
        });
        if (isMounted) setQrDataUrl(dataUrl);

        // Start polling session status
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(async () => {
          try {
            const statusRes = await pollTelegramSession(session.sessionId);
            if (statusRes.status === "CONFIRMED") {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setIsQrWaiting(false);
              setSuccessMsg("Вход успешно подтвержден!");
              setTimeout(() => {
                onSuccess?.();
                onClose();
              }, 700);
            } else if (statusRes.status === "EXPIRED" || statusRes.status === "CANCELLED") {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setIsQrWaiting(false);
              setError("Сессия истекла или была отменена. Попробуйте снова.");
            }
          } catch {}
        }, 1500);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Не удалось создать сессию входа");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    startQrFlow();

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, activeTab, createTelegramSession, pollTelegramSession, referralCode, onSuccess, onClose]);

  // Handle Telegram Login Widget mount
  useEffect(() => {
    if (!isOpen || activeTab !== "widget" || !widgetContainerRef.current) return;

    // Define global callback
    (window as any).onTelegramAuthModalCallback = async (user: any) => {
      setLoading(true);
      setError(null);
      try {
        await loginWithTelegramWidget(user, referralCode);
        setSuccessMsg("Авторизация успешна!");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 600);
      } catch (err: any) {
        setError(err.message || "Ошибка авторизации через виджет");
      } finally {
        setLoading(false);
      }
    };

    const container = widgetContainerRef.current;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuthModalCallback(user)");
    script.async = true;

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [isOpen, activeTab, botUsername, loginWithTelegramWidget, referralCode, onSuccess, onClose]);

  // Poll session while waiting on code screen (if user clicks "Confirm in Bot", auto-login)
  useEffect(() => {
    if (!isOpen || activeTab !== "phone" || phoneStep !== "code" || !activeSessionId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await pollTelegramSession(activeSessionId);
        if (res.status === "CONFIRMED" && isMounted) {
          clearInterval(interval);
          setSuccessMsg("Вход успешно подтвержден через Telegram!");
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 600);
        }
      } catch {}
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, activeTab, phoneStep, activeSessionId, pollTelegramSession, onSuccess, onClose]);

  if (!isOpen) return null;

  // Format phone number as typing
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Allow digits, spaces, plus, minus, parens
    setPhoneNumber(val);
  };

  // Submit Phone to receive code in Telegram
  const handleSendCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, "").trim();
    if (!cleanPhone || cleanPhone.length < 5) {
      setError("Укажите корректный номер телефона");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await sendTelegramCode({
        phone: cleanPhone,
        referralCode
      });

      setActiveSessionId(res.sessionId || null);
      if (res.botUrl) setBotUrl(res.botUrl);
      if (res.botUsername) setBotUsername(res.botUsername);

      setPhoneStep("code");
      setResendTimer(60);
      setSuccessMsg(res.message || "Код подтверждения подготовлен");
    } catch (err: any) {
      setError(err.message || "Не удалось отправить код подтверждения");
    } finally {
      setLoading(false);
    }
  };

  // Submit 6-digit code
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length < 4) {
      setError("Введите проверочный код");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyTelegramCode({
        phone: phoneNumber.replace(/[^\d+]/g, "").trim(),
        code: cleanCode,
        sessionId: activeSessionId || undefined,
        referralCode
      });

      setSuccessMsg("Вход успешно выполнен!");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Неверный код подтверждения");
    } finally {
      setLoading(false);
    }
  };

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

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-5 sm:p-6 text-app-primary space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100 relative z-[10001]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center">
              <TelegramIcon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-app-primary">
                Авторизация через Telegram
              </h3>
              <p className="text-[11px] text-app-muted font-sans">
                Вход и моментальная регистрация аккаунта
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-app-muted hover:text-app-primary p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-app-card p-1 rounded-xl border border-app-border text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setActiveTab("phone");
              setError(null);
            }}
            className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 border cursor-pointer ${
              activeTab === "phone"
                ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-xs"
                : "border-transparent text-app-muted hover:text-app-primary"
            }`}
          >
            <Phone size={12} />
            <span>По номеру</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("qr");
              setError(null);
            }}
            className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 border cursor-pointer ${
              activeTab === "qr"
                ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-xs"
                : "border-transparent text-app-muted hover:text-app-primary"
            }`}
          >
            <QrCode size={12} />
            <span>В 1 клик / QR</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("widget");
              setError(null);
            }}
            className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 border cursor-pointer ${
              activeTab === "widget"
                ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-xs"
                : "border-transparent text-app-muted hover:text-app-primary"
            }`}
          >
            <Smartphone size={12} />
            <span>Виджет TG</span>
          </button>
        </div>

        {/* Errors & Success */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: PHONE NUMBER & OTP IN TELEGRAM */}
        {activeTab === "phone" && (
          <div className="space-y-4">
            {phoneStep === "phone" ? (
              <form onSubmit={handleSendCodeSubmit} className="space-y-3.5 text-left">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-app-muted flex items-center gap-1.5">
                    <Phone size={12} />
                    <span>Номер телефона или Telegram:</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="+7 (999) 000-00-00"
                      className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-border-focus font-mono"
                      autoFocus
                      required
                    />
                  </div>
                  <p className="text-[11px] text-app-muted font-sans pt-1 leading-relaxed">
                    Введите номер телефона, привязанный к вашему Telegram. Мы отправим одноразовый код для подтверждения входа.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1f8fc4] text-white shadow-xs transition-all cursor-pointer select-none active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <TelegramIcon size={16} />
                      <span>Получить код в Telegram</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCodeSubmit} className="space-y-4 text-left">
                <div className="p-3 bg-app-card border border-app-border rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-app-muted">Номер:</span>
                    <span className="font-bold text-app-primary">{phoneNumber}</span>
                  </div>
                  
                  {botUrl && (
                    <a
                      href={botUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-3 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border border-[#229ED9]/30 rounded-xl text-xs font-mono text-[#229ED9] flex items-center justify-center gap-2 transition-all cursor-pointer font-bold"
                    >
                      <TelegramIcon size={16} />
                      <span>Открыть бота @{botUsername}</span>
                      <ExternalLink size={12} className="opacity-70" />
                    </a>
                  )}

                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneStep("phone");
                        setVerificationCode("");
                        setError(null);
                      }}
                      className="text-[11px] text-[#229ED9] hover:underline flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <RotateCcw size={11} />
                      <span>Изменить номер</span>
                    </button>
                    <span className="text-[10px] text-app-muted font-mono">
                      Вход в 1 клик или по коду
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-app-muted flex items-center gap-1.5">
                    <KeyRound size={12} />
                    <span>6-значный код подтверждения из Telegram:</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold bg-app-card border border-app-border rounded-xl py-2 text-app-primary focus:outline-none focus:border-app-border-focus"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 4}
                  className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1f8fc4] text-white shadow-xs transition-all cursor-pointer select-none active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Подтвердить и войти</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  {resendTimer > 0 ? (
                    <span className="text-[11px] font-mono text-app-muted">
                      Повторный запрос кода через {resendTimer} сек
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCodeSubmit}
                      disabled={loading}
                      className="text-[11px] font-mono text-app-muted hover:text-app-primary underline cursor-pointer"
                    >
                      Отправить код повторно
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: INSTANT 1-CLICK BOT CONFIRM / QR CODE */}
        {activeTab === "qr" && (
          <div className="space-y-3.5 text-center">
            <p className="text-[11px] text-app-muted font-sans leading-relaxed">
              Отсканируйте QR-код камерой телефона или нажмите кнопку ниже, чтобы подтвердить вход в Telegram-боте в 1 клик.
            </p>

            <div className="flex justify-center py-1">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-app-border relative inline-block">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Telegram Login QR"
                    className="w-48 h-48 block rounded-lg select-none"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-zinc-400" />
                  </div>
                )}
                {isQrWaiting && (
                  <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] rounded-2xl flex items-center justify-center pointer-events-none">
                    <div className="bg-black/80 text-white px-2.5 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Ожидание клика...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {deepLinkUrl && (
              <a
                href={deepLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1f8fc4] text-white shadow-xs transition-all cursor-pointer select-none active:scale-[0.99]"
              >
                <TelegramIcon size={18} />
                <span>Открыть Telegram и подтвердить</span>
                <ExternalLink size={13} className="ml-1 opacity-70" />
              </a>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-app-muted">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Безопасный вход без пароля через @{botUsername}</span>
            </div>
          </div>
        )}

        {/* TAB 3: OFFICIAL TELEGRAM WIDGET */}
        {activeTab === "widget" && (
          <div className="space-y-4 text-center py-2">
            <p className="text-[11px] text-app-muted font-sans leading-relaxed">
              Официальный Telegram Login Widget. Введите номер телефона в окне Telegram и подтвердите вход через официальный сервис.
            </p>

            <div className="flex justify-center items-center min-h-[50px] py-4">
              <div ref={widgetContainerRef} className="flex justify-center" />
            </div>

            <div className="p-3 bg-app-card border border-app-border rounded-xl text-left text-[11px] text-app-muted space-y-1 font-sans">
              <div className="font-bold text-app-primary flex items-center gap-1 font-mono">
                <Sparkles size={12} className="text-[#229ED9]" />
                <span>Как работает виджет:</span>
              </div>
              <p>1. Нажмите кнопку с логотипом Telegram.</p>
              <p>2. Введите свой номер телефона в защищённом окне Telegram.</p>
              <p>3. В приложение Telegram придёт запрос «Подтвердить авторизацию» — нажмите «Принять».</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
