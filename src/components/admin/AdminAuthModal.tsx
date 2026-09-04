import React, { FormEvent } from "react";
import {
  ShieldCheck,
  X,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Github,
  ExternalLink,
} from "lucide-react";
import { SpinnerLoader } from "../Skeleton";
import { useScrollLock } from "../../hooks/useScrollLock";

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authMode: "login" | "register" | "otp" | "reset";
  setAuthMode: (mode: "login" | "register" | "otp" | "reset") => void;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (pass: string) => void;
  authName: string;
  setAuthName: (name: string) => void;
  authOtpCode: string;
  setAuthOtpCode: (code: string) => void;
  authDevCode: string | null;
  otpStep: "email" | "code";
  setOtpStep: (step: "email" | "code") => void;
  resendTimer: number;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  authSuccessMsg: string | null;
  setAuthSuccessMsg: (msg: string | null) => void;
  isSubmittingAuth: boolean;
  handleAuthSubmit: (e: FormEvent) => void;
  handleSendOtpCode: (purpose: "LOGIN" | "REGISTER" | "RESET_PASSWORD") => void;
  handleVerifyOtpCode: (e: FormEvent) => void;
  onOpenPrivacy?: () => void;
}

export function AdminAuthModal({
  isOpen,
  onClose,
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authName,
  setAuthName,
  authOtpCode,
  setAuthOtpCode,
  authDevCode,
  otpStep,
  setOtpStep,
  resendTimer,
  authError,
  setAuthError,
  authSuccessMsg,
  setAuthSuccessMsg,
  isSubmittingAuth,
  handleAuthSubmit,
  handleSendOtpCode,
  handleVerifyOtpCode,
  onOpenPrivacy,
}: AdminAuthModalProps) {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-app-primary space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-app-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-app-muted" />
            <h3 className="text-sm font-semibold tracking-tight uppercase font-mono">
              {authMode === "otp" && "Вход по коду из E-mail"}
              {authMode === "login" && "Вход по паролю"}
              {authMode === "register" && "Регистрация аккаунта"}
              {authMode === "reset" && "Восстановление пароля"}
            </h3>
          </div>
          <button
            onClick={() => {
              onClose();
              setAuthError(null);
              setAuthSuccessMsg(null);
            }}
            className="text-app-muted hover:text-app-primary p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-app-card p-1 rounded-xl border border-app-border text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setAuthMode("otp");
              setOtpStep("email");
              setAuthError(null);
              setAuthSuccessMsg(null);
            }}
            className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 border cursor-pointer ${
              authMode === "otp"
                ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-sm"
                : "border-transparent text-app-muted hover:text-app-primary"
            }`}
          >
            <Mail size={12} />
            <span>E-mail код</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthError(null);
              setAuthSuccessMsg(null);
            }}
            className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 border cursor-pointer ${
              authMode === "login"
                ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-sm"
                : "border-transparent text-app-muted hover:text-app-primary"
            }`}
          >
            <Lock size={12} />
            <span>Пароль</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("register");
              setAuthError(null);
              setAuthSuccessMsg(null);
            }}
            className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 border cursor-pointer ${
              authMode === "register"
                ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-sm"
                : "border-transparent text-app-muted hover:text-app-primary"
            }`}
          >
            <User size={12} />
            <span>Создать</span>
          </button>
        </div>

        {authError && (
          <div className="p-3 bg-app-card border border-app-border rounded-xl flex items-center gap-2 text-app-primary text-xs font-mono">
            <AlertCircle size={15} className="shrink-0 text-app-muted" />
            <span>{authError}</span>
          </div>
        )}

        {authSuccessMsg && (
          <div className="p-3 bg-app-card border border-app-border rounded-xl flex items-center gap-2 text-app-primary text-xs font-mono">
            <CheckCircle2 size={15} className="shrink-0 text-app-primary" />
            <span>{authSuccessMsg}</span>
          </div>
        )}

        {/* OTP Code Step */}
        {otpStep === "code" ? (
          <form onSubmit={handleVerifyOtpCode} noValidate className="space-y-3 font-sans">
            <p className="text-xs text-app-muted">
              {authMode === "register" && (
                <>Код подтверждения отправлен на <strong className="text-app-primary">{authEmail}</strong> для завершения регистрации.</>
              )}
              {authMode === "reset" && (
                <>Код подтверждения отправлен на <strong className="text-app-primary">{authEmail}</strong> для сброса пароля.</>
              )}
              {authMode === "otp" && (
                <>Код отправлен на <strong className="text-app-primary">{authEmail}</strong>.</>
              )}
            </p>
            {authDevCode ? (
              <div className="p-3 bg-app-card border border-app-border rounded-xl text-app-primary text-xs space-y-2 font-mono">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-app-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-app-primary">
                      Тестовый режим отправки кода
                    </p>
                    <p className="text-[11px] text-app-muted mt-0.5">
                      Код сгенерирован для быстрой авторизации:
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-app-surface p-2 rounded-lg border border-app-border font-mono">
                  <span className="text-sm font-bold text-app-primary tracking-widest">{authDevCode}</span>
                  <button
                    type="button"
                    onClick={() => setAuthOtpCode(authDevCode)}
                    className="px-2.5 py-1 bg-app-card hover:bg-app-hover border border-app-border text-app-primary text-[10px] font-bold rounded transition-colors cursor-pointer"
                  >
                    Вставить код
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-app-card border border-app-border rounded-xl text-app-primary text-[11px] flex items-center gap-2 font-mono">
                <CheckCircle2 size={15} className="shrink-0 text-app-primary" />
                <span>Письмо успешно отправлено на {authEmail}. Проверьте папку «Входящие» или «Спам».</span>
              </div>
            )}
            <div>
              <label className="text-[11px] text-app-muted font-mono mb-1 block">6-значный код подтверждения</label>
              <input
                type="text"
                maxLength={6}
                autoComplete="one-time-code"
                value={authOtpCode}
                onChange={e => setAuthOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-3 text-center text-lg font-mono font-bold tracking-[8px] text-app-primary focus:outline-none focus:border-app-accent"
              />
            </div>
            {authMode === "reset" && (
              <div>
                <label className="text-[11px] text-app-muted font-mono mb-1 block">Новый пароль (не менее 6 символов)</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Новый пароль"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmittingAuth || authOtpCode.length !== 6 || (authMode === "reset" && authPassword.length < 6)}
              className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-opacity uppercase flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSubmittingAuth ? <SpinnerLoader size={14} /> : <ShieldCheck size={14} />}
              {isSubmittingAuth
                ? "Проверка..."
                : authMode === "register"
                ? "Подтвердить и зарегистрироваться"
                : authMode === "reset"
                ? "Сохранить новый пароль"
                : "Подтвердить и войти"}
            </button>
            <div className="flex justify-between items-center text-xs pt-1">
              <button
                type="button"
                disabled={resendTimer > 0 || isSubmittingAuth}
                onClick={() => handleSendOtpCode(authMode === "register" ? "REGISTER" : authMode === "reset" ? "RESET_PASSWORD" : "LOGIN")}
                className="text-app-muted hover:text-app-primary font-mono text-[11px] flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={12} className={isSubmittingAuth ? "animate-spin" : ""} />
                {resendTimer > 0 ? `Повтор через ${resendTimer}с` : "Отправить код повторно"}
              </button>
              <button
                type="button"
                onClick={() => { setOtpStep("email"); setAuthOtpCode(""); setAuthError(null); setAuthSuccessMsg(null); }}
                className="text-app-muted hover:text-app-primary font-mono text-[11px] underline cursor-pointer"
              >
                Изменить данные
              </button>
            </div>
          </form>
        ) : (
          /* Email / Credentials Forms Step */
          <>
            {authMode === "otp" && (
              <div className="space-y-3 font-sans">
                <p className="text-xs text-app-muted">
                  Вход по одноразовому коду из E-mail доступен только для существующих аккаунтов. Если вы еще не зарегистрированы, перейдите в «Создать».
                </p>
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                />
                <button
                  type="button"
                  disabled={isSubmittingAuth}
                  onClick={() => handleSendOtpCode("LOGIN")}
                  className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-opacity uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {isSubmittingAuth ? <SpinnerLoader size={14} /> : <Mail size={14} />}
                  {isSubmittingAuth ? "Отправка кода..." : "Получить код на E-mail"}
                </button>
              </div>
            )}
            {authMode !== "otp" && (
              <form onSubmit={handleAuthSubmit} noValidate className="space-y-3 font-sans">
                {authMode === "register" && (
                  <input
                    type="text"
                    autoComplete="name"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    placeholder="ФИО / Название организации"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none"
                  />
                )}
                <input
                  type="email"
                  autoComplete="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="Электронная почта"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none"
                />
                {authMode !== "reset" && (
                  <input
                    type="password"
                    autoComplete={authMode === "register" ? "new-password" : "current-password"}
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    placeholder="Пароль (мин. 6 символов)"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none"
                  />
                )}
                {authMode === "reset" && (
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    placeholder="Новый пароль (мин. 6 символов)"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none"
                  />
                )}
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:bg-zinc-200 uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingAuth && <SpinnerLoader size={14} />}
                  {isSubmittingAuth
                    ? "Отправка..."
                    : authMode === "login"
                    ? "Войти в аккаунт"
                    : authMode === "register"
                    ? "Зарегистрироваться"
                    : "Получить код сброса"}
                </button>
              </form>
            )}
          </>
        )}

        <div className="text-center pt-2 flex items-center justify-center gap-4 text-xs font-mono text-app-muted">
          {authMode === "login" && (
            <button
              type="button"
              onClick={() => { setAuthMode("reset"); setAuthError(null); setAuthSuccessMsg(null); }}
              className="hover:text-app-primary underline cursor-pointer"
            >
              Забыли пароль?
            </button>
          )}
          {authMode === "reset" && (
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccessMsg(null); }}
              className="hover:text-app-primary underline cursor-pointer"
            >
              Вернуться ко входу
            </button>
          )}
        </div>

        {onOpenPrivacy && (
          <div className="text-center pt-1 text-[11px] font-mono text-app-muted border-t border-app-border/60 space-y-2">
            <div>
              <span>Продолжая, вы соглашаетесь с </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrivacy();
                }}
                className="underline hover:text-app-primary text-app-secondary cursor-pointer transition-colors"
              >
                Политикой конфиденциальности
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-app-muted">
              <span>Developer:</span>
              <a
                href="https://github.com/blesswrld"
                target="_blank"
                rel="noopener noreferrer"
                className="text-app-secondary hover:text-app-primary inline-flex items-center gap-1 font-semibold underline underline-offset-2"
              >
                <Github size={11} />
                <span>@blesswrld</span>
                <ExternalLink size={9} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
