import React, { useState } from "react";
import { Github, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface GitHubLoginButtonProps {
  onSuccess?: () => void;
  text?: string;
  className?: string;
  referralCode?: string;
  variant?: "primary" | "secondary" | "compact";
}

export const GitHubLoginButton: React.FC<GitHubLoginButtonProps> = ({
  onSuccess,
  text = "Войти через GitHub",
  className = "",
  referralCode,
  variant = "primary"
}) => {
  const { loginWithGitHub } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGitHubAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if OAuth URL is configured
      const res = await fetch("/api/auth/github/url");
      const data = await res.json();

      if (!data.isConfigured || !data.url) {
        setError("GitHub OAuth временно не настроен администратором.");
        setLoading(false);
        return;
      }

      await loginWithGitHub(referralCode);
      onSuccess?.();
    } catch (err: any) {
      if (err.message && err.message.includes("закрыто")) {
        // User closed popup
      } else {
        setError(err.message || "Ошибка авторизации через GitHub");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleGitHubAuth}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-2xl font-mono text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer select-none active:scale-[0.99] ${
          variant === "primary"
            ? "bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700/80 hover:border-neutral-600 shadow-md hover:shadow-lg shadow-black/40"
            : "bg-neutral-950/80 hover:bg-neutral-900 text-neutral-200 border border-neutral-800 hover:border-neutral-700"
        } ${loading ? "opacity-70 cursor-wait" : ""} ${className}`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin text-emerald-400" />
        ) : (
          <Github size={16} className="text-white shrink-0" />
        )}
        <span>{loading ? "Подключение к GitHub..." : text}</span>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md font-mono ml-auto">
          OAuth
        </span>
      </button>

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center gap-2 text-rose-300 text-[11px] font-mono">
          <AlertCircle size={14} className="shrink-0 text-rose-400" />
          <span className="leading-tight">{error}</span>
        </div>
      )}
    </div>
  );
};
