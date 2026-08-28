import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Server,
  ArrowLeft,
  Sun,
  Moon,
  Shield,
  Users,
  Bug,
  Activity,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { AdminServersTab } from "../components/admin/AdminServersTab";

export const DeveloperServersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Toast state
  const [toast, setToast] = useState<{
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  const showToast = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setToast({ title, message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-primary flex flex-col font-sans transition-colors duration-200">
      {/* Developer Header Bar */}
      <header className="sticky top-0 z-40 bg-app-surface/90 backdrop-blur-md border-b border-app-border px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left: Brand & Back Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
              title="Вернуться в панель управления"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">В панель</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Server size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold font-mono text-app-primary">
                    Состояние серверов
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Live Telemetry
                  </span>
                </div>
                <p className="text-[11px] text-app-muted font-mono hidden sm:block">
                  PostgreSQL (Supabase) • Node.js Engine • WebSocket Hub
                </p>
              </div>
            </div>
          </div>

          {/* Right: Quick Dev Navigation & Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <Link
              to="/dev-users"
              className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-muted hover:text-app-primary transition-colors flex items-center gap-1.5"
            >
              <Users size={13} />
              <span className="hidden md:inline">Пользователи</span>
            </Link>

            <Link
              to="/dev-reports"
              className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-muted hover:text-app-primary transition-colors flex items-center gap-1.5"
            >
              <Bug size={13} />
              <span className="hidden md:inline">Репорты</span>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-all cursor-pointer"
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </button>

            {/* User info pill */}
            <div className="px-3 py-1.5 bg-app-card border border-app-border rounded-xl text-xs font-mono text-app-muted hidden lg:flex items-center gap-1.5">
              <Shield size={12} className="text-emerald-400" />
              <span className="truncate max-w-[160px]">{user?.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <AdminServersTab
          token={token}
          user={user}
          showToast={showToast}
        />
      </main>

      {/* Custom Toast System */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start gap-3 max-w-md bg-app-modal ${
            toast.type === "success"
              ? "border-emerald-500/40 text-app-primary"
              : toast.type === "error"
              ? "border-rose-500/40 text-app-primary"
              : "border-sky-500/40 text-app-primary"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />}
          {toast.type === "error" && <XCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />}
          {toast.type === "warning" && <AlertCircle size={18} className="text-app-muted shrink-0 mt-0.5" />}
          {toast.type === "info" && <Sparkles size={18} className="text-sky-500 shrink-0 mt-0.5" />}
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold font-mono text-app-primary">{toast.title}</h4>
            <p className="text-xs text-app-secondary font-sans">{toast.message}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
