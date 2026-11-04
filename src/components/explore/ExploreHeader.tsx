import React from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  Sun,
  Moon,
  Compass,
  Heart,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { DesignModeSwitch } from "../common/DesignModeSwitch";

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
  const { designMode } = useTheme();
  const isDark = theme === "dark";
  const isAtelier = designMode === "atelier";

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        isAtelier
          ? "bg-app-surface/95 backdrop-blur-md border-b-2 border-double border-app-border"
          : "bg-app-surface border-b border-app-border"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`${isAtelier ? "h-16 sm:h-20" : "h-14 sm:h-16"} flex items-center justify-between gap-4 sm:gap-8`}>
          {/* Zone 1: Brand Wordmark + Emerald Live Indicator */}
          <Link
            to="/explore"
            className="flex items-center gap-3 shrink-0 group focus:outline-hidden"
          >
            {isAtelier ? (
              <div className="w-9 h-9 rounded-full bg-app-accent flex items-center justify-center text-app-accent-fg border border-app-border transition-transform group-hover:scale-105 shadow-xs">
                <Sparkles size={16} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-app-accent flex items-center justify-center text-app-accent-fg transition-transform group-hover:scale-105">
                <Compass size={17} className="stroke-[2.2]" />
              </div>
            )}

            <div className="flex items-center gap-2.5">
              {isAtelier ? (
                <div className="flex flex-col">
                  <span className="font-editorial font-bold text-lg sm:text-xl text-app-primary tracking-tight leading-none whitespace-nowrap">
                    TMA Atelier
                  </span>
                  <span className="text-[10px] font-editorial italic text-app-muted tracking-wider">
                    Curated Gastronomy &amp; Retail
                  </span>
                </div>
              ) : (
                <span className="font-bold text-sm sm:text-base text-app-primary tracking-tight whitespace-nowrap">
                  Каталог заведений
                </span>
              )}

              {/* Live Realtime Indicator (Emerald Green across all designs) */}
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all ${
                  isRealtimeConnected
                    ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                    : "bg-app-card text-app-muted border border-app-border"
                }`}
                title={
                  isRealtimeConnected
                    ? "Realtime синхронизация активна"
                    : "Подключение к Realtime..."
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isRealtimeConnected
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500 animate-pulse"
                  }`}
                />
                <span className="text-[10px] font-bold tracking-tight">
                  {isRealtimeConnected ? "Live" : "Sync"}
                </span>
              </span>

              <span className="hidden xl:inline-flex items-center gap-1.5 text-xs font-mono text-app-muted tabular-nums pl-2 border-l border-app-border">
                <span>{totalShops}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {openCount} открыто
                </span>
              </span>
            </div>
          </Link>

          {/* Zone 2: Search Bar */}
          <div className="flex-1 max-w-lg mx-auto">
            <div className="relative flex items-center">
              <Search
                size={15}
                className="absolute left-3.5 text-app-muted pointer-events-none transition-colors"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={
                  isAtelier
                    ? "Искать резиденцию, авторское блюдо или локацию..."
                    : "Поиск по названию, блюдам, категории или адресу..."
                }
                className={`w-full h-9 pl-9 pr-8 bg-app-bg border border-app-border focus:border-emerald-500/60 focus:bg-app-surface text-xs text-app-primary placeholder:text-app-muted transition-all outline-hidden ${
                  isAtelier ? "rounded-full font-sans" : "rounded-lg"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 p-1 rounded-full text-app-muted hover:text-app-primary hover:bg-app-hover transition-colors cursor-pointer"
                  title="Очистить поиск"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Zone 3: Right Controls & 3-Way Design Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <DesignModeSwitch compact />

            {/* Favorites filter toggle */}
            <button
              type="button"
              onClick={onToggleOnlyFavorites}
              className={`h-8 px-2.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                onlyFavorites
                  ? "bg-rose-500 text-white border-rose-500"
                  : "bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
              }`}
              title="Избранные заведения"
            >
              <Heart
                size={14}
                className={onlyFavorites ? "fill-current" : "text-rose-500"}
              />
              <span className="hidden md:inline">Избранное</span>
              {favoritesCount > 0 && (
                <span className="text-[11px] font-mono tabular-nums font-semibold">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Theme switcher */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-hover bg-app-surface border border-app-border transition-all cursor-pointer shrink-0"
              title={isDark ? "Светлая тема" : "Тёмная тема"}
            >
              {isDark ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-app-secondary" />
              )}
            </button>

            {/* Primary CTA: Link to Admin / Studio */}
            <Link
              to="/admin"
              className={`hidden sm:inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-app-accent text-app-accent-fg hover:opacity-90 transition-all whitespace-nowrap shrink-0 ${
                isAtelier ? "font-editorial tracking-wide text-sm" : ""
              }`}
              title="Панель управления"
            >
              <LayoutDashboard size={13} />
              <span>{isAtelier ? "Ателье" : "Кабинет"}</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
