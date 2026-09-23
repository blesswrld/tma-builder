import React, { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { TelegramAuthModal } from "./TelegramAuthModal";
import { TelegramIcon } from "../icons/TelegramIcon";

interface TelegramLoginButtonProps {
  onSuccess?: () => void;
  text?: string;
  className?: string;
  referralCode?: string;
  variant?: "primary" | "secondary" | "compact";
  mode?: "login" | "register" | "all";
}

export const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
  onSuccess,
  text,
  className = "",
  referralCode,
  mode = "all"
}) => {
  const { loginWithTelegram } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isInsideTelegram = typeof window !== "undefined" && Boolean((window as any).Telegram?.WebApp?.initData);

  const handleTelegramAuth = async () => {
    setError(null);

    // If running directly inside Telegram WebApp, authorize instantly with initData
    if (isInsideTelegram) {
      setLoading(true);
      try {
        await loginWithTelegram(undefined, referralCode);
        onSuccess?.();
      } catch (err: any) {
        setError(err.message || "Ошибка авторизации через Telegram WebApp");
        setIsModalOpen(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    // In web browser: open full Telegram Auth modal with Phone, QR and Widget options
    setIsModalOpen(true);
  };

  const defaultText = isInsideTelegram
    ? "Войти через Telegram WebApp"
    : mode === "register"
    ? "Регистрация через Telegram"
    : "Войти через Telegram";

  return (
    <>
      <div className="w-full space-y-2">
        <button
          type="button"
          onClick={handleTelegramAuth}
          disabled={loading}
          className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer select-none active:scale-[0.99] bg-app-card hover:bg-app-hover text-app-primary border border-app-border hover:border-app-border-focus shadow-2xs ${
            loading ? "opacity-70 cursor-wait" : ""
          } ${className}`}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin text-app-primary" />
          ) : (
            <TelegramIcon size={18} className="shrink-0" />
          )}
          <span className="truncate">{loading ? "Подключение к Telegram..." : (text || defaultText)}</span>
          <span className="text-[10px] text-app-muted bg-app-surface border border-app-border px-1.5 py-0.5 rounded-md font-mono ml-auto shrink-0 flex items-center gap-1">
            <Sparkles size={10} className="text-[#229ED9]" />
            <span>{isInsideTelegram ? "WebApp" : "TG Auth"}</span>
          </span>
        </button>

        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center gap-2 text-rose-400 text-[11px] font-mono">
            <span className="leading-tight">{error}</span>
          </div>
        )}
      </div>

      <TelegramAuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        referralCode={referralCode}
        onSuccess={() => {
          setIsModalOpen(false);
          onSuccess?.();
        }}
      />
    </>
  );
};
