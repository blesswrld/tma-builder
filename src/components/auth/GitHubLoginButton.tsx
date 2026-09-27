import React, { useState } from "react";
import { Github, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface GitHubLoginButtonProps {
  onSuccess?: () => void;
  text?: string;
  className?: string;
  referralCode?: string;
  variant?: "primary" | "secondary" | "compact";
  mode?: "login" | "register" | "all";
}

export const GitHubLoginButton: React.FC<GitHubLoginButtonProps> = ({
  onSuccess,
  text,
  className = "",
  referralCode,
  mode = "all"
}) => {
  const { loginWithGitHub } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGitHubAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if OAuth URL is configured on the backend
      const res = await fetch("/api/auth/github/url");
      const data = await res.json();

      if (!data.isConfigured || !data.url) {
        setError("Авторизация через GitHub временно не настроена на сервере. Пожалуйста, используйте Telegram или E-mail.");
        return;
      }

      await loginWithGitHub(referralCode);
      onSuccess?.();
    } catch (err: any) {
      if (err.message && err.message.includes("закрыто")) {
        // User closed popup deliberately
      } else {
        setError(err.message || "Ошибка авторизации через GitHub OAuth.");
      }
    } finally {
      setLoading(false);
    }
  };

  const defaultText = mode === "register"
    ? "Регистрация через GitHub"
    : "Войти через GitHub";

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleGitHubAuth}
        disabled={loading}
        className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer select-none active:scale-[0.99] bg-app-card hover:bg-app-hover text-app-primary border border-app-border hover:border-app-border-focus shadow-2xs ${
          loading ? "opacity-70 cursor-wait" : ""
        } ${className}`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin text-app-primary" />
        ) : (
          <Github size={15} className="text-app-primary shrink-0" />
        )}
        <span className="truncate">{loading ? "Подключение к GitHub..." : (text || defaultText)}</span>
        <span className="text-[10px] text-app-muted bg-app-surface border border-app-border px-1.5 py-0.5 rounded-md font-mono ml-auto shrink-0">
          OAuth
        </span>
      </button>

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center gap-2 text-rose-400 text-[11px] font-mono">
          <AlertCircle size={14} className="shrink-0 text-rose-500" />
          <span className="leading-tight">{error}</span>
        </div>
      )}
    </div>
  );
};
