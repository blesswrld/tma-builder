import React, { useState } from "react";
import { Github, Loader2, AlertCircle, Sparkles, X } from "lucide-react";
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
  const { loginWithGitHub, fastLoginWithGitHub } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");

  const handleGitHubAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if OAuth URL is configured
      const res = await fetch("/api/auth/github/url");
      const data = await res.json();

      if (!data.isConfigured || !data.url) {
        // If OAuth not configured, open username prompt for fast login
        setLoading(false);
        setShowPrompt(true);
        return;
      }

      await loginWithGitHub(referralCode);
      onSuccess?.();
    } catch (err: any) {
      if (err.message && err.message.includes("закрыто")) {
        // User closed popup
      } else {
        // Offer fallback to username
        setShowPrompt(true);
        setError(err.message || "Ошибка авторизации через GitHub OAuth. Вы можете войти по логину:");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFastLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = githubUsername.trim().replace(/^@/, "");
    if (!clean) {
      setError("Укажите ваш логин GitHub (@username)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fastLoginWithGitHub(clean, referralCode);
      setShowPrompt(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Ошибка входа через GitHub");
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

      {showPrompt && (
        <form
          onSubmit={handleFastLoginSubmit}
          className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-3 shadow-md animate-in fade-in slide-in-from-top-1 duration-150 relative text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-app-primary font-mono">
              <Sparkles size={13} className="text-emerald-400" />
              <span>Вход и регистрация через GitHub</span>
            </div>
            <button
              type="button"
              onClick={() => { setShowPrompt(false); setError(null); }}
              className="text-app-muted hover:text-app-primary p-0.5 rounded-lg transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-[11px] text-app-muted font-sans leading-relaxed">
            Укажите ваш никнейм на GitHub. Профиль будет автоматически синхронизирован.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="github-username"
              className="flex-1 bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-border-focus font-mono"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !githubUsername.trim()}
              className="px-4 py-2 bg-app-accent hover:opacity-90 text-app-accent-fg rounded-xl text-xs font-mono font-semibold cursor-pointer transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Github size={12} />}
              <span>Продолжить</span>
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center gap-2 text-rose-400 text-[11px] font-mono">
          <AlertCircle size={14} className="shrink-0 text-rose-500" />
          <span className="leading-tight">{error}</span>
        </div>
      )}
    </div>
  );
};
