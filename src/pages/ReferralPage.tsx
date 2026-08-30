import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Gift,
  Sun,
  Moon,
  Sparkles,
  LayoutDashboard,
  Shield
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { AdminReferralTab } from "../components/admin/AdminReferralTab";

export const ReferralPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-app-bg text-app-primary flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-app-card/80 backdrop-blur-md border-b border-app-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-app-bg hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary font-mono text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Панель управления</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 border-l border-app-border pl-3">
              <div className="w-8 h-8 rounded-xl bg-app-accent text-app-accent-fg flex items-center justify-center font-bold text-sm shadow-sm">
                <Gift size={16} />
              </div>
              <div>
                <h1 className="font-bold text-xs leading-none">Реферальная программа</h1>
                <p className="text-[10px] text-app-muted font-mono leading-tight mt-0.5">
                  Бесплатные тарифы PRO & ENTERPRISE
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-app-bg hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary transition-colors cursor-pointer"
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl transition-all hover:opacity-90 shadow-sm cursor-pointer"
            >
              <LayoutDashboard size={14} />
              <span className="hidden sm:inline">В кабинет</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {!user && !isLoading ? (
          <div className="max-w-md mx-auto my-12 p-8 bg-app-card border border-app-border rounded-2xl text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-app-primary/10 text-app-primary flex items-center justify-center mx-auto">
              <Gift size={24} />
            </div>
            <h2 className="text-lg font-bold text-app-primary">Требуется авторизация</h2>
            <p className="text-xs text-app-muted leading-relaxed">
              Чтобы получить вашу персональную реферальную ссылку и отслеживать приглашённых участников, войдите в аккаунт.
            </p>
            <button
              onClick={() => navigate("/admin")}
              className="w-full py-2.5 px-4 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl transition-all hover:opacity-90 cursor-pointer shadow-sm"
            >
              Войти или зарегистрироваться
            </button>
          </div>
        ) : (
          <AdminReferralTab />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-app-border py-6 text-center text-app-muted font-mono text-[11px]">
        TMA-Builder &copy; {new Date().getFullYear()} — Платформа создания Telegram Mini Apps
      </footer>
    </div>
  );
};
export default ReferralPage;
