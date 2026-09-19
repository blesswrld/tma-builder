import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Search,
  X,
  Sun,
  Moon,
  Store,
  Compass,
  Heart,
  LayoutDashboard,
  PlusCircle,
  SlidersHorizontal,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface ExploreHeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  favoritesCount: number;
  onlyFavorites: boolean;
  onToggleOnlyFavorites: () => void;
  theme: string;
  onToggleTheme: () => void;
  totalShops: number;
  openCount: number;
  isRealtimeConnected?: boolean;
}

export const ExploreHeader: React.FC<ExploreHeaderProps> = ({
  searchQuery,
  onSearchChange,
  favoritesCount,
  onlyFavorites,
  onToggleOnlyFavorites,
  theme,
  onToggleTheme,
  totalShops,
  openCount,
  isRealtimeConnected = true,
}) => {
  const { t } = useLanguage();
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-40 bg-app-surface border-b border-app-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <Link
            to="/explore"
            className="flex items-center gap-2.5 shrink-0 group focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Compass size={20} className="stroke-[2.2]" />
            </div>
            <div className="hidden min-[480px]:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base text-app-primary tracking-tight">
                  Каталог заведений
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  TMA
                </span>
                {/* Live Realtime Indicator */}
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  title={isRealtimeConnected ? "Realtime синхронизация активна" : "Подключение к Realtime..."}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRealtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  <span className="text-[10px] hidden min-[680px]:inline">
                    {isRealtimeConnected ? "Live" : "Sync"}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-app-muted font-mono leading-none mt-0.5">
                {totalShops} заведений • {openCount} открыто
              </p>
            </div>
          </Link>

          {/* Center Search Bar */}
          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative flex items-center">
              <Search
                size={16}
                className="absolute left-3.5 text-app-muted pointer-events-none transition-colors group-focus-within:text-app-primary"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Поиск по названию, блюдам, категории или адресу..."
                className="w-full h-10 pl-10 pr-9 rounded-xl bg-app-card border border-app-border focus:border-app-border-focus focus:bg-app-surface text-xs sm:text-sm text-app-primary placeholder:text-app-muted transition-all outline-hidden shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 p-1 rounded-md text-app-muted hover:text-app-primary hover:bg-app-hover transition-colors"
                  title="Очистить поиск"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Favorites filter toggle */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onToggleOnlyFavorites}
              className={`h-9 px-2.5 sm:px-3 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
                onlyFavorites
                  ? "bg-rose-500 text-white border-rose-500 shadow-rose-500/20"
                  : "bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
              }`}
              title="Избранные заведения"
            >
              <Heart
                size={15}
                className={onlyFavorites ? "fill-current" : "text-rose-500"}
              />
              <span className="hidden sm:inline">Избранное</span>
              {favoritesCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    onlyFavorites
                      ? "bg-white/20 text-white"
                      : "bg-rose-500/10 text-rose-500"
                  }`}
                >
                  {favoritesCount}
                </span>
              )}
            </motion.button>

            {/* Theme switcher */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-hover bg-app-card border border-app-border transition-all cursor-pointer shadow-2xs"
              title={isDark ? "Светлая тема" : "Тёмная тема"}
            >
              {isDark ? (
                <Sun size={16} className="text-amber-400" />
              ) : (
                <Moon size={16} className="text-app-secondary" />
              )}
            </motion.button>

            {/* Link to Admin / Studio */}
            <Link
              to="/admin"
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold bg-app-card hover:bg-app-hover text-app-primary border border-app-border transition-all shadow-2xs"
              title="Панель владельца"
            >
              <LayoutDashboard size={14} className="text-app-muted" />
              <span>Кабинет</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
